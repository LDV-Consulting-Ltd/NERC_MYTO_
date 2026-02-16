"""Add heartbeat_at to etl_run for run lifecycle / stuck detection

Revision ID: 003
Revises: 002
Create Date: 2025-02-10

"""
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE bronze.etl_run ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ")
    # Single active run is enforced in app code (POST /v1/runs returns 409 when one is running).


def downgrade() -> None:
    op.execute("ALTER TABLE bronze.etl_run DROP COLUMN IF EXISTS heartbeat_at")
