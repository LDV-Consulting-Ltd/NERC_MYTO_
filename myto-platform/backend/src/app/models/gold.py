from sqlalchemy import Column, String, Text, Integer, Numeric, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from geoalchemy2 import Geography
from app.db import Base


class DimDisco(Base):
    __tablename__ = "dim_disco"
    __table_args__ = {"schema": "gold"}
    disco_key = Column(Integer, primary_key=True, autoincrement=True)
    disco_code = Column(Text, unique=True, nullable=False)
    disco_name = Column(Text)


class DimDate(Base):
    __tablename__ = "dim_date"
    __table_args__ = {"schema": "gold"}
    date_key = Column(Integer, primary_key=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    month_name = Column(Text, nullable=False)


class DimFeeder(Base):
    __tablename__ = "dim_feeder"
    __table_args__ = {"schema": "gold"}
    feeder_key = Column(Integer, primary_key=True, autoincrement=True)
    disco_key = Column(Integer, ForeignKey("gold.dim_disco.disco_key"), nullable=False)
    feeder_name = Column(Text, nullable=False)
    band = Column(Text)


class DimLocation(Base):
    __tablename__ = "dim_location"
    __table_args__ = {"schema": "gold"}
    location_key = Column(Integer, primary_key=True, autoincrement=True)
    location_text_norm = Column(Text, unique=True, nullable=False)
    lat = Column(Float)
    lon = Column(Float)
    geom = Column(Geography(geometry_type="POINT", srid=4326))
    provider = Column(Text)
    confidence = Column(Float)


class FactSupplyCommitment(Base):
    __tablename__ = "fact_supply_commitment"
    __table_args__ = {"schema": "gold"}
    run_id = Column(PGUUID(as_uuid=True), primary_key=True)
    date_key = Column(Integer, ForeignKey("gold.dim_date.date_key"), primary_key=True)
    disco_key = Column(Integer, ForeignKey("gold.dim_disco.disco_key"), primary_key=True)
    feeder_key = Column(Integer, ForeignKey("gold.dim_feeder.feeder_key"), primary_key=True)
    location_key = Column(Integer, ForeignKey("gold.dim_location.location_key"), primary_key=True)
    min_supply_hours = Column(Numeric)
    source_pdf_url = Column(Text)
    source_page_no = Column(Integer)


class FactSupplyCommitmentLatest(Base):
    __tablename__ = "fact_supply_commitment_latest"
    __table_args__ = {"schema": "gold"}
    run_id = Column(PGUUID(as_uuid=True), primary_key=True)
    date_key = Column(Integer, nullable=False, primary_key=True)
    disco_key = Column(Integer, nullable=False, primary_key=True)
    feeder_key = Column(Integer, nullable=False, primary_key=True)
    location_key = Column(Integer)
    refreshed_at = Column(DateTime(timezone=True), nullable=False, server_default="now()")
    min_supply_hours = Column(Numeric)
    source_pdf_url = Column(Text)
    source_page_no = Column(Integer)
