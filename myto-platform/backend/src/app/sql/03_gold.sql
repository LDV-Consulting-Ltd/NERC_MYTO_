CREATE SCHEMA IF NOT EXISTS gold;

CREATE TABLE IF NOT EXISTS gold.dim_disco (
    disco_key SERIAL PRIMARY KEY,
    disco_code TEXT UNIQUE NOT NULL,
    disco_name TEXT
);

CREATE TABLE IF NOT EXISTS gold.dim_date (
    date_key INT PRIMARY KEY,  -- YYYYMM
    year INT NOT NULL,
    month INT NOT NULL,
    month_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gold.dim_feeder (
    feeder_key SERIAL PRIMARY KEY,
    disco_key INT NOT NULL REFERENCES gold.dim_disco(disco_key),
    feeder_name TEXT NOT NULL,
    band TEXT
);

CREATE TABLE IF NOT EXISTS gold.dim_location (
    location_key SERIAL PRIMARY KEY,
    location_text_norm TEXT UNIQUE NOT NULL,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    geom geography(Point, 4326),
    provider TEXT,
    confidence FLOAT
);

CREATE TABLE IF NOT EXISTS gold.fact_supply_commitment (
    run_id UUID NOT NULL,
    date_key INT NOT NULL REFERENCES gold.dim_date(date_key),
    disco_key INT NOT NULL REFERENCES gold.dim_disco(disco_key),
    feeder_key INT NOT NULL REFERENCES gold.dim_feeder(feeder_key),
    location_key INT REFERENCES gold.dim_location(location_key),
    min_supply_hours NUMERIC,
    source_pdf_url TEXT,
    source_page_no INT,
    PRIMARY KEY (run_id, date_key, disco_key, feeder_key, location_key)
);
