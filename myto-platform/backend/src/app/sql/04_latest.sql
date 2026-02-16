-- Latest snapshot tables: populated by promote_latest in one transaction (truncate + insert).

CREATE TABLE IF NOT EXISTS silver.service_level_commitments_geo_latest (
    run_id UUID NOT NULL,
    refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    disco_code TEXT NOT NULL,
    month_name TEXT NOT NULL,
    year INT NOT NULL,
    band TEXT,
    feeder_name TEXT,
    feeder_location TEXT,
    location_text_norm TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    geocode_provider TEXT,
    geocode_confidence FLOAT,
    geom geography(Point, 4326),
    major_users TEXT,
    min_supply_hours NUMERIC,
    source_pdf_url TEXT,
    source_page_no INT,
    source_table_index INT
);

CREATE INDEX IF NOT EXISTS idx_slc_geo_latest_geom ON silver.service_level_commitments_geo_latest USING GIST(geom);

CREATE TABLE IF NOT EXISTS gold.fact_supply_commitment_latest (
    run_id UUID NOT NULL,
    refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_key INT NOT NULL,
    disco_key INT NOT NULL,
    feeder_key INT NOT NULL,
    location_key INT,
    min_supply_hours NUMERIC,
    source_pdf_url TEXT,
    source_page_no INT
);

CREATE INDEX IF NOT EXISTS idx_fact_latest_run ON gold.fact_supply_commitment_latest(run_id);
