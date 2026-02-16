"""
Build lineage graph from transform registry only. No inference.
Validation: fail if edge count suggests full mesh (wrong logic).
"""
import logging
from datetime import datetime, timezone
from typing import Any

from app.lineage.registry import TRANSFORM_REGISTRY, SOURCE_TABLE_IDS

logger = logging.getLogger(__name__)

# Layer order for left-to-right layout
LAYER_ORDER = ("source", "bronze", "silver", "gold")
# "latest" tables displayed as gold/warehouse
LAYER_DISPLAY = {"source": "source", "bronze": "bronze", "silver": "silver", "gold": "gold", "latest": "gold"}


def _catalog_table_ids(catalog_tables: list[dict]) -> set[str]:
    """All table ids from catalog plus source nodes."""
    ids = {SOURCE_TABLE_IDS[0]}
    for row in catalog_tables:
        name = row.get("name") or row.get("id")
        if name:
            ids.add(name)
    return ids


def _layer_for_table(table_id: str, catalog_by_id: dict[str, dict]) -> str:
    """Resolve layer for a table id. source/bronze/silver/gold/latest."""
    if table_id.startswith("source."):
        return "source"
    row = catalog_by_id.get(table_id)
    if row:
        layer = (row.get("layer") or "bronze").lower()
        return LAYER_DISPLAY.get(layer, layer)
    if table_id.startswith("bronze."):
        return "bronze"
    if table_id.startswith("silver."):
        return "silver"
    if table_id.startswith("gold."):
        return "gold"
    return "bronze"


def build_edges_from_registry(
    run_id: str | None = None,
    ts: str | None = None,
) -> list[dict[str, Any]]:
    """
    Build edges only from TRANSFORM_REGISTRY.
    Each (input, output) pair per transform becomes one edge. De-duplicate by (source, target, transformName).
    """
    seen: set[tuple[str, str, str]] = set()
    edges: list[dict[str, Any]] = []
    for t in TRANSFORM_REGISTRY:
        transform_name = t["transform_name"]
        for src in t["inputs"]:
            for tgt in t["outputs"]:
                key = (src, tgt, transform_name)
                if key in seen:
                    continue
                seen.add(key)
                edges.append({
                    "id": f"{src}->{tgt}|{transform_name}",
                    "source": src,
                    "target": tgt,
                    "transformName": transform_name,
                    "runId": run_id,
                    "ts": ts,
                })
    return edges


def build_nodes_from_catalog(
    catalog_tables: list[dict],
    dataset_filter: str | None = None,
    layer_filter: str | None = None,
) -> list[dict[str, Any]]:
    """
    Build node list from catalog. Each table id = one node.
    Enrich with displayName, layer, dataset, lastUpdated, rowCount.
    """
    catalog_by_id = {(row.get("name") or row.get("id")): row for row in catalog_tables if row.get("name") or row.get("id")}
    all_ids = _catalog_table_ids(catalog_tables)
    nodes: list[dict[str, Any]] = []
    for table_id in sorted(all_ids):
        row = catalog_by_id.get(table_id)
        if row:
            dataset = (row.get("dataset") or row.get("name") or table_id).split(".")[0] if row.get("name") else table_id.split(".")[0]
            layer = _layer_for_table(table_id, catalog_by_id)
        else:
            dataset = table_id.split(".")[0]
            layer = _layer_for_table(table_id, catalog_by_id)
        if dataset_filter and dataset != dataset_filter:
            continue
        if layer_filter and layer != layer_filter:
            continue
        display_name = (row.get("displayName") or row.get("name") or table_id) if row else table_id
        if "." in display_name:
            display_name = display_name.split(".", 1)[1].replace("_", " ")
        nodes.append({
            "id": table_id,
            "layer": layer,
            "displayName": display_name,
            "dataset": dataset if dataset != "source" else None,
            "lastUpdated": row.get("lastUpdated") if row else None,
            "rowCount": row.get("rowCount") if row else None,
        })
    return nodes


def filter_edges_by_nodes(edges: list[dict], node_ids: set[str]) -> list[dict]:
    """Keep only edges whose source and target are in node_ids."""
    return [e for e in edges if e["source"] in node_ids and e["target"] in node_ids]


def validate_no_full_mesh(nodes: list[dict], edges: list[dict]) -> None:
    """
    If edges look like all-to-all between layers (e.g. every bronze -> every silver), log warning.
    Heuristic: if edge_count >= (bronze_count * silver_count) for bronze->silver, fail build.
    """
    by_layer: dict[str, list[str]] = {}
    for n in nodes:
        layer = n.get("layer") or "bronze"
        by_layer.setdefault(layer, []).append(n["id"])
    bronze_ids = set(by_layer.get("bronze", []))
    silver_ids = set(by_layer.get("silver", []))
    gold_ids = set(by_layer.get("gold", []))
    bronze_silver_edges = [e for e in edges if e["source"] in bronze_ids and e["target"] in silver_ids]
    silver_gold_edges = [e for e in edges if e["source"] in silver_ids and e["target"] in gold_ids]
    if bronze_ids and silver_ids:
        full_mesh_count = len(bronze_ids) * len(silver_ids)
        if len(bronze_silver_edges) >= full_mesh_count:
            logger.error("Lineage build sanity: bronze->silver edge count >= bronze*silver count. Refusing to build (wrong inference).")
            raise ValueError("Lineage validation failed: edges suggest full bronze->silver mesh. Use explicit transform registry only.")
    if silver_ids and gold_ids:
        full_mesh_count = len(silver_ids) * len(gold_ids)
        if len(silver_gold_edges) >= full_mesh_count:
            logger.error("Lineage build sanity: silver->gold edge count >= silver*gold count. Refusing to build.")
            raise ValueError("Lineage validation failed: edges suggest full silver->gold mesh. Use explicit transform registry only.")


def build_graph(
    catalog_tables: list[dict],
    mode: str = "latest",
    run_id: str | None = None,
    dataset: str | None = None,
    layer: str | None = None,
    ts: str | None = None,
) -> dict[str, Any]:
    """
    Returns { "nodes": Node[], "edges": Edge[], "meta": { generated_at, mode, run_id } }.
    """
    if not ts:
        ts = datetime.now(timezone.utc).isoformat()
    nodes = build_nodes_from_catalog(catalog_tables, dataset_filter=dataset, layer_filter=layer)
    edges = build_edges_from_registry(run_id=run_id, ts=ts)
    node_ids = {n["id"] for n in nodes}
    edges = filter_edges_by_nodes(edges, node_ids)
    validate_no_full_mesh(nodes, edges)
    return {
        "nodes": nodes,
        "edges": edges,
        "meta": {
            "generated_at": ts,
            "mode": mode,
            "run_id": run_id,
        },
    }
