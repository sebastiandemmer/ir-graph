# MCP Python SDK Research

**Target:** Implementation of an MCP server for graph manipulation.
**Date:** 2024-05-24
**Confidence:** HIGH (Based on official documentation and community patterns)

## Core Library: FastMCP

The `mcp` Python SDK provides a high-level framework called `FastMCP` that significantly simplifies server implementation. It uses decorators to define MCP primitives (Tools, Resources, Prompts).

### Installation
```bash
uv add "mcp[cli]"
```

## 1. Defining Tools (Graph Manipulation)

Tools are the primary way for an LLM to perform actions. In our case, these will map to `Graph` and `Graphs` methods.

### Pattern: Mutation Tools
Tools should have clear docstrings as they are used by the LLM to understand the tool's purpose and parameters.

```python
from mcp.server.fastmcp import FastMCP
from irgraph.Graphs import Graphs

mcp = FastMCP("IR-Graph")
graphs_manager = Graphs()
graphs_manager.load_from_json()

@mcp.tool()
def add_node(graph_id: int, name: str, category: str = "generic") -> str:
    """
    Adds a new node to the specified graph.
    :param graph_id: The ID of the graph to modify.
    :param name: Unique name for the node.
    :param category: Optional category (e.g., 'server', 'user', 'database').
    """
    graph = graphs_manager.get_graph_by_id(graph_id)
    if not graph:
        return f"Error: Graph {graph_id} not found."
    
    # Logic to add node using existing Graph class
    # ...
    return f"Node '{name}' added to graph {graph_id}."

@mcp.tool()
def delete_node(graph_id: int, name: str) -> str:
    """Deletes a node and its associated edges from the graph."""
    # ...
    return f"Node '{name}' deleted."
```

### Supported Types
`FastMCP` uses Python type hints to generate JSON Schema for the tool parameters. Supported types include:
- `str`, `int`, `float`, `bool`
- `list` and `dict` (for complex structures)
- Pydantic models (for structured input/output)

## 2. Defining Resources (Read-Only Data)

Resources allow the LLM to "read" state. They are identified by URIs.

### Pattern: Graph Resources
Use dynamic URIs to expose specific graphs or components.

```python
@mcp.resource("graph://{graph_id}")
def get_graph(graph_id: int) -> str:
    """Returns the full JSON representation of a graph."""
    graph = graphs_manager.get_graph_by_id(graph_id)
    if not graph:
        return "Graph not found."
    return json.dumps(graph.toJSON())

@mcp.resource("graphs://list")
def list_graphs() -> str:
    """Returns a list of all available graphs."""
    return json.dumps([{"id": i, "name": g.name} for i, g in enumerate(graphs_manager.graphs)])
```

## 3. Server Lifecycle & Transport

### Standard Transport (stdio)
For local integration (e.g., Claude Desktop), the server communicates via standard input/output.

```python
if __name__ == "__main__":
    mcp.run(transport="stdio")
```

### Persistence Considerations
Since MCP servers are often started on-demand by the client, they should ideally:
1. Load state on startup (`graphs_manager.load_from_json()`).
2. Save state after mutations if persistent changes are expected.

## 4. Development & Debugging

### MCP Inspector
The SDK includes a debugger to test tools/resources without a full client.
```bash
npx @modelcontextprotocol/inspector python src/mcp_server.py
```

## Recommendations for ir-graph-2
1. **Integrate with `Graphs` class**: Create a new entry point `src/mcp_app.py` that initializes `FastMCP` and wraps the `Graphs` instance.
2. **Tool Granularity**: Provide fine-grained tools (`add_node`, `add_edge`, `update_node_position`) rather than one giant `update_graph` tool. This allows the LLM to be more precise.
3. **Resource Context**: Expose the current graph as a resource so the LLM can "see" the entire state before making changes.
