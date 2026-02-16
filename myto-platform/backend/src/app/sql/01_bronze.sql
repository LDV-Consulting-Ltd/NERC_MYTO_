CREATE SCHEMA IF NOT EXISTS bronze;

CREATE TABLE IF NOT EXISTS bronze.etl_run (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running',  -- running, success, failed
    source_root_url TEXT,
    notes TEXT,
    git_sha TEXT,
    host TEXT
);

CREATE TABLE IF NOT EXISTS bronze.etl_stage (
    run_id UUID NOT NULL REFERENCES bronze.etl_run(run_id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running',
    input_count BIGINT,
    output_count BIGINT,
    error_count BIGINT,
    duration_ms BIGINT,
    meta JSONB,
    PRIMARY KEY (run_id, stage_name)
);

CREATE TABLE IF NOT EXISTS bronze.etl_event (
    run_id UUID NOT NULL REFERENCES bronze.etl_run(run_id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    event_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    level TEXT NOT NULL,  -- info, warning, error
    message TEXT,
    context JSONB
);

CREATE INDEX IF NOT EXISTS idx_etl_event_run_stage ON bronze.etl_event(run_id, stage_name);

CREATE TABLE IF NOT EXISTS bronze.pdf_registry (
    run_id UUID NOT NULL REFERENCES bronze.etl_run(run_id) ON DELETE CASCADE,
    pdf_url TEXT NOT NULL,
    title TEXT,
    disco_code TEXT,
    month_name TEXT,
    year INT,
    publish_date DATE,
    page_discovered INT,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (run_id, pdf_url)
);

CREATE TABLE IF NOT EXISTS bronze.pdf_artifact (
    run_id UUID NOT NULL REFERENCES bronze.etl_run(run_id) ON DELETE CASCADE,
    pdf_url TEXT NOT NULL,
    sha256 TEXT,
    file_bytes BYTEA,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    http_status INT,
    content_type TEXT,
    error TEXT,
    PRIMARY KEY (run_id, pdf_url)
);

CREATE TABLE IF NOT EXISTS bronze.pdf_table_raw (
    run_id UUID NOT NULL REFERENCES bronze.etl_run(run_id) ON DELETE CASCADE,
    pdf_url TEXT NOT NULL,
    disco_code TEXT,
    month_name TEXT,
    year INT,
    page_no INT NOT NULL,
    table_index INT NOT NULL,
    table_name TEXT,
    method TEXT,
    confidence FLOAT,
    rows_jsonb JSONB NOT NULL,
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (run_id, pdf_url, page_no, table_index)
);
