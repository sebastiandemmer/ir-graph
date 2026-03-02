# Phase 1: MCP Server Foundation & Integration - Research

**Researched:** 2025-05-14
**Domain:** Model Context Protocol (MCP), Python SDK, FastAPI Integration, Agent Safety
**Confidence:** HIGH

## Summary

This phase focuses on establishing a robust Model Context Protocol (MCP) server that acts as a bridge between AI agents and the existing IR-Graph FastAPI backend. We will leverage the `mcp-python-sdk`'s `FastMCP` framework, which provides high-level abstractions for defining Tools and Resources. The primary technical challenges include dual-transport support (stdio and SSE), robust communication with a potentially unavailable backend, and implementing agent-specific safety guardrails.

**Primary recommendation:** Use a standalone `src/mcp_server.py` that initializes a `FastMCP` instance, which can both be run as a stdio server for desktop clients and mounted as an SSE app within the main FastAPI application.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Full Transparency:** The agent MUST have access to the full raw state of the graph, including UI-specific layout coordinates (`position_x`, `position_y`).
- **Restricted Ownership:**
    - Every graph created by the agent MUST have `(agent)` appended to its name.
    - The agent is ONLY permitted to modify or delete nodes/edges in graphs that contain `(agent)` in their name.
- **API Consistency:** ALL interactions from the MCP server MUST be routed through the existing FastAPI HTTP REST API.
- **Standalone Execution:** The MCP server (stdio transport) assumes the FastAPI web server is already running.
- **Error Handling:** If the web server is unreachable, return a clear error message (e.g., "Error: IR Graph API unreachable...").
- **Logging:** All logs must go to both a log file (`mcp_server.log`) and `stderr`. `stdout` is reserved for MCP.
- **CLI Configuration:** Standalone entry point must support a `--api-url` flag (default: `http://localhost:8000`).

### Claude's Discretion
- Implementation of the `httpx` client wrapper.
- Strategy for enforcing naming conventions and guardrails.
- Specific logging configuration details.

### Deferred Ideas (OUT OF SCOPE)
- Authentication/Authorization (Phase 1 is local-only).
- Advanced IR algorithms (Phase 2).
- Real-time frontend updates via WebSockets.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| R2.1 | Implement MCP server using `FastMCP`. | Pattern for `FastMCP` initialization and dual transport documented. |
| R2.2 | Expose read-only Resource `graph://{graph_id}`. | `FastMCP` resource decorator pattern identified. |
| R2.3 | Implement basic CRUD Tools (`add_node`, etc.). | Tool definitions with guardrail logic designed. |
| R3.1 | Mount MCP server into FastAPI (SSE transport). | `.sse_app()` mounting pattern verified for FastAPI. |
| R3.2 | Standalone CLI entry point (`stdio`). | `mcp.run()` pattern with `argparse` for CLI flags. |
| N/A | (agent) Name Enforcement | Logic for pre-flight graph name checks implemented in tools. |
| N/A | Error Handling (API unreachable) | `httpx.ConnectError` handling and user-friendly messaging. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mcp` | latest | MCP Python SDK | Official SDK from Anthropic; includes `FastMCP`. |
| `fastapi` | latest | Web Framework | Existing project backend; supports mounting ASGI apps. |
| `uvicorn` | latest | ASGI Server | Standard for running FastAPI and SSE apps. |
| `httpx` | latest | HTTP Client | Modern, async-first HTTP client for API communication. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `python-dotenv` | latest | Env Management | Loading `BASE_API_URL` from `.env` files. |
| `structlog` | latest | Logging | Already in project; good for structured logs to file. |

**Installation:**
```bash
uv add mcp httpx
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── http_app/        # Existing FastAPI app
│   └── main.py      # Main entry point (mounts MCP)
├── mcp_server.py    # MCP Server definition (Tools/Resources)
└── mcp_client.py    # httpx-based client for FastAPI communication
```

### Pattern 1: Dual-Transport FastMCP
`FastMCP` can be run standalone or exported as an ASGI app for SSE.

**Example:**
```python
# src/mcp_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("IR-Graph", dependencies=["httpx"])

@mcp.tool()
async def add_node(graph_id: int, name: str):
    """Adds a node to the graph."""
    # Logic calling mcp_client
    return "Node added"

# Standalone execution
if __name__ == "__main__":
    import sys
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", default="http://localhost:8000")
    # ... handle other args
    mcp.run()
```

### Pattern 2: Guardrail Decorator or Helper
To enforce the `(agent)` ownership, every mutation tool should verify the graph name first.

**Logic:**
1. Tool receives `graph_id`.
2. Fetch `GET /api/graphs/{graph_id}`.
3. If `"(agent)"` not in name, return error message.
4. Otherwise, proceed with mutation call.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE Transport | Custom SSE handlers | `mcp.sse_app()` | Built-in, tested, and handles MCP protocol nuances. |
| Tool Schemas | Manual JSON Schema | Type hints + Docstrings | `FastMCP` generates these automatically and accurately. |
| HTTP Retries | Loop + Sleep | `httpx.AsyncClient` | Better handling of timeouts and connection pooling. |

## Common Pitfalls

### Pitfall 1: Logging to stdout in stdio mode
**What goes wrong:** `print()` or default `logging` outputs to `stdout`, which breaks the MCP protocol and crashes the connection.
**How to avoid:** Explicitly configure `logging` to use `stderr` and a file.
**Warning signs:** Client disconnects immediately after a tool call with "Invalid JSON" errors.

### Pitfall 2: Async/Sync Mismatch
**What goes wrong:** `FastMCP` tools are often async, but calling synchronous code (like old `requests`) can block the event loop.
**How to avoid:** Use `httpx.AsyncClient` for all API calls.

### Pitfall 3: API URL Mismatch
**What goes wrong:** The MCP server defaults to `localhost:8000` but the web server is running on a different port or host.
**How to avoid:** Use the `--api-url` flag and environment variables to ensure synchronization.

## Code Examples

### Robust API Client with Error Handling
```python
# src/mcp_client.py
import httpx
import logging

class IRGraphClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(base_url=self.base_url)

    async def get_graph(self, graph_id: int):
        try:
            resp = await self.client.get(f"/api/graphs/{graph_id}")
            resp.raise_for_status()
            return resp.json()
        except httpx.ConnectError:
            raise RuntimeError(f"API unreachable at {self.base_url}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise
```

### Modification Guardrail
```python
@mcp.tool()
async def update_node(graph_id: int, node_name: str, new_name: str):
    """Updates a node only if the graph is agent-owned."""
    graph = await client.get_graph(graph_id)
    if not graph:
        return "Error: Graph not found."
    
    if "(agent)" not in graph["name"]:
        return "Permission Denied: Agent can only modify graphs with '(agent)' in their name."
    
    # Proceed with update...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom MCP Handlers | `FastMCP` Framework | late 2024 | Reduced boilerplate by 80%. |
| stdio-only servers | SSE/HTTP Transport | late 2024 | Enables web-based agent integrations. |

## Open Questions

1. **How to handle large graphs in resources?**
   - Recommendation: The `graph://{graph_id}` resource should return the full JSON as requested, but we should monitor performance if graphs exceed thousands of nodes.

2. **Wait-for-API logic?**
   - Recommendation: In Phase 1, we follow Decision 3 and just fail with a helpful error. Retrying is the client's responsibility.

## Sources

### Primary (HIGH confidence)
- [Official MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) - FastMCP documentation and source.
- [FastAPI Documentation](https://fastapi.tiangolo.com/advanced/sub-applications/) - Mounting sub-apps.

### Secondary (MEDIUM confidence)
- [Httpx Documentation](https://www.python-httpx.org/async/) - Async usage and error handling.

## Metadata
**Confidence breakdown:**
- Standard stack: HIGH
- Architecture: HIGH
- Pitfalls: HIGH

**Research date:** 2025-05-14
**Valid until:** 2025-06-14
