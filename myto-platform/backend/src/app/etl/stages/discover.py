"""
Discover stage: scrape NERC MYTO category list (paginate until 404/410 or 0 entries).
Streaming: bulk insert per page, optional on_page_done callback for resolve+download.
No fixed delay; backoff only on 429/503.
"""
import asyncio
import json
import re
import time
from typing import Any, Callable, Optional
from uuid import UUID
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, insert, bindparam
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import get_settings
from app.models.bronze import PdfRegistry

MONTH_NAMES = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]

# Fallback: MonthName DD, YYYY
_PUBLISH_DATE_RE = re.compile(r"([A-Za-z]+)\s+\d{1,2},?\s+\d{4}")


def _parse_title(title: str) -> tuple[Optional[str], Optional[str], Optional[int]]:
    """Return (disco_code, month_name, year). disco_code = first token. Do not crash on parse failure."""
    if not title or not title.strip():
        return None, None, None
    parts = title.upper().strip().split()
    if not parts:
        return None, None, None
    disco_code = parts[0]
    month_name = next((p for p in parts if p in MONTH_NAMES), None)
    year_match = re.search(r"\b(20\d{2})\b", title)
    year = int(year_match.group(1)) if year_match else None
    return disco_code, month_name, year


def _container_key(node: Any) -> Optional[str]:
    """Stable key for de-dup: prefer id, else first link href in subtree, else tag+position."""
    aid = node.attributes.get("id") if hasattr(node, "attributes") else None
    if aid:
        return f"id:{aid}"
    first_a = node.css_first("a[href]")
    if first_a and first_a.attributes:
        href = first_a.attributes.get("href") or ""
        if href:
            return f"href:{href.strip()}"
    return None


def parse_myto_list_page(html: str, base_url: str) -> list[dict]:
    """
    Parse MYTO list page using selectolax. Defensive selectors: find anchors containing
    Download/View, climb to nearest container with title or MYTO, extract title (h1/h2/h3/h4/
    .entry-title/.elementor-heading-title/.wp-block-heading/strong, fallback first line with MYTO),
    publish_date (time/.date/.entry-date/.post-date, fallback regex). De-dup by container.
    Returns List[CardItem] with title, publish_date_text, view_url, download_url, disco_code, month_name, year.
    """
    # Lexbor backend required for selectolax>=1.0 (Modest raises ImportError).
    from selectolax.lexbor import LexborHTMLParser

    parser = LexborHTMLParser(html)
    base = base_url.rstrip("/").rsplit("/", 1)[0] + "/"
    if not base.endswith("/"):
        base += "/"

    def norm(href: str) -> str:
        if not href or not href.strip():
            return ""
        h = href.strip()
        if not h.startswith("http"):
            h = base + h.lstrip("/")
        return h

    # Collect (anchor, container) for anchors that contain Download or View
    candidates: list[tuple[Any, Any]] = []
    for a in parser.css("a"):
        href = a.attributes.get("href") or ""
        if not href or ".pdf" not in href.lower():
            continue
        link_text = (a.text(strip=True) or "").lower()
        if "download" not in link_text and "view" not in link_text:
            continue
        # Climb to container: first parent that contains title-like text or "MYTO"
        container = a.parent
        for _ in range(12):
            if container is None:
                break
            title_el = container.css_first(
                "h1, h2, h3, h4, .entry-title, .elementor-heading-title, .wp-block-heading, strong"
            )
            if title_el and title_el.text(strip=True):
                candidates.append((a, container))
                break
            raw = (container.text(separator=" ", strip=True) or "")[:500]
            if "MYTO" in raw.upper():
                candidates.append((a, container))
                break
            container = container.parent

    # De-dup by container: one card per container, merge download_url and view_url
    cards_by_key: dict[str, dict] = {}
    for a, container in candidates:
        key = _container_key(container)
        if not key:
            key = f"node:{id(container)}"
        if key not in cards_by_key:
            title = None
            for sel in ("h1", "h2", "h3", "h4", ".entry-title", ".elementor-heading-title", ".wp-block-heading", "strong"):
                el = container.css_first(sel)
                if el and el.text(strip=True):
                    t = el.text(strip=True)
                    if "MYTO" in t.upper():
                        title = t
                        break
            if not title:
                for line in (container.text(separator="\n", strip=True) or "").split("\n"):
                    if line.strip() and "MYTO" in line.upper():
                        title = line.strip()
                        break
            if not title:
                title = "Unknown"
            publish_date_text = None
            for sel in ("time", ".date", ".entry-date", ".post-date"):
                el = container.css_first(sel)
                if el and el.text(strip=True):
                    publish_date_text = el.text(strip=True)
                    break
            if not publish_date_text:
                m = _PUBLISH_DATE_RE.search(container.text(separator=" ", strip=True) or "")
                if m:
                    publish_date_text = m.group(0)
            disco_code, month_name, year = _parse_title(title)
            cards_by_key[key] = {
                "title": title,
                "publish_date_text": publish_date_text,
                "disco_code": disco_code,
                "month_name": month_name,
                "year": year,
                "view_url": None,
                "download_url": None,
            }
        card = cards_by_key[key]
        href = norm((a.attributes.get("href") or "").strip())
        if not href:
            continue
        link_text = (a.text(strip=True) or "").lower()
        if "download" in link_text:
            card["download_url"] = card["download_url"] or href
        else:
            card["view_url"] = card["view_url"] or href

    items = []
    for c in cards_by_key.values():
        download_url = c.get("download_url")
        view_url = c.get("view_url")
        pdf_url = download_url or view_url
        if not pdf_url:
            continue
        items.append({
            "title": c.get("title") or "Unknown",
            "publish_date_text": c.get("publish_date_text"),
            "disco_code": c.get("disco_code"),
            "month_name": c.get("month_name"),
            "year": c.get("year"),
            "view_url": view_url,
            "download_url": download_url,
        })
    # Fallback: any a[href*='.pdf'] if no cards from Download/View
    if not items:
        seen = set()
        for a in parser.css("a[href*='.pdf']"):
            href = norm((a.attributes.get("href") or "").strip())
            if not href or href in seen:
                continue
            seen.add(href)
            title = a.text(strip=True) or "Unknown"
            disco_code, month_name, year = _parse_title(title)
            items.append({
                "title": title,
                "publish_date_text": None,
                "disco_code": disco_code,
                "month_name": month_name,
                "year": year,
                "view_url": href,
                "download_url": None,
            })
    return items


def _extract_cards(html: str, base_url: str) -> list[dict]:
    """Thin wrapper: parse_myto_list_page is the canonical parser."""
    return parse_myto_list_page(html, base_url)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def _fetch_page(client: httpx.AsyncClient, url: str) -> tuple[int, str]:
    r = await client.get(url, follow_redirects=True, timeout=30.0)
    return r.status_code, r.text


async def discover_myto_pdfs(
    session: AsyncSession,
    run_id: UUID,
    on_page_done: Optional[Callable] = None,
) -> int:
    """
    Paginate MYTO list; stop when 404/410 or 0 entries.
    Bulk insert per page. No fixed delay; sleep only on 429/503.
    If on_page_done(session, run_id, entries) is provided, call it after each page insert (for resolve+download).
    Returns total count of PDFs discovered.
    """
    settings = get_settings()
    base = settings.myto_list_base_url.rstrip("/")
    total_inserted = 0
    page = 1

    async with httpx.AsyncClient(
        headers={"User-Agent": "MYTO-Platform/1.0 (ETL pipeline)"},
        follow_redirects=True,
    ) as client:
        while True:
            url = base if page == 1 else f"{base}/page/{page}/"
            t0 = time.perf_counter()
            try:
                status, html = await _fetch_page(client, url)
            except Exception as e:
                await session.execute(
                    text(
                        "INSERT INTO bronze.etl_event (run_id, stage_name, level, message, context) "
                        "VALUES (:run_id, 'discover', 'error', :msg, CAST(:ctx AS jsonb))"
                    ),
                    {"run_id": run_id, "msg": str(e), "ctx": json.dumps({"url": url})},
                )
                await session.flush()
                break
            if status in (404, 410):
                break
            if status in (429, 503):
                await asyncio.sleep(5.0)
                continue
            entries = _extract_cards(html, base)
            if not entries:
                break
            rows = []
            for e in entries:
                view_url = e.get("view_url")
                download_url = e.get("download_url")
                pdf_url = download_url or view_url
                if not pdf_url:
                    continue
                rows.append({
                    "run_id": run_id,
                    "pdf_url": pdf_url,
                    "title": e.get("title"),
                    "disco_code": e.get("disco_code"),
                    "month_name": e.get("month_name"),
                    "year": e.get("year"),
                    "publish_date_text": e.get("publish_date_text"),
                    "source_list_page_url": url,
                    "view_url": view_url,
                    "download_url": download_url,
                    "status": "discovered",
                    "pdf_url_original": pdf_url,
                    "page_discovered": page,
                })
            if rows:
                stmt = pg_insert(PdfRegistry).values(
                    run_id=bindparam("run_id"),
                    pdf_url=bindparam("pdf_url"),
                    title=bindparam("title"),
                    disco_code=bindparam("disco_code"),
                    month_name=bindparam("month_name"),
                    year=bindparam("year"),
                    publish_date_text=bindparam("publish_date_text"),
                    source_list_page_url=bindparam("source_list_page_url"),
                    view_url=bindparam("view_url"),
                    download_url=bindparam("download_url"),
                    status="discovered",
                    pdf_url_original=bindparam("pdf_url_original"),
                    page_discovered=bindparam("page_discovered"),
                ).on_conflict_do_nothing(index_elements=["run_id", "pdf_url"])
                await session.execute(stmt, rows)
                await session.flush()
                count_page = len(rows)
                total_inserted += count_page
                duration_ms = int((time.perf_counter() - t0) * 1000)
                await session.execute(
                    text(
                        "INSERT INTO bronze.etl_event (run_id, stage_name, level, message, context) "
                        "VALUES (:run_id, 'discover', 'info', :msg, CAST(:ctx AS jsonb))"
                    ),
                    {
                        "run_id": run_id,
                        "msg": "page_done",
                        "ctx": json.dumps({"page_url": url, "cards_found": len(entries), "cards_inserted": count_page, "duration_ms": duration_ms}),
                    },
                )
                await session.flush()
                if on_page_done:
                    await on_page_done(session, run_id, rows)
            page += 1
    return total_inserted
