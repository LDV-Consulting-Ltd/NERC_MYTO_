# How the MYTO Crawler Works (and Why It’s Slow)

## High-level flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DISCOVER (discover_myto_pdfs)                                               │
│  Scrapes NERC MYTO category list to find PDF links.                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DOWNLOAD (download_pdfs)                                                    │
│  Fetches each PDF and stores bytes in bronze.pdf_artifact.                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Discover stage (list scraping)

**What it does**

- Starts at `myto_list_base_url` (e.g. `https://nerc.gov.ng/resource-category/myto`).
- Fetches page 1, then `page/2/`, `page/3/`, … until:
  - HTTP 404/410, or
  - A page returns 0 MYTO entries.
- For each page:
  - Parses HTML with selectolax for links containing `.pdf` / `download` / `view`.
  - Extracts title → disco_code, month_name, year; builds list of `{ pdf_url, title, … }`.
- After the loop: inserts all entries into `bronze.pdf_registry` (one INSERT per entry).

**Why it’s slow**

| Cause | Where | Effect |
|-------|--------|--------|
| **Strictly sequential pages** | `discover.py` `while True` loop | Page 2 is only requested after page 1 finishes. No parallel page fetches. |
| **Fixed 0.5 s delay after every page** | `await asyncio.sleep(0.5)` after each page | e.g. 20 pages → 10 s of idle wait even if each fetch is fast. |
| **One INSERT per PDF** | Loop `for e in all_entries: session.execute(INSERT...)` | Many round-trips to the DB instead of batched inserts. |

So: **one page at a time + 0.5 s per page + many single-row inserts** → discover alone can take tens of seconds for tens of pages.

---

## 2. Download stage (PDF fetching)

**What it does**

- Reads all `pdf_url` (and metadata) for the run from `bronze.pdf_registry`.
- For each URL:
  - Downloads with HTTP GET (follow redirects, 60 s timeout).
  - Computes SHA-256 of body; creates one `PdfArtifact` row (url, sha256, file_bytes, status, content_type, error).
- Limits concurrency with a semaphore (default 5).
- Waits for all downloads with `asyncio.gather(...)`.

**Why it’s slow**

| Cause | Where | Effect |
|-------|--------|--------|
| **Low concurrency** | `concurrency=5` in `download_pdfs()` | Only 5 PDFs in flight; the rest wait. With 50 PDFs, at least 10 “waves” of 5. |
| **New HTTP client per PDF** | `async with httpx.AsyncClient(...)` inside `do_one()` | No connection reuse; new TCP/SSL per PDF. |
| **Retries** | tenacity 3 attempts, 2–15 s backoff | Failed PDFs add extra delay (good for robustness, bad for raw speed). |

So: **5 parallel downloads and a new client per PDF** → download time grows roughly linearly with (number of PDFs / 5) × average response time.

---

## 3. End-to-end “crawler” summary

- **Discover**: sequential pages + 0.5 s sleep per page + per-row inserts.
- **Download**: 5-way parallelism, new client per PDF, no batching of DB writes.

Together they form the “crawler” (discover + download). The rest of the pipeline (extract, silver, geocode, gold, promote) runs after the crawler and can be slow for other reasons (e.g. geocode rate limit).

---

## 4. Quick reference: where it’s defined

| Stage | File | Main function |
|-------|------|----------------|
| Discover | `backend/src/app/etl/stages/discover.py` | `discover_myto_pdfs(session, run_id)` |
| Download | `backend/src/app/etl/stages/download.py` | `download_pdfs(session, run_id, concurrency=12)` |
| Extract | `backend/src/app/etl/stages/extract.py` | `extract_tables(session, run_id)` |
| SLC signature | `backend/src/app/etl/slc_signature.py` | `get_signature_per_page(data)` |

Config: `myto_list_base_url`, `download_concurrency` (default 12). Discover streams per-page commits. Candidate pages: SLC header signature ≥ 4 (no Appendix); vector extract then Camelot fallback; image-based → OCR.

---

## 6. Debugging: “Zero consumed PDFs” — where is it stuck?

If it’s been several minutes and bronze shows no PDFs, the pipeline may not be running the crawler or is blocked before the first write. Use these in order.

### 1) Confirm the run actually started

- **GET** `http://localhost:8000/v1/runs`

You should see a run with `status="running"` and a recent `started_at`. If not → UI/backend route issue.

### 2) Check stage progression

- **GET** `http://localhost:8000/v1/runs/<run_id>/stages`

Check:

- Is the `discover` stage created?
- `resolve` / `download` (if applicable)?

**Interpretation:**

- **No stages** → orchestrator not running after run creation.
- **Only `discover` exists, still running** → stuck on list pages or HTML parsing.
- **Discover completed but resolve/download not created** → stage chain issue.
- **Download exists but no rows** → download may be filtering out everything (e.g. expecting `status='resolved'` but it was never set).

### 3) Check events

- **GET** `http://localhost:8000/v1/runs/<run_id>/events`

Look for messages like “page_done”, “Discovered X cards”, “Resolved …”, “pdf_done”. If events are empty → code is not writing `bronze.etl_event` or the stage never started.

### 4) Direct DB check (this project’s schema)

Run in Postgres (this codebase uses `pdf_registry`, not `myto_pdf_discovered`):

```sql
SELECT count(*) FROM bronze.pdf_registry;
SELECT count(*) FROM bronze.pdf_artifact;
SELECT count(*) FROM bronze.etl_event;
SELECT * FROM bronze.etl_stage ORDER BY started_at DESC LIMIT 10;
```

- `pdf_registry = 0` → discover didn’t write anything.
- `etl_stage` empty → run isn’t executing orchestrator stages.
- `etl_event` empty → no logging or stage never started.
- `pdf_registry > 0` but `pdf_artifact = 0` → resolve worked but download not running or not finding rows.

### 5) Execute runs in background

`POST /v1/runs/<run_id>/execute?mode=full` now starts the pipeline in the **background** and returns immediately. Poll `GET /v1/runs/<run_id>/stages` and `GET /v1/runs/<run_id>/events` to see progress; nothing is visible until the orchestrator writes and commits (discover writes per page).

### 6) Quick proof: run discover only

- **POST** `http://localhost:8000/v1/runs/<run_id>/discover`

This runs only the discover stage (synchronous). When it returns, run:

```sql
SELECT count(*) FROM bronze.pdf_registry WHERE run_id = '<run_id>';
```

If it stays 0 → discover is broken (selectors, URL, or no commit). If it’s > 0 → discover works; look at resolve/download next.

### 7) If discover runs but writes zero

Likely causes:

- HTML selectors wrong (site theme change).
- Parser only looks for `.pdf` links but the page uses “Download” buttons that need resolving.
- Wrong URL (e.g. missing trailing slash on `.../resource-category/myto`).
- WAF/Cloudflare returning an interstitial (200 but not the real list).

To confirm: log or store in `etl_event` the first ~400 chars of HTML from page 1 and the number of “Download”/card anchors found.
