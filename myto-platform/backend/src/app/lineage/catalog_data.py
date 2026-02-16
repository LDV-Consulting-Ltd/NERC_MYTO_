"""
Catalog table list for lineage nodes. Shared with metadata DATASETS.
Enriched with optional lastUpdated, rowCount from DB.
"""
from app.api.routes.metadata import DATASETS

# Source node for lineage (discover stage input)
SOURCE_ENTRIES = [
    {"name": "source.myto_list", "layer": "source", "description": "MYTO PDF list URL", "displayName": "MYTO list"},
]


def get_catalog_tables_static() -> list[dict]:
    """Catalog entries for all tables (source + metadata DATASETS)."""
    out = []
    for e in SOURCE_ENTRIES:
        out.append({
            "id": e["name"],
            "name": e["name"],
            "layer": e["layer"],
            "description": e.get("description", ""),
            "displayName": e.get("displayName", e["name"].split(".")[-1].replace("_", " ")),
            "dataset": None,
            "lastUpdated": None,
            "rowCount": None,
        })
    for d in DATASETS:
        name = d["name"]
        layer = d.get("layer", "bronze")
        display_name = name.split(".")[-1].replace("_", " ") if "." in name else name
        out.append({
            "id": name,
            "name": name,
            "layer": layer,
            "description": d.get("description", ""),
            "displayName": display_name,
            "dataset": name.split(".")[0] if "." in name else name,
            "lastUpdated": None,
            "rowCount": None,
        })
    return out
