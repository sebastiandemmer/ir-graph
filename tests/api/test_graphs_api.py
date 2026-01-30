import pytest
import logging
from http_app import graphs

# We can rely on the client fixture to have reset graphs.graphs due to our conftest change

def test_get_graphs_empty(client):
    response = client.get("/api/graphs/")
    assert response.status_code == 200
    assert response.json() == []

def test_create_graph(client):
    response = client.post("/api/graphs/", json={"name": "NewGraph"})
    assert response.status_code == 200
    # The API currently returns null/None for this endpoint based on code inspection,
    # or it might return the result of append which is None. 
    # Let's check the side effect.
    assert len(graphs.graphs) == 1
    assert graphs.graphs[0].name == "NewGraph"

def test_get_graphs_populated(client):
    client.post("/api/graphs/", json={"name": "G1"})
    client.post("/api/graphs/", json={"name": "G2"})
    
    response = client.get("/api/graphs/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "G1"
    assert data[1]["name"] == "G2"

def test_get_graph_by_id(client):
    client.post("/api/graphs/", json={"name": "TargetGraph"})
    
    # ID is index based
    response = client.get("/api/graphs/0")
    assert response.status_code == 200
    assert response.json()["name"] == "TargetGraph"

def test_get_graph_by_id_not_found(client):
    response = client.get("/api/graphs/999")
    # Using json() directly might fail if return is null or empty.
    # The code returns None if not found, which FastAPI converts to null JSON (valid).
    assert response.status_code == 200
    assert response.json() is None

def test_create_node(client):
    client.post("/api/graphs/", json={"name": "NodeGraph"})
    graph_id = 0
    
    response = client.post(f"/api/graphs/{graph_id}/nodes", json={"name": "Node1", "category": "TestCat"})
    assert response.status_code == 200
    
    # Verify via API
    nodes_resp = client.get(f"/api/graphs/{graph_id}/nodes")
    assert nodes_resp.status_code == 200
    nodes = nodes_resp.json()
    assert len(nodes) == 1
    assert nodes[0]["name"] == "Node1"
    assert nodes[0]["category"] == "TestCat"

def test_update_all_nodes(client):
    # Setup graph with node
    client.post("/api/graphs/", json={"name": "UpdateGraph"})
    client.post("/api/graphs/0/nodes", json={"name": "N1"})
    
    # Update
    payload = {
        "nodes": [
            {"name": "N1", "position_x": 100, "position_y": 200}
        ]
    }
    response = client.patch("/api/graphs/0/nodes", json=payload)
    assert response.status_code == 200
    
    # Verify
    nodes_resp = client.get("/api/graphs/0/nodes")
    node = nodes_resp.json()[0]
    assert node["position_x"] == 100
    assert node["position_y"] == 200

def test_create_edge(client):
    client.post("/api/graphs/", json={"name": "EdgeGraph"})
    client.post("/api/graphs/0/nodes", json={"name": "A"})
    client.post("/api/graphs/0/nodes", json={"name": "B"})
    
    response = client.post("/api/graphs/0/edges", json={"start_node": "A", "end_node": "B"})
    assert response.status_code == 200
    
    edges_resp = client.get("/api/graphs/0/edges")
    assert edges_resp.status_code == 200
    edges = edges_resp.json()
    assert len(edges) == 1
    assert edges[0]["start"]["name"] == "A"
    assert edges[0]["end"]["name"] == "B"

def test_create_edge_invalid_nodes(client):
    client.post("/api/graphs/", json={"name": "EdgeGraphFail"})
    response = client.post("/api/graphs/0/edges", json={"start_node": "X", "end_node": "Y"})
    assert response.status_code == 200
    # Code returns string "Node names incorrect" on failure
    assert response.json() == "Node names incorrect"
