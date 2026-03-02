import httpx
from typing import Optional, Dict, Any

class IRGraphClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.client = httpx.AsyncClient(base_url=self.base_url)

    async def get_graph(self, graph_id: int) -> Optional[Dict[str, Any]]:
        try:
            response = await self.client.get(f"/api/graphs/{graph_id}")
            if response.status_code == 200:
                return response.json()
            return None
        except httpx.ConnectError:
            raise RuntimeError("IR Graph API unreachable")

    async def list_graphs(self) -> list[Dict[str, Any]]:
        try:
            response = await self.client.get("/api/graphs/")
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError:
            raise RuntimeError("IR Graph API unreachable")

    async def create_graph(self, name: str) -> Dict[str, Any]:
        if not name.strip().endswith("(agent)"):
            name = f"{name.strip()} (agent)"
        try:
            # Current API endpoint for creating a graph is POST /api/graphs/
            response = await self.client.post("/api/graphs/", json={"name": name})
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError:
            raise RuntimeError("IR Graph API unreachable")

    async def add_node(self, graph_id: int, node_data: Dict[str, Any]):
        try:
            response = await self.client.post(f"/api/graphs/{graph_id}/nodes", json=node_data)
            response.raise_for_status()
        except httpx.ConnectError:
            raise RuntimeError("IR Graph API unreachable")

    async def add_edge(self, graph_id: int, edge_data: Dict[str, Any]):
        try:
            response = await self.client.post(f"/api/graphs/{graph_id}/edges", json=edge_data)
            response.raise_for_status()
        except httpx.ConnectError:
            raise RuntimeError("IR Graph API unreachable")

    async def update_node(self, graph_id: int, node_id: str, node_data: Dict[str, Any]):
        try:
            # Assuming PATCH /api/graphs/{graph_id}/nodes/{node_id} for updates
            response = await self.client.patch(f"/api/graphs/{graph_id}/nodes/{node_id}", json=node_data)
            response.raise_for_status()
        except httpx.ConnectError:
            raise RuntimeError("IR Graph API unreachable")

    async def delete_node(self, graph_id: int, node_id: str):
        try:
            # Assuming DELETE /api/graphs/{graph_id}/nodes?node_name={node_id}
            response = await self.client.delete(f"/api/graphs/{graph_id}/nodes", params={"node_name": node_id})
            response.raise_for_status()
        except httpx.ConnectError:
            raise RuntimeError("IR Graph API unreachable")

    async def get_blast_radius(self, graph_id: int, node_name: str) -> Dict[str, Any]:
        try:
            response = await self.client.get(f"/api/graphs/{graph_id}/blast-radius/{node_name}")
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError:
            raise RuntimeError("IR Graph API unreachable")

    async def is_agent_owned(self, graph_id: int) -> bool:
        graph = await self.get_graph(graph_id)
        if graph and "(agent)" in graph.get("name", ""):
            return True
        return False

    async def close(self):
        await self.client.aclose()
