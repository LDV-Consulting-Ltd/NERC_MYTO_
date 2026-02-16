from datetime import datetime
from uuid import UUID
from sqlalchemy import Column, String, Text, Integer, BigInteger, Float, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB, BYTEA
from sqlalchemy.orm import relationship
from app.db import Base


class EtlRun(Base):
    __tablename__ = "etl_run"
    __table_args__ = {"schema": "bronze"}
    run_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    started_at = Column(DateTime(timezone=True), nullable=False, server_default="now()")
    finished_at = Column(DateTime(timezone=True))
    status = Column(String, nullable=False, default="running")
    source_root_url = Column(Text)
    notes = Column(Text)
    git_sha = Column(Text)
    host = Column(Text)
    heartbeat_at = Column(DateTime(timezone=True))


class EtlStage(Base):
    __tablename__ = "etl_stage"
    __table_args__ = {"schema": "bronze"}
    run_id = Column(PGUUID(as_uuid=True), ForeignKey("bronze.etl_run.run_id", ondelete="CASCADE"), primary_key=True)
    stage_name = Column(String, primary_key=True)
    started_at = Column(DateTime(timezone=True), nullable=False, server_default="now()")
    finished_at = Column(DateTime(timezone=True))
    status = Column(String, nullable=False, default="running")
    input_count = Column(BigInteger)
    output_count = Column(BigInteger)
    error_count = Column(BigInteger)
    duration_ms = Column(BigInteger)
    meta = Column(JSONB)


class EtlEvent(Base):
    __tablename__ = "etl_event"
    __table_args__ = {"schema": "bronze"}
    run_id = Column(PGUUID(as_uuid=True), ForeignKey("bronze.etl_run.run_id", ondelete="CASCADE"), primary_key=True)
    stage_name = Column(String, primary_key=True)
    event_ts = Column(DateTime(timezone=True), nullable=False, server_default="now()", primary_key=True)
    level = Column(String, nullable=False)
    message = Column(Text)
    context = Column(JSONB)


class PdfRegistry(Base):
    __tablename__ = "pdf_registry"
    __table_args__ = {"schema": "bronze"}
    run_id = Column(PGUUID(as_uuid=True), ForeignKey("bronze.etl_run.run_id", ondelete="CASCADE"), primary_key=True)
    pdf_url = Column(Text, primary_key=True)
    title = Column(Text)
    disco_code = Column(Text)
    month_name = Column(Text)
    year = Column(Integer)
    publish_date = Column(DateTime(timezone=True))
    publish_date_text = Column(Text)
    page_discovered = Column(Integer)
    discovered_at = Column(DateTime(timezone=True), nullable=False, server_default="now()")
    source_list_page_url = Column(Text)
    view_url = Column(Text)
    download_url = Column(Text)
    status = Column(Text, default="discovered")
    pdf_url_original = Column(Text)
    pdf_url_resolved = Column(Text)
    pdf_filename = Column(Text)
    content_type = Column(Text)
    resolved_at = Column(DateTime(timezone=True))
    downloaded_at = Column(DateTime(timezone=True))
    bytes_count = Column(BigInteger)


class PdfArtifact(Base):
    __tablename__ = "pdf_artifact"
    __table_args__ = {"schema": "bronze"}
    run_id = Column(PGUUID(as_uuid=True), ForeignKey("bronze.etl_run.run_id", ondelete="CASCADE"), primary_key=True)
    pdf_url = Column(Text, primary_key=True)
    sha256 = Column(Text)
    file_bytes = Column(BYTEA)
    downloaded_at = Column(DateTime(timezone=True), nullable=False, server_default="now()")
    http_status = Column(Integer)
    content_type = Column(Text)
    error = Column(Text)


class PdfTableRaw(Base):
    __tablename__ = "pdf_table_raw"
    __table_args__ = {"schema": "bronze"}
    run_id = Column(PGUUID(as_uuid=True), ForeignKey("bronze.etl_run.run_id", ondelete="CASCADE"), primary_key=True)
    pdf_url = Column(Text, primary_key=True)
    disco_code = Column(Text)
    month_name = Column(Text)
    year = Column(Integer)
    page_no = Column(Integer, primary_key=True)
    table_index = Column(Integer, primary_key=True)
    table_name = Column(Text)
    method = Column(Text)
    confidence = Column(Float)
    rows_jsonb = Column(JSONB, nullable=False)
    extracted_at = Column(DateTime(timezone=True), nullable=False, server_default="now()")
    duration_ms = Column(BigInteger)
    header_signature_score = Column(Integer)
    matched_tokens = Column(JSONB)
    extractor_used = Column(Text)
