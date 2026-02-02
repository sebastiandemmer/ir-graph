import pytest

def test_api_create_and_delete_graph(client):
    # Create graph
    response = client.post("/api/graphs/", json={"name": "APIDeleteTest"})
    assert response.status_code == 200
    
    # Get all graphs to find the ID (it should be the last one)
    response = client.get("/api/graphs/")
    graphs = response.json()
    graph_id = len(graphs) - 1
    assert graphs[graph_id]["name"] == "APIDeleteTest"
    
    # Delete graph
    response = client.delete(f"/api/graphs/{graph_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Graph deleted"
    
    # Verify deleted - conftest mock resets for each test, but here we are in same test.
    # Actually conftest mock resets graphs = [] for EACH test invocation.
    # So we don't need to worry about existing data.
    response = client.get("/api/graphs/")
    new_graphs = response.json()
    assert len(new_graphs) == 0

def test_api_edge_operations(client):
    # Setup: Create a graph and nodes
    client.post("/api/graphs/", json={"name": "EdgeOpTest"})
    response = client.get("/api/graphs/")
    graph_data = response.json()
    graph_id = 0 # Fresh mock in conftest starts with empty graphs = []
    
    client.post(f"/api/graphs/{graph_id}/nodes", json={"name": "A"})
    client.post(f"/api/graphs/{graph_id}/nodes", json={"name": "B"})
    
    # Create Edge
    client.post(f"/api/graphs/{graph_id}/edges", json={"start_node": "A", "end_node": "B", "description": "Original"})
    
    # Update Edge
    response = client.patch(f"/api/graphs/{graph_id}/edges", json={"start_node": "A", "end_node": "B", "description": "Updated"})
    assert response.status_code == 200
    
    # Verify update
    response = client.get(f"/api/graphs/{graph_id}")
    graph_data = response.json()
    assert graph_data["edges"][0]["description"] == "Updated"
    
    # Delete Edge
    response = client.delete(f"/api/graphs/{graph_id}/edges?start_node=A&end_node=B")
    assert response.status_code == 200
    
    # Verify deletion
    response = client.get(f"/api/graphs/{graph_id}")
    assert len(response.json()["edges"]) == 0
