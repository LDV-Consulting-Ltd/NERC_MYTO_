"""
Transform registry: explicit input_table -> output_table per transform.
Used to build lineage edges. NEVER infer edges (e.g. all bronze -> all silver).
"""
from typing import TypedDict


class TransformDef(TypedDict):
    transform_name: str
    inputs: list[str]  # table ids e.g. "bronze.pdf_table_raw"
    outputs: list[str]
    layer_from: str  # source | bronze | silver | gold
    layer_to: str


# Derived from actual ETL stages: discover, download, extract, silver_transform, silver_geocode, gold_build, promote_latest.
TRANSFORM_REGISTRY: list[TransformDef] = [
    {
        "transform_name": "discover",
        "inputs": ["source.myto_list"],
        "outputs": ["bronze.pdf_registry"],
        "layer_from": "source",
        "layer_to": "bronze",
    },
    {
        "transform_name": "download",
        "inputs": ["bronze.pdf_registry"],
        "outputs": ["bronze.pdf_artifact"],
        "layer_from": "bronze",
        "layer_to": "bronze",
    },
    {
        "transform_name": "extract",
        "inputs": ["bronze.pdf_artifact", "bronze.pdf_registry"],
        "outputs": ["bronze.pdf_table_raw"],
        "layer_from": "bronze",
        "layer_to": "bronze",
    },
    {
        "transform_name": "silver_transform",
        "inputs": ["bronze.pdf_table_raw"],
        "outputs": ["silver.service_level_commitments", "silver.service_level_commitments_dq"],
        "layer_from": "bronze",
        "layer_to": "silver",
    },
    {
        "transform_name": "silver_geocode",
        "inputs": ["silver.service_level_commitments", "silver.geocode_cache"],
        "outputs": ["silver.service_level_commitments_geo"],
        "layer_from": "silver",
        "layer_to": "silver",
    },
    {
        "transform_name": "gold_build",
        "inputs": ["silver.service_level_commitments_geo"],
        "outputs": [
            "gold.dim_disco",
            "gold.dim_date",
            "gold.dim_feeder",
            "gold.dim_location",
            "gold.fact_supply_commitment",
        ],
        "layer_from": "silver",
        "layer_to": "gold",
    },
    {
        "transform_name": "promote_latest",
        "inputs": ["silver.service_level_commitments_geo", "gold.fact_supply_commitment"],
        "outputs": ["silver.service_level_commitments_geo_latest", "gold.fact_supply_commitment_latest"],
        "layer_from": "silver",
        "layer_to": "gold",
    },
]

# Virtual source node for discover stage
SOURCE_TABLE_IDS = ["source.myto_list"]
