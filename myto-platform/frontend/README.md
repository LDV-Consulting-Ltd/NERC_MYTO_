# MYTO Platform Frontend

Next.js (App Router) frontend for the MYTO electricity/energy data product. Connects to backend `/v1` APIs with energy-grade UX: map-first exploration, reliability KPIs, evidence links, run transparency, and strong filters.

## Tech stack

- **Next.js 14** (App Router), **TypeScript**
- **Tailwind CSS** + LDV theme (CSS variables: primary navy, accent gold)
- **TanStack Query** (caching, retries, stale time)
- **TanStack Table** (paginated tables)
- **MapLibre GL** (GeoJSON map)
- **Zod** (response validation)
- Env: `NEXT_PUBLIC_API_BASE_URL` (or `NEXT_PUBLIC_API_URL`), optional `NEXT_PUBLIC_ADMIN_MODE=true`

## Frontend pages and what endpoints they use

| Page | Route | Endpoints |
|------|--------|-----------|
| **Overview** | `/` | Snapshot meta, Runs list |
| **Run Pipeline** | `/pipeline` | POST /v1/runs, POST /v1/runs/{id}/execute?mode=full, GET /v1/scheduler/status |
| **Runs** | `/runs` | GET /v1/runs (filters: status/date) |
| **Run detail** | `/runs/[run_id]` | Run detail, stages (DAG), events (logs) |
| **Bronze** | `/layers/bronze` | PDFs, artifacts, raw tables preview |
| **Silver** | `/layers/silver` | Commitments, DQ, geocode coverage widgets |
| **Gold** | `/layers/gold` | Dims, facts, latest snapshot refreshed at |
| **Explorer** | `/explorer` | Latest commitments (evidence links), feeder drill-through, Export CSV/Parquet |
| **Map** | `/map` | Latest map-points (GeoJSON), drill-through |
| **Metadata** | `/metadata` | Datasets, schema, column dictionary, freshness, coverage |
| **Data Quality** | `/dq` | DQ summary, issues, rules, trend (TODO) |
| **Governance** | `/governance` | Audit log, lineage, policies |
| **Metrics** | `/metrics` | Pipeline performance, extraction methods, geocode |
| **Architecture** | `/architecture` | Mermaid data + lineage diagrams, physical tables |
| **Agent** | `/agent` | POST /v1/agent/query |
| **API Docs** | `/api-docs` | Endpoint list, Try-it, copy URL |
| **Admin** | `/admin` | Overrides & maintenance |
| **Coverage** | `/coverage` | Endpoint Coverage Matrix (dev-only) |

## Endpoint Coverage Matrix

- **`src/lib/endpointCoverage.ts`**: Single array of all backend endpoints with `{ tag, method, path, uiPage, status: "wired"|"stub"|"missing"|"missing backend" }`.
- **`/coverage`** (dev): Renders the matrix as a table; goal 90%+ wired.

## Global UX

- **App shell**: Sidebar (LDV logo → Overview, Run Pipeline, Runs, Layers, Explorer, Map, Metadata, Data Quality, Governance, Metrics, Architecture, Agent, API Docs, Admin collapsed). Top KPI strip with real values from metadata/DQ/metrics. Global Filters Bar (Disco, Month, Band, Search) — URL-synced.

## Run

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` to your backend base URL (e.g. `http://localhost:8000`). The frontend calls the backend directly at `{base}/v1` (no `/v1` in the env value). Pipeline Operations shows runtime-resolved URLs and a health check; use "Copy diagnostics" if the backend is unreachable.

### Backend (required for API)

From the repo **backend** directory:

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Use **`--host 0.0.0.0`** so the server is reachable from other machines and from Docker (some setups cannot reach `127.0.0.1`).

### Docker

If the **frontend** runs inside Docker, `localhost` in the browser will not reach a backend on the host. On Windows or Mac, set:

```bash
NEXT_PUBLIC_API_BASE_URL=http://host.docker.internal:8000
```

The backend CORS allows `http://localhost:3000`, `http://127.0.0.1:3000`, and `http://host.docker.internal:3000`.

## Branding

- Logo: `public/branding/ldv-logo.svg` (or replace with `ldv-logo.png`).
- Theme: CSS variables in `src/styles/globals.css` (primary, accent, support, surface, border, text). No hardcoded hex in components.
