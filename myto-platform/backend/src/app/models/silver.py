from sqlalchemy import Column, String, Text, Integer, Numeric, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from geoalchemy2 import Geography
from app.db import Base


class ServiceLevelCommitments(Base):
    __tablename__ = "service_level_commitments"
    __table_args__ = {"schema": "silver"}
    run_id = Column(PGUUID(as_uuid=True), primary_key=True)
    disco_code = Column(Text, primary_key=True)
    month_name = Column(Text, primary_key=True)
    year = Column(Integer, primary_key=True)
    band = Column(Text, primary_key=True)
    feeder_name = Column(Text, primary_key=True)
    feeder_location = Column(Text, primary_key=True)
    major_users = Column(Text)
    min_supply_hours = Column(Numeric)
    source_pdf_url = Column(Text)
    source_page_no = Column(Integer)
    source_table_index = Column(Integer)


class ServiceLevelCommitmentsDq(Base):
    __tablename__ = "service_level_commitments_dq"
    __table_args__ = {"schema": "silver"}
    run_id = Column(PGUUID(as_uuid=True), primary_key=True)
    record_id = Column(Text, primary_key=True)
    dq_status = Column(String, nullable=False)
    dq_reasons = Column(JSONB)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default="now()")


class GeocodeCache(Base):
    __tablename__ = "geocode_cache"
    __table_args__ = {"schema": "silver"}
    location_text_norm = Column(Text, primary_key=True)
    provider = Column(Text)
    lat = Column(Float)
    lon = Column(Float)
    confidence = Column(Float)
    raw_response = Column(JSONB)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default="now()")


class ServiceLevelCommitmentsGeo(Base):
    __tablename__ = "service_level_commitments_geo"
    __table_args__ = {"schema": "silver"}
    run_id = Column(PGUUID(as_uuid=True), primary_key=True)
    disco_code = Column(Text, primary_key=True)
    month_name = Column(Text, primary_key=True)
    year = Column(Integer, primary_key=True)
    band = Column(Text, primary_key=True)
    feeder_name = Column(Text, primary_key=True)
    feeder_location = Column(Text, primary_key=True)
    location_text_norm = Column(Text)
    lat = Column(Float)
    lon = Column(Float)
    geocode_provider = Column(Text)
    geocode_confidence = Column(Float)
    geom = Column(Geography(geometry_type="POINT", srid=4326))
    major_users = Column(Text)
    min_supply_hours = Column(Numeric)
    source_pdf_url = Column(Text)
    source_page_no = Column(Integer)
    source_table_index = Column(Integer)


class ServiceLevelCommitmentsGeoLatest(Base):
    __tablename__ = "service_level_commitments_geo_latest"
    __table_args__ = {"schema": "silver"}
    run_id = Column(PGUUID(as_uuid=True), primary_key=True)
    disco_code = Column(Text, nullable=False, primary_key=True)
    month_name = Column(Text, nullable=False, primary_key=True)
    year = Column(Integer, nullable=False, primary_key=True)
    band = Column(Text, primary_key=True)
    feeder_name = Column(Text, primary_key=True)
    feeder_location = Column(Text, primary_key=True)
    refreshed_at = Column(DateTime(timezone=True), nullable=False, server_default="now()")
    location_text_norm = Column(Text)
    lat = Column(Float)
    lon = Column(Float)
    geocode_provider = Column(Text)
    geocode_confidence = Column(Float)
    geom = Column(Geography(geometry_type="POINT", srid=4326))
    major_users = Column(Text)
    min_supply_hours = Column(Numeric)
    source_pdf_url = Column(Text)
    source_page_no = Column(Integer)
    source_table_index = Column(Integer)
