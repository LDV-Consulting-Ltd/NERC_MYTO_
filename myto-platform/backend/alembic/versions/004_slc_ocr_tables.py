"""SLC signature + OCR cache tables + pdf_table_raw enrichment

Revision ID: 004
Revises: 003
Create Date: 2025-02-10

"""
from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE bronze.pdf_registry ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMPTZ")
    op.execute("ALTER TABLE bronze.pdf_registry ADD COLUMN IF NOT EXISTS bytes_count BIGINT")

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.pdf_page_signature (
            run_id UUID NOT NULL REFERENCES bronze.etl_run(run_id) ON DELETE CASCADE,
            pdf_url TEXT NOT NULL,
            page_no INT NOT NULL,
            header_signature_score INT NOT NULL,
            matched_tokens JSONB,
            is_candidate BOOLEAN NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (run_id, pdf_url, page_no)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.pdf_page_ocr_cache (
            pdf_sha256 TEXT NOT NULL,
            page_no INT NOT NULL,
            ocr_engine TEXT NOT NULL,
            ocr_text TEXT,
            ocr_boxes_json JSONB,
            ocr_confidence FLOAT,
            duration_ms BIGINT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (pdf_sha256, page_no)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.pdf_page_ocr (
            run_id UUID NOT NULL REFERENCES bronze.etl_run(run_id) ON DELETE CASCADE,
            pdf_url_resolved TEXT NOT NULL,
            pdf_sha256 TEXT NOT NULL,
            page_no INT NOT NULL,
            ocr_engine TEXT NOT NULL,
            ocr_text TEXT,
            ocr_boxes_json JSONB,
            ocr_confidence FLOAT,
            duration_ms BIGINT,
            used_cache BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (run_id, pdf_url_resolved, page_no)
        )
    """)

    op.execute("ALTER TABLE bronze.pdf_table_raw ADD COLUMN IF NOT EXISTS duration_ms BIGINT")
    op.execute("ALTER TABLE bronze.pdf_table_raw ADD COLUMN IF NOT EXISTS header_signature_score INT")
    op.execute("ALTER TABLE bronze.pdf_table_raw ADD COLUMN IF NOT EXISTS matched_tokens JSONB")
    op.execute("ALTER TABLE bronze.pdf_table_raw ADD COLUMN IF NOT EXISTS extractor_used TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE bronze.pdf_table_raw DROP COLUMN IF EXISTS extractor_used")
    op.execute("ALTER TABLE bronze.pdf_table_raw DROP COLUMN IF EXISTS matched_tokens")
    op.execute("ALTER TABLE bronze.pdf_table_raw DROP COLUMN IF EXISTS header_signature_score")
    op.execute("ALTER TABLE bronze.pdf_table_raw DROP COLUMN IF EXISTS duration_ms")
    op.execute("DROP TABLE IF EXISTS bronze.pdf_page_ocr")
    op.execute("DROP TABLE IF EXISTS bronze.pdf_page_ocr_cache")
    op.execute("DROP TABLE IF EXISTS bronze.pdf_page_signature")
    op.execute("ALTER TABLE bronze.pdf_registry DROP COLUMN IF EXISTS bytes_count")
    op.execute("ALTER TABLE bronze.pdf_registry DROP COLUMN IF EXISTS downloaded_at")
