# Feature Landscape: IR-Graph-2 MCP

**Domain:** MCP-enabled Graph Management
**Researched:** 2024-05-24

## Table Stakes
Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `list_graphs` Tool | To see available graphs. | Low | Simple wrapper around `Graphs.graphs`. |
| `get_graph` Resource | For context-filling (LLM "seeing" the graph). | Low | Use URI `graph://{id}`. |
| `add_node` Tool | Basic graph building. | Low | Map to `Graph.add_node`. |
| `add_edge` Tool | Basic graph building. | Low | Map to `Graph.add_edge_by_node_names`. |

## Differentiators
Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `search_graph` Tool | Quick lookup in large graphs. | Med | Fuzzy search on node names/categories. |
| `update_positions` Tool| Layout optimization via LLM. | Med | Allow LLM to suggest `x,y` coordinates. |
| `bulk_import` Prompt | Specialized instructions for graph building. | Low | Pre-defined prompt templates. |
| **`find_lateral_movement`** | **Automated pathfinding for IR.** | **High** | **Requires Dijkstra or BFS.** |
| **`get_blast_radius`** | **Impact assessment via graph traversal.** | **Med** | **Reachability analysis.** |
| **`summarize_timeline`**| **Automated incident reporting.** | **Med** | **Sort edges by timestamp metadata.** |

## Anti-Features
Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Direct File Edit Tool | Security risk and error-prone. | Use high-level `Graphs` API. |
| Real-time WebSocket | Overkill for initial MCP. | Rely on `stdio` transport. |

## Feature Dependencies
```
list_graphs → get_graph → add_node → add_edge
get_graph → find_lateral_movement
get_graph → get_blast_radius
```

## MVP Recommendation
Prioritize:
1. `list_graphs` (Discovery)
2. `get_graph` (Inspection)
3. `add_node` / `add_edge` (Modification)
4. Persistence (Autosave after tool calls)
5. **`get_blast_radius` (High IR value for low relative complexity)**

Defer: Multi-user features, complex layout algorithms.
