# Lineage Explorer – How to Feed Lineage for Any Project

The Lineage Explorer shows a **left-to-right dependency graph** (Sources → Bronze → Silver → Gold/Warehouse) derived from **real pipeline dependencies**, not from naming or layer adjacency.

## Data sources (priority order)

### 1. Runtime execution logs (preferred)

If you have a **transform_runs** (or equivalent) table that records, per run:

- `run_id`
- `transform_name`
- `input_tables[]`
- `output_tables[]`
- `ts`

then the lineage builder can use this to build edges and optionally filter by `run_id` (mode=run). This project does not yet persist these columns in `bronze.etl_stage`; you can add a dedicated table and have each pipeline step write its inputs/outputs there, then implement a loader in `app/lineage/builder.py` that reads from it and merges with the registry.

### 2. Transform registry (current approach)

This repo uses a **code-based transform registry** in `backend/src/app/lineage/registry.py`:

- **TRANSFORM_REGISTRY**: list of `{ transform_name, inputs[], outputs[], layer_from, layer_to }`.
- Each **edge** is created only for explicit (input_table → output_table) pairs from the registry.
- No inference: we never connect "all Bronze → all Silver" or "all Silver → all Gold".

To add lineage for a new project:

1. **Edit `app/lineage/registry.py`**  
   Add one entry per transform, with:
   - `transform_name`: e.g. `"silver_transform"`.
   - `inputs`: list of table ids the transform **reads** (e.g. `["bronze.pdf_table_raw"]`).
   - `outputs`: list of table ids the transform **writes** (e.g. `["silver.service_level_commitments", "silver.service_level_commitments_dq"]`).
   - `layer_from` / `layer_to`: `"source" | "bronze" | "silver" | "gold"` for layout.

2. **Catalog tables**  
   Ensure every table id used in the registry appears in the catalog used by the lineage builder. This project builds the catalog from `app/lineage/catalog_data.py` (which uses `SOURCE_ENTRIES` and metadata `DATASETS`). Add any new tables there (or to the metadata `DATASETS` in `app/api/routes/metadata.py`) so they appear as nodes.

### 3. SQL parse fallback (optional)

Only if runtime logs and registry are not available: you could add a step that parses SQL from transform definitions (e.g. dbt, or stored SQL) to extract `FROM` / `INSERT INTO` and build input/output lists. Not implemented in this repo.

## Hard rules (enforced in code)

- **Never** connect all Bronze → all Silver or all Silver → all Gold.
- Create an edge **only** if a transform explicitly reads `input_table` and writes `output_table`.
- Gold edges must originate from Silver when the transforms do so; if a transform reads Bronze and writes Gold directly, that single edge is allowed.
- The builder runs **validate_no_full_mesh**: if edge counts suggest a full mesh between layers, the build fails with a clear error (wrong inference).

## API

- **GET /v1/lineage/graph?mode=latest|run&run_id=&dataset=&layer=**  
  Returns `{ nodes, edges, meta }` for the Lineage Explorer.

- **GET /v1/catalog/tables?layer=&dataset=**  
  Returns catalog tables (displayName, layer, rowCount, lastUpdated) for filters and node enrichment.

## Frontend

- **Lineage Explorer** page: `/lineage`.
- Controls: Dataset filter, Layer filter (chips), Mode (Latest / By Run), Run selector, Search to highlight a table.
- Click node → table detail modal with link to Metadata catalog.
- Zoom/pan/fit and "Reset view" on the graph.

## Adding a new pipeline to the same repo

1. Add new table ids to the catalog (e.g. in `catalog_data.py` or metadata `DATASETS`).
2. Add transforms to **TRANSFORM_REGISTRY** with correct `inputs` and `outputs`.
3. Optionally add a **transform_runs** log and wire the lineage builder to it for mode=run and richer run-scoped lineage.

No changes to the frontend are required; the graph is driven entirely by the API response.
