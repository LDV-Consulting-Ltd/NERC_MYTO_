"""Medallion schemas bronze, silver, gold, latest

Revision ID: 001
Revises:
Create Date: 2025-02-10

"""
from alembic import op
import os

revision = "001"
down_revision = None
branch_labels = None
depends_on = None

def _read_sql(name: str) -> str:
    path = os.path.join(os.path.dirname(__file__), "..", "..", "src", "app", "sql", name)
    with open(path, "r") as f:
        return f.read()


def upgrade() -> None:
    for name in ["00_extensions.sql", "01_bronze.sql", "02_silver.sql", "03_gold.sql", "04_latest.sql"]:
        sql = _read_sql(name).strip()
        if sql:
            op.execute(sql)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS gold.fact_supply_commitment_latest;")
    op.execute("DROP TABLE IF EXISTS silver.service_level_commitments_geo_latest;")
    op.execute("DROP INDEX IF EXISTS silver.idx_slc_geo_geom;")
    op.execute("DROP INDEX IF EXISTS silver.idx_slc_geo_run;")
    op.execute("DROP TABLE IF EXISTS silver.service_level_commitments_geo;")
    op.execute("DROP TABLE IF EXISTS silver.geocode_cache;")
    op.execute("DROP TABLE IF EXISTS silver.service_level_commitments_dq;")
    op.execute("DROP TABLE IF EXISTS silver.service_level_commitments;")
    op.execute("DROP TABLE IF EXISTS gold.fact_supply_commitment;")
    op.execute("DROP TABLE IF EXISTS gold.dim_location;")
    op.execute("DROP TABLE IF EXISTS gold.dim_feeder;")
    op.execute("DROP TABLE IF EXISTS gold.dim_date;")
    op.execute("DROP TABLE IF EXISTS gold.dim_disco;")
    op.execute("DROP TABLE IF EXISTS bronze.pdf_table_raw;")
    op.execute("DROP TABLE IF EXISTS bronze.pdf_artifact;")
    op.execute("DROP TABLE IF EXISTS bronze.pdf_registry;")
    op.execute("DROP INDEX IF EXISTS bronze.idx_etl_event_run_stage;")
    op.execute("DROP TABLE IF EXISTS bronze.etl_event;")
    op.execute("DROP TABLE IF EXISTS bronze.etl_stage;")
    op.execute("DROP TABLE IF EXISTS bronze.etl_run;")
    op.execute("DROP SCHEMA IF EXISTS gold;")
    op.execute("DROP SCHEMA IF EXISTS silver;")
    op.execute("DROP SCHEMA IF EXISTS bronze;")
