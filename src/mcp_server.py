from mcp.server.fastmcp import FastMCP
from src.mcp_client import IRGraphClient
import argparse
import asyncio
import sys
import json
import logging

# Configure logging to file and stderr
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("mcp_server.log"),
        logging.StreamHandler(sys.stderr)
    ]
)
logger = logging.getLogger("mcp-server")

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
    logger.info(f"Fetching resource for graph {graph_id}")
    c = get_client()
    try:
        graph = await c.get_graph(graph_id)
    except Exception as e:
        logger.error(f"Error fetching graph {graph_id}: {str(e)}")
        return f"Error: {str(e)}. Please ensure the web server is running."
    
    if not graph:
        logger.warning(f"Graph {graph_id} not found.")
        return f"Error: Graph {graph_id} not found."
    return json.dumps(graph, indent=2)

@mcp.tool()
async def create_graph(name: str) -> str:
    """Creates a new graph. The name will automatically include '(agent)'."""
    logger.info(f"Creating graph: {name}")
    c = get_client()
    try:
        graph = await c.create_graph(name)
        return f"Graph created successfully: {json.dumps(graph, indent=2)}"
    except Exception as e:
        logger.error(f"Error creating graph {name}: {str(e)}")
        return f"Error: {str(e)}"

@mcp.tool()
async def add_node(graph_id: int, name: str, category: str = "Default", description: str = None) -> str:
    """Adds a new node to an agent-owned graph."""
    logger.info(f"Adding node '{name}' to graph {graph_id}")
    c = get_client()
    try:
        if not await c.is_agent_owned(graph_id):
            logger.warning(f"Permission denied for adding node to graph {graph_id}")
            return "Permission Denied: AI agents can only modify graphs containing '(agent)' in their name."
        
        node_data = {"name": name, "category": category, "description": description}
        await c.add_node(graph_id, node_data)
        return f"Node '{name}' added successfully to graph {graph_id}."
    except Exception as e:
        logger.error(f"Error adding node to graph {graph_id}: {str(e)}")
        return f"Error: {str(e)}"

@mcp.tool()
async def add_edge(graph_id: int, source_node: str, target_node: str, description: str = None) -> str:
    """Adds a new edge between two nodes in an agent-owned graph."""
    logger.info(f"Adding edge from '{source_node}' to '{target_node}' in graph {graph_id}")
    c = get_client()
    try:
        if not await c.is_agent_owned(graph_id):
            logger.warning(f"Permission denied for adding edge to graph {graph_id}")
            return "Permission Denied: AI agents can only modify graphs containing '(agent)' in their name."
        
        edge_data = {"start_node": source_node, "end_node": target_node, "description": description}
        await c.add_edge(graph_id, edge_data)
        return f"Edge from '{source_node}' to '{target_node}' added successfully to graph {graph_id}."
    except Exception as e:
        logger.error(f"Error adding edge to graph {graph_id}: {str(e)}")
        return f"Error: {str(e)}"

@mcp.tool()
async def update_node(graph_id: int, node_name: str, new_name: str = None, category: str = "Default", description: str = None) -> str:
    """Updates an existing node in an agent-owned graph."""
    logger.info(f"Updating node '{node_name}' in graph {graph_id}")
    c = get_client()
    try:
        if not await c.is_agent_owned(graph_id):
            logger.warning(f"Permission denied for updating node in graph {graph_id}")
            return "Permission Denied: AI agents can only modify graphs containing '(agent)' in their name."
        
        node_data = {
            "name": new_name if new_name else node_name,
            "category": category,
            "description": description
        }
        await c.update_node(graph_id, node_name, node_data)
        return f"Node '{node_name}' updated successfully in graph {graph_id}."
    except Exception as e:
        logger.error(f"Error updating node in graph {graph_id}: {str(e)}")
        return f"Error: {str(e)}"

@mcp.tool()
async def delete_node(graph_id: int, node_name: str) -> str:
    """Deletes a node from an agent-owned graph."""
    logger.info(f"Deleting node '{node_name}' from graph {graph_id}")
    c = get_client()
    try:
        if not await c.is_agent_owned(graph_id):
            logger.warning(f"Permission denied for deleting node from graph {graph_id}")
            return "Permission Denied: AI agents can only modify graphs containing '(agent)' in their name."
        
        await c.delete_node(graph_id, node_name)
        return f"Node '{node_name}' deleted successfully from graph {graph_id}."
    except Exception as e:
        logger.error(f"Error deleting node from graph {graph_id}: {str(e)}")
        return f"Error: {str(e)}"

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IR-Graph MCP Server")
    parser.add_argument("--api-url", default="http://localhost:8000", help="Base URL for the IR Graph API")
    args = parser.parse_args()
    
    # Configure client
    get_client(args.api_url)
    
    logger.info(f"Starting MCP server in stdio mode (API URL: {args.api_url})")
    
    # Run the server
    mcp.run()
