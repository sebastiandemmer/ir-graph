from mcp.server.fastmcp import FastMCP
from src.mcp_client import IRGraphClient
import argparse
import asyncio
import sys
import json

# Initialize FastMCP instance named "IR-Graph"
mcp = FastMCP("IR-Graph", dependencies=["httpx"])

# Global client placeholder
client = None

def get_client(api_url: str = "http://localhost:8000"):
    global client
    if client is None:
        from src.mcp_client import IRGraphClient
        client = IRGraphClient(api_url)
    return client

@mcp.resource("graph://{graph_id}")
async def get_graph_resource(graph_id: int) -> str:
    """Returns the full state of the specified graph."""
    c = get_client()
    try:
        graph = await c.get_graph(graph_id)
    except RuntimeError as e:
        return f"Error: {str(e)}. Please ensure the web server is running."
    
    if not graph:
        return f"Error: Graph {graph_id} not found."
    return json.dumps(graph, indent=2)

@mcp.tool()
async def create_graph(name: str) -> str:
    """Creates a new graph. The name will automatically include '(agent)'."""
    c = get_client()
    try:
        graph = await c.create_graph(name)
        return f"Graph created successfully: {json.dumps(graph, indent=2)}"
    except RuntimeError as e:
        return f"Error: {str(e)}"

@mcp.tool()
async def add_node(graph_id: int, name: str, category: str = "Default", description: str = None) -> str:
    """Adds a new node to an agent-owned graph."""
    c = get_client()
    try:
        if not await c.is_agent_owned(graph_id):
            return "Permission Denied: AI agents can only modify graphs containing '(agent)' in their name."
        
        node_data = {"name": name, "category": category, "description": description}
        await c.add_node(graph_id, node_data)
        return f"Node '{name}' added successfully to graph {graph_id}."
    except RuntimeError as e:
        return f"Error: {str(e)}"

@mcp.tool()
async def add_edge(graph_id: int, source_node: str, target_node: str, description: str = None) -> str:
    """Adds a new edge between two nodes in an agent-owned graph."""
    c = get_client()
    try:
        if not await c.is_agent_owned(graph_id):
            return "Permission Denied: AI agents can only modify graphs containing '(agent)' in their name."
        
        edge_data = {"start_node": source_node, "end_node": target_node, "description": description}
        await c.add_edge(graph_id, edge_data)
        return f"Edge from '{source_node}' to '{target_node}' added successfully to graph {graph_id}."
    except RuntimeError as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IR-Graph MCP Server")
    parser.add_argument("--api-url", default="http://localhost:8000", help="Base URL for the IR Graph API")
    args = parser.parse_args()
    
    # Configure client
    get_client(args.api_url)
    
    # Run the server
    mcp.run()
