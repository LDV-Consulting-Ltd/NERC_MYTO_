"""Storage helpers for run-scoped and latest data."""
from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.bronze import PdfArtifact


async def get_artifact_bytes(session: AsyncSession, run_id: UUID, pdf_url: str) -> Optional[bytes]:
    r = await session.execute(
        select(PdfArtifact.file_bytes).where(
            PdfArtifact.run_id == run_id,
            PdfArtifact.pdf_url == pdf_url,
            PdfArtifact.file_bytes.isnot(None),
        )
    )
    return r.scalars().first()


async def get_latest_run_id(session: AsyncSession) -> Optional[UUID]:
    r = await session.execute(
        text("SELECT run_id FROM silver.service_level_commitments_geo_latest LIMIT 1")
    )
    row = r.first()
    return row[0] if row else None
