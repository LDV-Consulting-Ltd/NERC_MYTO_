"""
Enterprise OCR table reconstruction: convert OCR bounding boxes into structured table rows.
Header detection by SLC signature; column boundary inference (header + data clustering); row segmentation.
"""
from __future__ import annotations
import re
from typing import Any

# Header tokens (case-insensitive) for SLC table
SLC_HEADER_PATTERNS = [
    re.compile(r"S\s*/?\s*N", re.I),
    re.compile(r"BAND", re.I),
    re.compile(r"FEEDER\s+NAME", re.I),
    re.compile(r"DESCRIPTION\s+OF\s+FEEDER\s+LOCATION", re.I),
    re.compile(r"NAME\s+OF\s+MAJOR\s+STREETS", re.I),
    re.compile(r"MIN\.?\s+SUPPLY\s+DURATION", re.I),
]

CONFIDENCE_THRESHOLD = 0.45
LOW_CONFIDENCE_FLAG = "low_ocr_confidence"


def _normalize_bbox(box: dict, page_width: float = 1.0, page_height: float = 1.0) -> dict:
    """Normalize bbox to 0..1 if page dimensions given."""
    b = box.get("bbox") or [0, 0, 0, 0]
    if page_width <= 0 or page_height <= 0:
        return {**box, "bbox": b}
    x1, y1, x2, y2 = b
    return {
        **box,
        "bbox": [x1 / page_width, y1 / page_height, x2 / page_width, y2 / page_height],
    }


def _filter_low_confidence(boxes: list[dict], threshold: float = CONFIDENCE_THRESHOLD) -> list[dict]:
    """Filter tokens below threshold; keep potential headers (first few lines)."""
    if not boxes:
        return []
    ys = sorted(set(b.get("bbox", [0, 0, 0, 0])[1] for b in boxes))
    if not ys:
        return [b for b in boxes if (b.get("confidence") or 0) >= threshold]
    header_y_max = ys[min(3, len(ys) - 1)] + 20
    out = []
    for b in boxes:
        conf = b.get("confidence") or 0
        y1 = (b.get("bbox") or [0, 0, 0, 0])[1]
        if conf >= threshold or y1 <= header_y_max:
            out.append(b)
    return out


def _merge_into_lines(boxes: list[dict], y_tolerance: float = 5.0) -> list[list[dict]]:
    """Group tokens by y-overlap (same line), sort within line by x1."""
    if not boxes:
        return []
    with_bbox = [(b, b.get("bbox") or [0, 0, 0, 0]) for b in boxes]
    with_bbox.sort(key=lambda x: (x[1][1], x[1][0]))
    lines: list[list[dict]] = []
    for b, (x1, y1, x2, y2) in with_bbox:
        mid_y = (y1 + y2) / 2
        placed = False
        for line in lines:
            if not line:
                continue
            _, ly1, _, ly2 = line[0].get("bbox") or [0, 0, 0, 0]
            if mid_y >= ly1 - y_tolerance and mid_y <= ly2 + y_tolerance:
                line.append(b)
                placed = True
                break
        if not placed:
            lines.append([b])
    for line in lines:
        line.sort(key=lambda x: (x.get("bbox") or [0, 0, 0, 0])[0])
    return lines


def _score_line_as_header(line: list[dict]) -> int:
    """Count distinct SLC header token matches in line text."""
    text = " ".join(b.get("text", "") for b in line)
    count = 0
    for pat in SLC_HEADER_PATTERNS:
        if pat.search(text):
            count += 1
    return count


def _find_header_line(lines: list[list[dict]]) -> int:
    """Return index of best header line (highest signature score)."""
    best = -1
    best_score = 0
    for i, line in enumerate(lines[:15]):
        s = _score_line_as_header(line)
        if s > best_score:
            best_score = s
            best = i
    return best if best_score >= 2 else 0


def _column_centers_from_header(header_line: list[dict]) -> list[float]:
    """Header-driven column centers: midpoints of header token bboxes."""
    centers = []
    for b in header_line:
        bbox = b.get("bbox") or [0, 0, 0, 0]
        centers.append((bbox[0] + bbox[2]) / 2)
    return sorted(centers) if centers else []


def _assign_tokens_to_columns(tokens: list[dict], column_centers: list[float], x_tol: float = 30.0) -> list[tuple[int, dict]]:
    """Assign each token to nearest column center. Returns (col_index, token)."""
    if not column_centers:
        return [(0, t) for t in tokens]
    out = []
    for t in tokens:
        bbox = t.get("bbox") or [0, 0, 0, 0]
        cx = (bbox[0] + bbox[2]) / 2
        best_i = 0
        best_d = abs(cx - column_centers[0])
        for i, c in enumerate(column_centers):
            d = abs(cx - c)
            if d < best_d and d <= x_tol:
                best_d = d
                best_i = i
        out.append((min(best_i, len(column_centers) - 1), t))
    return out


def _segment_into_rows(lines: list[list[dict]], header_idx: int) -> list[list[list[dict]]]:
    """Data lines (below header) as rows. Each row is a list of lines that belong together (multi-line cells)."""
    return [[ln] for ln in lines[header_idx + 1 :]]


def _row_to_cells(row_lines: list[list[dict]], column_centers: list[float]) -> list[str]:
    """Merge tokens in row by column; return list of cell strings (one per column)."""
    all_tokens = []
    for line in row_lines:
        for t in line:
            all_tokens.append(t)
    assigned = _assign_tokens_to_columns(all_tokens, column_centers)
    col_text: dict[int, list[str]] = {}
    for ci, t in assigned:
        if ci not in col_text:
            col_text[ci] = []
        col_text[ci].append(t.get("text", "").strip())
    n_cols = len(column_centers) or 1
    return [" ".join(col_text.get(i, [])).strip() for i in range(n_cols)]


def _normalize_cell_sn(val: str) -> int | None:
    """Extract integer from S/N cell."""
    if not val:
        return None
    m = re.search(r"\d+", val)
    return int(m.group()) if m else None


def _normalize_band(val: str) -> str:
    """Normalize band to A/B/C/D/E."""
    if not val:
        return ""
    u = val.upper().strip()
    for c in "ABCDE":
        if c in u or u == c:
            return c
    return u[:1] if u else ""


def _normalize_min_supply_hours(val: str) -> float | None:
    """Parse min_supply_hours to numeric."""
    if not val:
        return None
    m = re.search(r"[\d.]+", val.replace(",", "."))
    if m:
        try:
            return float(m.group())
        except ValueError:
            pass
    return None


def reconstruct_table_from_boxes(
    ocr_boxes: list[dict],
    page_width: float = 1.0,
    page_height: float = 1.0,
) -> tuple[list[dict], dict]:
    """
    Convert OCR boxes to structured rows with canonical columns.
    Returns (rows, metrics) where rows have sn, band, feeder_name, feeder_location, major_users, min_supply_hours
    and metrics has table_confidence, dq_flag, header_row_index.
    """
    if not ocr_boxes:
        return [], {"table_confidence": 0.0, "dq_flag": LOW_CONFIDENCE_FLAG, "header_row_index": -1}

    boxes = [_normalize_bbox(b, page_width, page_height) for b in ocr_boxes]
    boxes = _filter_low_confidence(boxes)
    if not boxes:
        return [], {"table_confidence": 0.0, "dq_flag": LOW_CONFIDENCE_FLAG, "header_row_index": -1}

    lines = _merge_into_lines(boxes)
    if not lines:
        return [], {"table_confidence": 0.0, "dq_flag": None, "header_row_index": -1}

    header_idx = _find_header_line(lines)
    column_centers = _column_centers_from_header(lines[header_idx])
    if not column_centers:
        column_centers = [0.5]

    rows_data = _segment_into_rows(lines, header_idx)
    out_rows = []
    for row_lines in rows_data:
        cells = _row_to_cells(row_lines, column_centers)
        if not any(cells):
            continue
        sn = _normalize_cell_sn(cells[0]) if len(cells) > 0 else None
        band = _normalize_band(cells[1]) if len(cells) > 1 else ""
        feeder_name = cells[2] if len(cells) > 2 else ""
        feeder_location = cells[3] if len(cells) > 3 else ""
        major_users = cells[4] if len(cells) > 4 else ""
        min_hrs = _normalize_min_supply_hours(cells[5]) if len(cells) > 5 else None
        out_rows.append({
            "sn": sn,
            "band": band,
            "feeder_name": feeder_name,
            "feeder_location": feeder_location,
            "major_users": major_users,
            "min_supply_hours": min_hrs,
            "sn_raw": cells[0] if len(cells) > 0 else "",
            "band_raw": cells[1] if len(cells) > 1 else "",
        })

    confs = [b.get("confidence", 0) for b in boxes]
    table_confidence = sum(confs) / len(confs) if confs else 0.0
    dq_flag = LOW_CONFIDENCE_FLAG if table_confidence < CONFIDENCE_THRESHOLD else None

    return out_rows, {
        "table_confidence": table_confidence,
        "dq_flag": dq_flag,
        "header_row_index": header_idx,
    }
