from mcp.server.fastmcp import FastMCP
from src.mcp_client import IRGraphClient
import argparse
import asyncio
import sys
import json

# Initialize FastMCP instance named "IR-Graph"
mcp = FastMCP("IR-Graph")

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

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IR-Graph MCP Server")
    parser.add_argument("--api-url", default="http://localhost:8000", help="Base URL for the IR Graph API")
    args = parser.parse_args()
    
    # Configure client
    get_client(args.api_url)
    
    # Run the server
    mcp.run()
