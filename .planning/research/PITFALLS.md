# Domain Pitfalls: IR-Graph-2 MCP

**Domain:** Graph Ecosystem
**Researched:** 2024-05-24

## Critical Pitfalls
Mistakes that cause rewrites or major issues.

### Pitfall 1: State Loss on Restart
**What goes wrong:** Mutations are applied only in-memory, and the server is restarted by the client.
**Why it happens:** MCP servers are often started on-demand (`stdio`) and shut down when inactive.
**Prevention:** Call `graphs_manager.save_to_json()` after every tool that modifies the graph.

### Pitfall 2: Confusing Node/Edge Identifiers
**What goes wrong:** LLM tries to use name as ID where ID is expected, or vice versa.
**Why it happens:** LLMs are often inconsistent with string names vs numeric IDs.
**Prevention:** Prefer unique string names for nodes (as the current `Graph` class does) and use clear, descriptive parameter names (`node_name` instead of `id`).

## Moderate Pitfalls

### Pitfall 1: Incomplete Context
**What goes wrong:** LLM suggests `add_edge("A", "B")` but "B" doesn't exist.
**Why it happens:** LLM doesn't "see" the current state before suggesting edits.
**Prevention:** Provide a `get_graph` resource and ensure the LLM reads it before performing mutations.

### Pitfall 2: Overly Broad Tools
**What goes wrong:** A tool like `update_graph(full_json)` is provided.
**Why it happens:** Attempting to simplify the server API.
**Consequences:** LLM frequently hallucinated or provides malformed JSON.
**Prevention:** Provide atomic tools (`add_node`, `add_edge`, `move_node`).

## Minor Pitfalls

### Pitfall 1: Version Mismatch in Transport
**What goes wrong:** MCP SDK version in server differs from client.
**Prevention:** Use standard libraries and follow official MCP release notes.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Discovery | Incorrect Tool Schema | Use `FastMCP`'s automatic schema generation from docstrings. |
| Manipulation| Dangling Edges | Validate that both `start` and `end` nodes exist before adding an edge. |
| Persistence | Concurrent Writes | The current JSON-based approach doesn't handle concurrent writes well if multiple MCP servers are run against the same file. Use locking if needed. |

## Sources
- [MCP Discussion Forum](https://github.com/modelcontextprotocol/python-sdk/discussions)
- [Personal Research/Codebase Analysis]
