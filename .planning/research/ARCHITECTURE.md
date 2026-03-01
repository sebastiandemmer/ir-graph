# Architecture Patterns: IR-Graph-2 MCP Integration

**Domain:** Graph Ecosystem
**Researched:** 2024-05-24

## Recommended Architecture

The system will follow a standard MCP server architecture where the `mcp_app.py` acts as a protocol layer over the existing domain logic.

```mermaid
graph TD
    Client[LLM Client (e.g., Claude)] <-->|stdio| MCP_Server[src/mcp_app.py]
    MCP_Server <-->|API| GraphLogic[src/irgraph/Graphs.py]
    GraphLogic <-->|JSON| Storage[src/data/graphs.json]
    Web_App[src/http_app] <-->|API| GraphLogic
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `mcp_app.py` | Defines Tools & Resources; protocol translation. | LLM Client, `Graphs.py` |
| `Graphs.py` | Centralized graph manager; persistence logic. | `Graph.py`, `mcp_app.py`, `http_app` |
| `Graph.py` | Entity logic for nodes and edges. | `Graphs.py` |
| `graphs.json` | Persistent state. | `Graphs.py` |

### Data Flow

1.  **Request:** LLM calls `add_node(graph_id=0, name="Server-1")`.
2.  **Logic:** `mcp_app.py` receives the call and invokes `graphs_manager.get_graph_by_id(0).add_node(Node(name="Server-1"))`.
3.  **Persistence:** `mcp_app.py` calls `graphs_manager.save_to_json()` to ensure durability.
4.  **Response:** `mcp_app.py` returns success string to LLM.

## Patterns to Follow

### Pattern 1: Tool Atomic Mutations
Each MCP tool should map to a single logical operation. This improves LLM accuracy.
**What:** `add_node`, `delete_edge` etc.
**When:** For any write operation.
**Example:**
```python
@mcp.tool()
def rename_graph(graph_id: int, new_name: str) -> str:
    """Renames an existing graph."""
    if graphs_manager.update_graph_name(graph_id, new_name):
        graphs_manager.save_to_json()
        return f"Graph renamed to {new_name}"
    return "Failed to rename graph."
```

### Pattern 2: Contextual Resources
Expose full state as resources to help the LLM maintain "situational awareness."
**What:** `graph://{id}` URI.
**When:** For reading data before making edits.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Implicit Persistence
**What:** Expecting changes to automatically persist.
**Why bad:** MCP servers are transient; if they crash or restart between calls, state is lost.
**Instead:** Call `save_to_json()` (or equivalent) after every successful mutation tool call.

## Scalability Considerations

| Concern | At 10 graphs | At 1000 graphs | At 1M graphs |
|---------|--------------|---------------|--------------|
| File I/O | Negligible | Slow saves | Major bottleneck |
| LLM Context| Fits easily | Needs filtering | Impossible without RAG |
| Response Time| Sub-second | Slower (parsing) | High (latency) |

**Recommendation:** For 1M+ nodes/graphs, transition from JSON to a real graph database (Neo4j) or indexed SQLite.
