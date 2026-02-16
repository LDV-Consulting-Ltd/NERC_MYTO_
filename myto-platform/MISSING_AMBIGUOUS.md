# MISSING / AMBIGUOUS TODO

Items that are not present or are ambiguous; do not invent silently.

## 1. Gazetteer dataset for fuzzy geocoding

- **Status**: MISSING
- **Description**: The geocoding workflow uses rapidfuzz to match `location_text_norm` against "previously-seen location dimension" (silver.geocode_cache). There is **no external Nigerian gazetteer** (e.g. list of place names with lat/lon) bundled or configured.
- **Effect**: Fuzzy match only uses existing cache entries. First pass for new locations will always go to online fallback (Nominatim) until cached.
- **TODO**: Optionally add a gazetteer (e.g. CSV or table of place names + lat/lon) and seed `silver.geocode_cache` or use it as the candidate list in `fuzzy_match()`. Do not invent gazetteer data.

## 2. Parquet export

- **Status**: NOT IMPLEMENTED
- **Description**: `/v1/exports/latest/commitments.parquet` returns 501.
- **TODO**: Implement with pyarrow or pandas to export silver.service_level_commitments_geo_latest as Parquet if required.

## 3. Bronze/Silver/Gold layer counts in UI

- **Status**: PARTIAL
- **Description**: Bronze/Silver/Gold layer pages show placeholder or high-level metrics. No dedicated API for "count of pdf_registry per run" or "count of pdf_table_raw per run" for the latest run.
- **TODO**: Add optional `/v1/metadata/runs/{run_id}/counts` or similar for layer counts if needed for the UI.

## 4. Admin overrides (manual geocode, merge/split)

- **Status**: STUB ONLY
- **Description**: `/v1/admin/overrides/*` is mentioned; no routes implemented. Admin is for DQ/Governance/Metrics/Metadata/Overrides only; overrides (manual geocode, merge/split feeder) are hidden from main UI.
- **TODO**: Implement overrides endpoints when required; ensure they write to appropriate tables and optionally audit in governance.

## 5. PyMuPDF table extraction API

- **Status**: AMBIGUOUS
- **Description**: `page.find_tables()` and `table.extract()` may vary by PyMuPDF version. Current code assumes `.extract()` returns a DataFrame-like with `.to_dict(orient="records")`; if the API returns a list of lists or another structure, the extractor may need adjustment.
- **TODO**: Verify against installed PyMuPDF version and adjust pymupdf_tables.py if needed.

## 6. NERC MYTO list page structure

- **Status**: EXTERNAL
- **Description**: Discover stage parses NERC category list pages (selectolax, link and title extraction). If NERC change HTML structure or pagination, the crawler may break or return 0 entries.
- **TODO**: Monitor; consider storing raw HTML or selectors in config if structure changes often.

## 7. SLC table column names

- **Status**: AMBIGUOUS
- **Description**: silver_transform infers columns from common names (FEEDER, LOCATION, BAND, MIN_SUPPLY_HOURS, etc.). Real MYTO PDFs may use different headers; inference may miss or mislabel columns.
- **TODO**: Add configurable column mapping or document expected header names per Disco/format.
