"""
Promote latest: atomic truncate + insert from current run into
silver.service_level_commitments_geo_latest and gold.fact_supply_commitment_latest.
"""
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def promote_latest(session: AsyncSession, run_id: UUID) -> None:
    await session.execute(text("TRUNCATE silver.service_level_commitments_geo_latest"))
    await session.execute(
        text("""
            INSERT INTO silver.service_level_commitments_geo_latest
            (run_id, refreshed_at, disco_code, month_name, year, band, feeder_name, feeder_location,
             location_text_norm, lat, lon, geocode_provider, geocode_confidence, geom,
             major_users, min_supply_hours, source_pdf_url, source_page_no, source_table_index)
            SELECT run_id, now(), disco_code, month_name, year, band, feeder_name, feeder_location,
                   location_text_norm, lat, lon, geocode_provider, geocode_confidence, geom,
                   major_users, min_supply_hours, source_pdf_url, source_page_no, source_table_index
            FROM silver.service_level_commitments_geo WHERE run_id = :run_id
        """),
        {"run_id": str(run_id)},
    )
    await session.execute(text("TRUNCATE gold.fact_supply_commitment_latest"))
    await session.execute(
        text("""
            INSERT INTO gold.fact_supply_commitment_latest
            (run_id, refreshed_at, date_key, disco_key, feeder_key, location_key, min_supply_hours, source_pdf_url, source_page_no)
            SELECT run_id, now(), date_key, disco_key, feeder_key, location_key, min_supply_hours, source_pdf_url, source_page_no
            FROM gold.fact_supply_commitment WHERE run_id = :run_id
        """),
        {"run_id": str(run_id)},
    )
    await session.flush()
