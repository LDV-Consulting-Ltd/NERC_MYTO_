CREATE SCHEMA IF NOT EXISTS silver;

CREATE TABLE IF NOT EXISTS silver.service_level_commitments (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL,
    disco_code TEXT NOT NULL,
    month_name TEXT NOT NULL,
    year INT NOT NULL,
    band TEXT,
    feeder_name TEXT,
    feeder_location TEXT,
    major_users TEXT,
    min_supply_hours NUMERIC,
    source_pdf_url TEXT,
    source_page_no INT,
    source_table_index INT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_slc_business_key ON silver.service_level_commitments (run_id, disco_code, month_name, year, COALESCE(feeder_name, ''), COALESCE(feeder_location, ''), COALESCE(band, ''));

CREATE TABLE IF NOT EXISTS silver.service_level_commitments_dq (
    run_id UUID NOT NULL,
    record_id TEXT NOT NULL,
    dq_status TEXT NOT NULL,
    dq_reasons JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (run_id, record_id)
);

CREATE TABLE IF NOT EXISTS silver.geocode_cache (
    location_text_norm TEXT PRIMARY KEY,
    provider TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    confidence FLOAT,
    raw_response JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS silver.service_level_commitments_geo (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL,
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_slc_geo_business_key ON silver.service_level_commitments_geo (run_id, disco_code, month_name, year, COALESCE(feeder_name, ''), COALESCE(feeder_location, ''), COALESCE(band, ''));

CREATE INDEX IF NOT EXISTS idx_slc_geo_run ON silver.service_level_commitments_geo(run_id);
CREATE INDEX IF NOT EXISTS idx_slc_geo_geom ON silver.service_level_commitments_geo USING GIST(geom);
