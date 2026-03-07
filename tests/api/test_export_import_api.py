import pytest
import json


# ─── Export Tests ────────────────────────────────────────────────────────────

def _create_graph_with_nodes_and_edge(client, name="ExportGraph"):
    """Helper: create a graph and populate it with two nodes and an edge."""
    client.post("/api/graphs/", json={"name": name})
    client.post("/api/graphs/0/nodes", json={"name": "NodeA", "category": "Default"})
    client.post("/api/graphs/0/nodes", json={"name": "NodeB", "category": "Default"})
    client.post("/api/graphs/0/edges", json={"start_node": "NodeA", "end_node": "NodeB"})
    return 0  # graph_id


def test_export_graph_success(client):
    """Exporting a valid graph returns 200 with attachment header and correct JSON."""
    graph_id = _create_graph_with_nodes_and_edge(client, "MyGraph")

    response = client.get(f"/api/graphs/{graph_id}/export")

    assert response.status_code == 200

    # Must have Content-Disposition: attachment
    content_disp = response.headers.get("content-disposition", "")
    assert "attachment" in content_disp

    data = response.json()
    assert "graph" in data
    graph = data["graph"]
    assert graph["name"] == "MyGraph"
    assert len(graph["nodes"]) == 2
    assert len(graph["edges"]) == 1


def test_export_graph_not_found(client):
    """Exporting a non-existent graph returns 404."""
    response = client.get("/api/graphs/999/export")
    assert response.status_code == 404
    assert response.json()["detail"] == "Graph not found"


def test_export_is_isolated(client):
    """Exported JSON contains ONLY the requested graph's data — not other graphs."""
    # Create two graphs
    client.post("/api/graphs/", json={"name": "GraphOne"})
    client.post("/api/graphs/0/nodes", json={"name": "SecretNode"})

    client.post("/api/graphs/", json={"name": "GraphTwo"})
    client.post("/api/graphs/1/nodes", json={"name": "OtherNode"})

    # Export only Graph 0
    response = client.get("/api/graphs/0/export")
    assert response.status_code == 200

    data = response.json()
    graph = data["graph"]
    assert graph["name"] == "GraphOne"

    # Should have 1 node (SecretNode) — no nodes from GraphTwo
    node_names = [n["name"] for n in graph["nodes"]]
    assert "SecretNode" in node_names
    assert "OtherNode" not in node_names
    # Top-level should only have one graph object, not a list of graphs
    assert "graphs" not in data


def test_export_preserves_edge_data(client):
    """Exported edge data contains all edge fields."""
    graph_id = _create_graph_with_nodes_and_edge(client)

    response = client.get(f"/api/graphs/{graph_id}/export")
    assert response.status_code == 200

    edges = response.json()["graph"]["edges"]
    assert len(edges) == 1
    edge = edges[0]
    assert edge["start"] == "NodeA"
    assert edge["end"] == "NodeB"


# ─── Import Tests ─────────────────────────────────────────────────────────────

def _make_import_payload(name="ImportedGraph"):
    return {
        "graph": {
            "name": name,
            "nodes": [
                {"name": "Node1", "category": "Default", "position_x": 10, "position_y": 20},
                {"name": "Node2", "category": "Default", "position_x": 30, "position_y": 40},
            ],
            "edges": [
                {"start": "Node1", "end": "Node2", "directed": True, "description": None, "style": "solid"}
            ]
        }
    }


def test_import_graph_success(client):
    """Importing valid JSON creates a new graph and returns its ID."""
    payload = _make_import_payload("Imported")

    response = client.post("/api/graphs/import", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "new_graph_id" in data
    assert data["message"] == "Graph imported"

    # The new graph should be accessible via GET
    new_id = data["new_graph_id"]
    get_resp = client.get(f"/api/graphs/{new_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Imported"


def test_import_graph_creates_new_graph(client):
    """Importing a graph does not overwrite existing graphs."""
    # Pre-existing graph
    client.post("/api/graphs/", json={"name": "Existing"})

    payload = _make_import_payload("NewImport")
    response = client.post("/api/graphs/import", json=payload)
    assert response.status_code == 200

    # Both graphs should exist now
    all_graphs = client.get("/api/graphs/").json()
    assert len(all_graphs) == 2
    names = [g["name"] for g in all_graphs]
    assert "Existing" in names
    assert "NewImport" in names


def test_import_graph_bad_payload_missing_graph_key(client):
    """Importing JSON without the top-level 'graph' key returns 422."""
    response = client.post("/api/graphs/import", json={"not_graph": {}})
    assert response.status_code == 422


def test_import_graph_bad_payload_not_json(client):
    """Sending non-JSON body returns 422."""
    response = client.post(
        "/api/graphs/import",
        content=b"this is not json",
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422


def test_import_graph_name_collision(client):
    """Importing a graph whose name already exists gets a unique renamed version."""
    # Create graph with the same name we'll try to import
    client.post("/api/graphs/", json={"name": "MyGraph"})

    payload = _make_import_payload("MyGraph")
    response = client.post("/api/graphs/import", json=payload)
    assert response.status_code == 200

    # The imported graph should have a different name
    all_graphs = client.get("/api/graphs/").json()
    names = [g["name"] for g in all_graphs]
    assert "MyGraph" in names
    assert "MyGraph (imported)" in names


def test_import_graph_preserves_nodes_and_edges(client):
    """The imported graph retains the correct nodes and edges."""
    payload = _make_import_payload("FullImport")
    response = client.post("/api/graphs/import", json=payload)
    assert response.status_code == 200

    new_id = response.json()["new_graph_id"]

    nodes_resp = client.get(f"/api/graphs/{new_id}/nodes")
    assert nodes_resp.status_code == 200
    node_names = [n["name"] for n in nodes_resp.json()]
    assert "Node1" in node_names
    assert "Node2" in node_names

    edges_resp = client.get(f"/api/graphs/{new_id}/edges")
    assert edges_resp.status_code == 200
    assert len(edges_resp.json()) == 1
