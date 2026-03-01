import pytest
import respx
import httpx
from src.mcp_client import IRGraphClient

BASE_URL = "http://localhost:8000"

@pytest.fixture
def mcp_client():
    return IRGraphClient(base_url=BASE_URL)

@respx.mock
@pytest.mark.asyncio
async def test_get_graph_success(mcp_client):
    graph_id = 1
    graph_data = {"id": graph_id, "name": "Test Graph"}
    respx.get(f"{BASE_URL}/api/graphs/{graph_id}").mock(return_value=httpx.Response(200, json=graph_data))
    
    result = await mcp_client.get_graph(graph_id)
    assert result == graph_data

@respx.mock
@pytest.mark.asyncio
async def test_get_graph_not_found(mcp_client):
    graph_id = 999
    respx.get(f"{BASE_URL}/api/graphs/{graph_id}").mock(return_value=httpx.Response(404))
    
    result = await mcp_client.get_graph(graph_id)
    assert result is None

@respx.mock
@pytest.mark.asyncio
async def test_create_graph_appends_agent_suffix(mcp_client):
    graph_name = "New Graph"
    expected_name = "New Graph (agent)"
    respx.post(f"{BASE_URL}/api/graphs/").mock(return_value=httpx.Response(201, json={"id": 1, "name": expected_name}))
    
    await mcp_client.create_graph(graph_name)
    
    # Verify the sent name had the suffix
    assert respx.calls.last.request.content.decode().replace(" ", "") == f'{{"name":"{expected_name}"}}'.replace(" ", "")

@respx.mock
@pytest.mark.asyncio
async def test_create_graph_no_double_suffix(mcp_client):
    graph_name = "New Graph (agent)"
    respx.post(f"{BASE_URL}/api/graphs/").mock(return_value=httpx.Response(201, json={"id": 1, "name": graph_name}))
    
    await mcp_client.create_graph(graph_name)
    
    # Verify the sent name did not have a double suffix
    assert respx.calls.last.request.content.decode().replace(" ", "") == f'{{"name":"{graph_name}"}}'.replace(" ", "")

@respx.mock
@pytest.mark.asyncio
async def test_is_agent_owned(mcp_client):
    graph_id = 1
    respx.get(f"{BASE_URL}/api/graphs/{graph_id}").mock(return_value=httpx.Response(200, json={"name": "Test (agent)"}))
    assert await mcp_client.is_agent_owned(graph_id) is True
    
    graph_id = 2
    respx.get(f"{BASE_URL}/api/graphs/{graph_id}").mock(return_value=httpx.Response(200, json={"name": "Test"}))
    assert await mcp_client.is_agent_owned(graph_id) is False

@respx.mock
@pytest.mark.asyncio
async def test_add_node(mcp_client):
    graph_id = 1
    node_data = {"name": "Node1", "category": "Host"}
    respx.post(f"{BASE_URL}/api/graphs/{graph_id}/nodes").mock(return_value=httpx.Response(201))
    
    await mcp_client.add_node(graph_id, node_data)
    assert respx.calls.last.request.method == "POST"

@respx.mock
@pytest.mark.asyncio
async def test_add_edge(mcp_client):
    graph_id = 1
    edge_data = {"start_node": "Node1", "end_node": "Node2", "description": "Link"}
    respx.post(f"{BASE_URL}/api/graphs/{graph_id}/edges").mock(return_value=httpx.Response(201))
    
    await mcp_client.add_edge(graph_id, edge_data)
    assert respx.calls.last.request.method == "POST"

@respx.mock
@pytest.mark.asyncio
async def test_update_node(mcp_client):
    graph_id = 1
    node_id = "Node1"
    node_data = {"name": "Node1-Updated"}
    # Mapping to actual API endpoint (PATCH)
    respx.patch(f"{BASE_URL}/api/graphs/{graph_id}/nodes/{node_id}").mock(return_value=httpx.Response(200))
    
    await mcp_client.update_node(graph_id, node_id, node_data)
    assert respx.calls.last.request.method == "PATCH"

@respx.mock
@pytest.mark.asyncio
async def test_delete_node(mcp_client):
    graph_id = 1
    node_id = "Node1"
    # Mapping to actual API endpoint (DELETE with query param)
    respx.delete(f"{BASE_URL}/api/graphs/{graph_id}/nodes?node_name={node_id}").mock(return_value=httpx.Response(200))
    
    await mcp_client.delete_node(graph_id, node_id)
    assert respx.calls.last.request.method == "DELETE"

@respx.mock
@pytest.mark.asyncio
async def test_unreachable_api_raises_runtime_error(mcp_client):
    respx.get(f"{BASE_URL}/api/graphs/1").side_effect = httpx.ConnectError("Connection refused")
    
    with pytest.raises(RuntimeError, match="IR Graph API unreachable"):
        await mcp_client.get_graph(1)
