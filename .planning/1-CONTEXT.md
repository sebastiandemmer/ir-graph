# Context: Phase 1 - MCP Server Foundation & Integration

## Code Context
- **Core Persistence:** The system currently uses `src/irgraph/Graphs.py` to manage a list of `Graph` objects, persisting them to `src/data/graphs.json`.
- **API Surface:** FastAPI routes in `src/http_app/routes/` handle CRUD operations.
- **MCP Implementation:** We will use the `mcp-python-sdk` (`FastMCP`) to build the server.

## Decisions

### 1. AI Agent Capabilities & Data Visibility
- **Full Transparency:** The agent MUST have access to the full raw state of the graph, including UI-specific layout coordinates (`position_x`, `position_y`), to allow for spatial reasoning.
- **Restricted Ownership:**
    - The agent can create new graphs and modify existing ones.
    - **Naming Convention:** Every graph created by the agent MUST have `(agent)` appended to its name (e.g., `Investigation #42 (agent)`).
    - **Modification Guardrail:** The agent is ONLY permitted to modify or delete nodes/edges in graphs that contain `(agent)` in their name.
- **API Consistency:** ALL interactions from the MCP server (read or write) MUST be routed through the existing FastAPI HTTP REST API. This ensures the MCP server and Web UI behave identically and share the same validation logic.

### 2. Entity Modeling for Agents
- **Generic Metadata:** The agent will have direct read/write access to a generic `metadata` blob on nodes and edges. This allows for maximum flexibility in storing IR-specific attributes (IPs, hashes, etc.) without requiring hardcoded schema changes in Phase 1.

### 3. Standalone Execution & CLI
- **Execution Assumption:** The MCP server (`stdio` transport) will assume the FastAPI web server is already running.
- **Error Handling:** If the web server is unreachable, the MCP server must return a clear error message to the client (e.g., "Error: IR Graph API unreachable at http://localhost:8000. Please ensure the web server is running.").
- **Access Control:** No authentication is required for Phase 1 as the tool is designed for local-only use.
- **Logging:**
    - All server-side logs and errors MUST be directed to both a dedicated log file (e.g., `mcp_server.log`) and `stderr`.
    - `stdout` must be kept strictly reserved for the MCP protocol to avoid breaking the connection.
- **CLI Configuration:** The standalone entry point (`src/mcp_server.py`) must support a `--api-url` flag to allow overriding the base URL of the FastAPI app (defaulting to `http://localhost:8000`).

## Technical Strategy
- Implement a thin MCP wrapper that uses `httpx` (or similar) to communicate with the FastAPI backend.
- Use `FastMCP` decorators to define tools (`add_node`, `add_edge`, `delete_node`, etc.) that perform the appropriate REST calls.
- Expose the `graph://{graph_id}` resource by fetching the graph JSON from the `/api/graphs/{id}` endpoint.
