# Requirements - IR Graph MCP Integration

## Functional Requirements

### 1. Persistence Migration (SQLite)
-   **R1.1:** Design and implement a SQLite schema for storing nodes, edges, and graph metadata.
-   **R1.2:** Implement a `GraphRepository` to handle all CRUD operations for the graph.
-   **R1.3:** Create a migration script to transition existing data from `graphs.json` to the new SQLite database.
-   **R1.4:** Update the FastAPI backend to use the SQLite repository instead of JSON file persistence.

### 2. MCP Server Foundation
-   **R2.1:** Implement an MCP server using the `mcp` Python SDK (specifically `FastMCP`).
-   **R2.2:** Expose a read-only **Resource** (`graph://{graph_id}`) to provide the full graph state to the LLM.
-   **R2.3:** Implement basic **Tools** for graph manipulation:
    -   `add_node(graph_id, name, type, metadata)`
    -   `add_edge(graph_id, source_id, target_id, type, metadata)`
    -   `update_node(graph_id, node_id, updates)`
    -   `delete_node(graph_id, node_id)`
-   **R2.4:** Ensure all MCP tool calls persist changes to the SQLite database.

### 3. FastAPI & MCP Integration
-   **R3.1:** Mount the MCP server's HTTP/SSE app into the existing FastAPI application (`http_app`).
-   **R3.2:** Provide a standalone CLI entry point (`src/mcp_server.py`) for `stdio` transport, usable by desktop clients like Claude Desktop.
-   **R3.3:** Ensure thread-safe access to the SQLite database from both the Web UI (FastAPI) and MCP server.

### 4. Advanced IR Tools (Phase 3+)
-   **R4.1:** Integrate `NetworkX` for advanced graph algorithm support.
-   **R4.2:** Implement a high-value tool: `get_blast_radius(graph_id, node_id)` to identify all reachable nodes from a given starting point.
-   **R4.3:** Implement a tool: `find_lateral_movement(graph_id, source_id, target_id)` to identify potential attack paths.
-   **R4.4:** Implement a tool: `summarize_timeline(graph_id)` to chronologically sort and describe incident edges.

## Non-Functional Requirements
-   **N1.1 Performance:** SQLite queries for graph traversals should be optimized using appropriate indexing and recursive CTEs if necessary.
-   **N1.2 Reliability:** Database operations must be atomic to prevent state corruption during concurrent access.
-   **N1.3 Usability:** MCP tool descriptions should be clear and concise to guide LLMs in effectively using the graph.
-   **N1.4 Extensibility:** The schema should use JSON columns for metadata to support diverse IR entity types (IPs, hashes, etc.) without frequent schema changes.
