"""
OCR fallback for image-based PDF pages. Primary: PaddleOCR; fallback: Tesseract.
Cache by (pdf_sha256, page_no). Render page via PyMuPDF get_pixmap(dpi=300).
"""
from __future__ import annotations
import io
import time
from typing import Any, Callable

import fitz  # pymupdf

# Lazy imports for optional deps
_paddle_ocr = None
_tesseract = None


def _get_paddle():
    global _paddle_ocr
    if _paddle_ocr is None:
        try:
            from paddleocr import PaddleOCR
            _paddle_ocr = PaddleOCR(use_angle_cls=True, show_log=False, use_gpu=False)
        except ImportError:
            pass
    return _paddle_ocr


def _get_tesseract():
    global _tesseract
    if _tesseract is None:
        try:
            import pytesseract
            _tesseract = pytesseract
        except ImportError:
            pass
    return _tesseract


def page_to_image(data: bytes, page_no: int, dpi: int = 300) -> bytes | None:
    """Render PDF page to RGB image bytes (PNG). page_no 1-based."""
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        if page_no < 1 or page_no > len(doc):
            return None
        page = doc[page_no - 1]
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        return pix.tobytes("png")
    finally:
        doc.close()


def run_ocr_on_image(image_bytes: bytes) -> tuple[list[dict[str, Any]], str, float]:
    """
    Run OCR on image bytes. Returns (boxes, engine_used, duration_ms).
    boxes: list of {text, confidence, bbox: [x1,y1,x2,y2]}.
    """
    t0 = time.perf_counter()
    engine = "none"
    boxes: list[dict[str, Any]] = []

    ocr = _get_paddle()
    if ocr is not None:
        import numpy as np
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        arr = np.array(img)
        try:
            result = ocr.ocr(arr, cls=True)
            if result and result[0]:
                for line in result[0]:
                    if len(line) >= 2:
                        box_xy = line[0]
                        text = line[1][0] if isinstance(line[1], (list, tuple)) else str(line[1])
                        conf = float(line[1][1]) if isinstance(line[1], (list, tuple)) and len(line[1]) > 1 else 0.9
                        x1 = min(p[0] for p in box_xy)
                        y1 = min(p[1] for p in box_xy)
                        x2 = max(p[0] for p in box_xy)
                        y2 = max(p[1] for p in box_xy)
                        boxes.append({"text": text, "confidence": conf, "bbox": [x1, y1, x2, y2]})
                engine = "paddleocr"
        except Exception:
            pass

    if not boxes and _get_tesseract() is not None:
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(io.BytesIO(image_bytes))
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
            n = len(data["text"])
            for i in range(n):
                text = (data["text"][i] or "").strip()
                if not text:
                    continue
                conf = float(data["conf"][i]) / 100.0 if data["conf"][i] != -1 else 0.5
                x1 = data["left"][i]
                y1 = data["top"][i]
                x2 = x1 + data["width"][i]
                y2 = y1 + data["height"][i]
                boxes.append({"text": text, "confidence": conf, "bbox": [x1, y1, x2, y2]})
            if boxes:
                engine = "tesseract"
        except Exception:
            pass

    duration_ms = (time.perf_counter() - t0) * 1000
    return boxes, engine, duration_ms


def ocr_pdf_page(
    data: bytes,
    page_no: int,
    pdf_sha256: str,
    cache_get: Callable[[str, int], tuple[list, str, str, float, float] | None] | None = None,
    cache_set: Callable[[str, int, str, str, list, float, float], None] | None = None,
) -> tuple[list[dict], str, str, float, bool]:
    """
    OCR one PDF page. cache_get(pdf_sha256, page_no) -> (ocr_boxes_json, ocr_text, ocr_engine, confidence, duration_ms) or None.
    cache_set(pdf_sha256, page_no, ocr_engine, ocr_text, ocr_boxes_json, confidence, duration_ms).
    Returns (boxes, ocr_text, engine, duration_ms, used_cache).
    """
    if cache_get:
        hit = cache_get(pdf_sha256, page_no)
        if hit is not None:
            boxes_json, ocr_text, engine, conf, dur = hit
            return boxes_json, ocr_text or "", engine, dur, True
    img = page_to_image(data, page_no)
    if not img:
        return [], "", "none", 0.0, False
    boxes, engine, duration_ms = run_ocr_on_image(img)
    ocr_text = " ".join(b.get("text", "") for b in boxes)
    avg_conf = sum(b.get("confidence", 0) for b in boxes) / len(boxes) if boxes else 0.0
    if cache_set and engine != "none":
        cache_set(pdf_sha256, page_no, engine, ocr_text, boxes, avg_conf, duration_ms)
    return boxes, ocr_text, engine, duration_ms, False
