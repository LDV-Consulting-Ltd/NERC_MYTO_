"""Tests for lineage builder: edges only from registry, no full mesh."""
import pytest
from app.lineage.builder import build_graph, build_edges_from_registry, validate_no_full_mesh
from app.lineage.catalog_data import get_catalog_tables_static


def test_build_edges_from_registry():
    edges = build_edges_from_registry(run_id=None, ts=None)
    assert len(edges) > 0
    ids = {e["id"] for e in edges}
    assert len(ids) == len(edges)
    for e in edges:
        assert e["source"] and e["target"] and e["transformName"]


def test_build_graph_returns_nodes_and_edges():
    catalog = get_catalog_tables_static()
    result = build_graph(catalog, mode="latest")
    assert "nodes" in result
    assert "edges" in result
    assert "meta" in result
    assert result["meta"]["mode"] == "latest"
    node_ids = {n["id"] for n in result["nodes"]}
    assert "source.myto_list" in node_ids
    assert "bronze.pdf_table_raw" in node_ids
    assert "silver.service_level_commitments_geo" in node_ids
    assert "gold.fact_supply_commitment" in node_ids
    for e in result["edges"]:
        assert e["source"] in node_ids and e["target"] in node_ids


def test_validate_no_full_mesh_rejects_all_to_all():
    # If we had edges from every bronze to every silver, validation should fail
    nodes = [
        {"id": "bronze.a", "layer": "bronze"},
        {"id": "bronze.b", "layer": "bronze"},
        {"id": "silver.x", "layer": "silver"},
        {"id": "silver.y", "layer": "silver"},
    ]
    edges_all_mesh = [
        {"source": "bronze.a", "target": "silver.x"},
        {"source": "bronze.a", "target": "silver.y"},
        {"source": "bronze.b", "target": "silver.x"},
        {"source": "bronze.b", "target": "silver.y"},
    ]
    with pytest.raises(ValueError, match="full bronze->silver mesh"):
        validate_no_full_mesh(nodes, edges_all_mesh)
