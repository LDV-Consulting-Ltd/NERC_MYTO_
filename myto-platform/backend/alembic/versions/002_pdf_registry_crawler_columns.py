"""Add pdf_registry columns for streaming discover/resolve/download

Revision ID: 002
Revises: 001
Create Date: 2025-02-10

"""
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = [
        ("source_list_page_url", "TEXT"),
        ("view_url", "TEXT"),
        ("download_url", "TEXT"),
        ("status", "TEXT DEFAULT 'discovered'"),
        ("pdf_url_original", "TEXT"),
        ("pdf_url_resolved", "TEXT"),
        ("pdf_filename", "TEXT"),
        ("content_type", "TEXT"),
        ("resolved_at", "TIMESTAMPTZ"),
        ("publish_date_text", "TEXT"),
    ]
    for col, typ in columns:
        op.execute(f"ALTER TABLE bronze.pdf_registry ADD COLUMN IF NOT EXISTS {col} {typ}")

def downgrade() -> None:
    for col in ["source_list_page_url", "view_url", "download_url", "status", "pdf_url_original", "pdf_url_resolved", "pdf_filename", "content_type", "resolved_at", "publish_date_text"]:
        op.execute(f"ALTER TABLE bronze.pdf_registry DROP COLUMN IF EXISTS {col}")

