# MYTO Platform — Automatic ELT Pipeline

MYTO Platform is an **automatic end-to-end ELT product** for NERC MYTO (Multi-Year Tariff Order) data: discovery → download → extract → transform → geocode → warehouse → latest snapshot. The UI provides **observability and governance**, not manual crawl/ingest/geocode/merge operations.

## Principles

1. **ELT pipeline**: After a run starts, all stages execute sequentially automatically unless a fatal error occurs.
2. **No manual activation**: Crawl, ingest, geocode, merge/split are internal; the UI does not require manual triggers for normal operation.
3. **Medallion architecture**: Bronze (raw/staging), Silver (transform/enrich), Gold (warehouse). UI centers on these layers.
4. **Admin**: DQ/Governance/Metrics/Metadata/Overrides only — not normal operations.
5. **Geocoding**: Automatic — normalize → fuzzy match → cache-first → online fallback with rate limits.

## Local development

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (for Postgres + PostGIS)
- (Optional) Supabase or local Postgres with PostGIS

### Backend

```bash
cd myto-platform/backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Unix
pip install -e .
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd myto-platform/frontend
npm install
npm run dev
```

### Database (Docker)

```bash
cd myto-platform
cp .env.example .env
# Edit .env with DATABASE_URL, etc.
docker-compose up -d
```

Then run migrations: `cd backend && alembic upgrade head`.

### Run everything in Docker (frontend, backend, Postgres)

All three services use the same compose network so the frontend container can reach the backend at `http://backend:8000`. The frontend is built with `NEXT_PUBLIC_API_BASE_URL=/api` so the browser sends API requests to the same origin (`/api/v1/*`); Next.js rewrites those to the backend using `BACKEND_INTERNAL_URL=http://backend:8000`.

```bash
cd myto-platform
docker-compose up --build
```

- **Frontend**: http://localhost:3000 — open Pipeline Operations; health should show **Backend Online** and **Test connection** / **Run Full Pipeline** should work.
- **Backend**: http://localhost:8000 (e.g. http://localhost:8000/v1/health).
- **DB**: port 5432 (user `myto`, password `myto`, database `myto`).

**Verify connectivity from inside the frontend container:**

```bash
docker-compose exec frontend wget -qO- http://backend:8000/v1/health
# or (if curl is available): curl -s http://backend:8000/v1/health
```

Pipeline Operations shows **resolvedV1** and **healthUrl** in the debug block so the actual URLs used are never ambiguous.

## Scheduler setup

- **Preferred**: Supabase `pg_cron` — schedule a job to call `POST /v1/scheduler/trigger` with header `X-CRON-SECRET: <CRON_SECRET>` daily at 5:00 AM.
- **Optional**: Vercel Cron (or similar) — same endpoint, same header.
- **Duplicate protection**: The API refuses a new run if any run has `status=running` or if the last successful run finished within the cooldown window (see `SCHEDULER_COOLDOWN_MINUTES` in `.env`).

## Pipeline overview

1. **Discover**: Scrape NERC MYTO category pages (paginate until 404/410 or 0 entries). Parse disco_code, month, year, pdf_url from each card.
2. **Download**: Fetch PDFs (async, with retries). Store in `bronze.pdf_artifact`.
3. **Extract**: PyMuPDF (primary) / Camelot (fallback) for "Appendix … Service Level Commitments" tables. Persist to `bronze.pdf_table_raw`.
4. **Silver transform**: Typed SLC rows → `silver.service_level_commitments`; DQ → `silver.service_level_commitments_dq`.
5. **Silver geocode**: Normalize location strings → fuzzy match → cache → online fallback (rate-limited). Populate `silver.service_level_commitments_geo`.
6. **Gold build**: Star schema (dim_disco, dim_date, dim_feeder, dim_location, fact_supply_commitment).
7. **Promote latest**: Atomic truncate+insert into `silver.service_level_commitments_geo_latest` and `gold.fact_supply_commitment_latest`.

## API (v1 only)

All endpoints are under `/v1`. Responses use an **envelope**: `{ "data": ..., "meta": { "snapshot_run_id", "refreshed_at", "count", "next_cursor", "limit", "offset" } }`. Query endpoints default to `*_latest` snapshot where applicable.

### Health
- `GET /v1/health` — liveness

### Runs (ELT control plane)
- `POST /v1/runs` — create run (starts pipeline in background)
- `GET /v1/runs` — list runs (limit, offset)
- `GET /v1/runs/{run_id}` — run detail + stages
- `GET /v1/runs/{run_id}/stages` — stage details
- `GET /v1/runs/{run_id}/events` — logs/events (limit, offset)
- `POST /v1/runs/{run_id}/execute?mode=full|discover|download|extract|silver|gold|promote` — run specific stage(s)

### Scheduler
- `POST /v1/scheduler/trigger` — CRON_SECRET protected; starts full run
- `GET /v1/scheduler/status` — enabled, next_run_estimate, last_triggered

### Layers (browse medallion)
- `GET /v1/layers/bronze/pdfs` — pdf registry (optional run_id)
- `GET /v1/layers/bronze/artifacts` — downloads + sha
- `GET /v1/layers/bronze/tables` — raw tables (filter: disco_code, month_name, pdf_url, run_id)
- `GET /v1/layers/silver/commitments` — typed rows
- `GET /v1/layers/silver/dq` — dq rows (run_id, dq_status)
- `GET /v1/layers/silver/geocode` — coverage + confidence
- `GET /v1/layers/gold/dims` — dim counts + preview
- `GET /v1/layers/gold/facts` — facts (disco_code, date_key, limit, offset)

### Latest (product data)
- `GET /v1/latest/discos` — list discos in latest
- `GET /v1/latest/months?disco_code=` — months (optional disco)
- `GET /v1/latest/commitments?disco_code=&year=&month=&band=&q=&limit=&offset=` — commitments
- `GET /v1/latest/map-points?disco_code=&year=&month=&band=` — GeoJSON FeatureCollection
- `GET /v1/latest/feeders?disco_code=&q=&limit=&offset=`
- `GET /v1/latest/feeder/{feeder_key}` — drill-through
- `GET /v1/latest/search?q=&limit=&offset=` — unified search (feeder_name, location, major_users)

### Metadata
- `GET /v1/metadata/datasets` — list datasets
- `GET /v1/metadata/datasets/{name}/schema` — columns/types
- `GET /v1/metadata/columns/dictionary` — business definitions
- `GET /v1/metadata/coverage` — geocode %, parse %, completeness
- `GET /v1/metadata/freshness` — latest snapshot age

### DQ
- `GET /v1/dq/summary?run_id=` — latest or by run_id
- `GET /v1/dq/issues?run_id=&status=&limit=&offset=`
- `GET /v1/dq/rules` — rule list + definitions

### Metrics
- `GET /v1/metrics/pipeline/performance?runs=`
- `GET /v1/metrics/pipeline/timeseries?days=`
- `GET /v1/metrics/extraction/methods` — pymupdf vs camelot
- `GET /v1/metrics/geocode` — cache hit rate, coverage

### Governance
- `GET /v1/governance/lineage`
- `GET /v1/governance/audit`
- `GET /v1/governance/policies`

### Exports (filters: disco, year, month, band)
- `GET /v1/exports/latest/commitments.csv`
- `GET /v1/exports/latest/commitments.parquet` (501)
- `GET /v1/exports/latest/map.geojson`

### Agent
- `POST /v1/agent/query` — body: `{ "question", "scope": "latest|run_id", "run_id", "disco" }`; returns answer, referenced datasets/columns, SQL, API URL suggestions

### Admin (audited)
- `POST /v1/admin/overrides/geocode` — manual lat/lon
- `POST /v1/admin/overrides/merge-feeder`, `split-feeder` (stubs)
- `POST /v1/admin/promote/{run_id}` — re-promote run to latest
- `POST /v1/admin/rebuild-gold/{run_id}` — rebuild gold + promote

### Tenants (monetization scaffold)
- `POST /v1/tenants`, `GET /v1/tenants`, `GET /v1/tenants/{tenant_id}`
- `POST /v1/tenants/{tenant_id}/keys`, `GET /v1/tenants/{tenant_id}/keys`, `DELETE /v1/tenants/{tenant_id}/keys/{key_id}`

### Sample curl

```bash
# Health
curl -s http://localhost:8000/v1/health

# List runs (envelope: data + meta)
curl -s "http://localhost:8000/v1/runs?limit=5"

# Create run
curl -s -X POST http://localhost:8000/v1/runs -H "Content-Type: application/json" -d '{"notes":"manual"}'

# Latest commitments (with snapshot meta)
curl -s "http://localhost:8000/v1/latest/commitments?limit=10"

# Map points GeoJSON
curl -s "http://localhost:8000/v1/latest/map-points"

# DQ summary
curl -s http://localhost:8000/v1/dq/summary

# Scheduler trigger (set CRON_SECRET in .env)
curl -s -X POST http://localhost:8000/v1/scheduler/trigger -H "X-CRON-SECRET: your-secret"

# Export CSV with filter
curl -s "http://localhost:8000/v1/exports/latest/commitments.csv?disco=YEDC" -o commitments.csv
```

## Troubleshooting crawler behavior

- **Pagination**: Stops when response is 404/410 or the page has 0 MYTO entries (no "View/Download" links). Current NERC pagination goes up to ~32.
- **Disco codes**: Taken as the **first token** of the card title (e.g. "YEDC MYTO NOVEMBER 2025" → disco_code = "YEDC"). Do not guess; use exact token.
- **PDF links**: Direct links from list page to `/wp-content/uploads/.../*.pdf`. No browser automation.
- **Table extraction**: Pages containing "Service Level Commitments" or "Appendix" are prioritized; PyMuPDF `find_tables()` first, Camelot as fallback for stubborn pages.
- **Rate limiting**: Use tenacity + backoff for HTTP; respect geocoder rate limits (see geocoding providers).

## Project layout

```
myto-platform/
  backend/     # FastAPI, ETL, Postgres
  frontend/    # Next.js product UI
  infra/       # nginx, terraform (optional)
```

See repo root for full directory structure.

## MISSING / AMBIGUOUS

See [MISSING_AMBIGUOUS.md](MISSING_AMBIGUOUS.md) for items not implemented or that depend on external data (e.g. gazetteer); do not invent silently.
