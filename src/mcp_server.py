from mcp.server.fastmcp import FastMCP
from .mcp_client import IRGraphClient
import argparse
import asyncio
import sys

# Initialize FastMCP instance named "IR-Graph"
mcp = FastMCP("IR-Graph")

# Global client placeholder
client = None

def get_client(api_url: str = "http://localhost:8000"):
    global client
    if client is None:
        client = IRGraphClient(api_url)
    return client

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IR-Graph MCP Server")
    parser.add_argument("--api-url", default="http://localhost:8000", help="Base URL for the IR Graph API")
    args = parser.parse_args()
    
    # Configure client
    get_client(args.api_url)
    
    # Run the server
    mcp.run()
