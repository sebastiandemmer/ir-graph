# Research: FastAPI & MCP Integration

**Domain:** Web Framework & Model Context Protocol (MCP) Integration
**Researched:** 2024-05-24
**Confidence:** HIGH

## Overview

Integrating a Model Context Protocol (MCP) server with an existing FastAPI application can be achieved in two primary ways: **Integrated (Single Process via SSE)** or **Hybrid (Single Codebase, Multiple Entry Points)**.

The `mcp` Python SDK (specifically the `FastMCP` framework) is designed to support both ASGI-based web serving and standard input/output (stdio) communication.

---

## 1. Co-location Strategies

### Strategy A: Integrated (Single Process, SSE Transport)
This approach mounts the MCP server as a sub-application within FastAPI.

- **How it works:** `FastMCP` provides an `.http_app()` method that returns an ASGI-compliant application. This is then mounted using FastAPI's `app.mount()`.
- **Transport:** Uses **SSE (Server-Sent Events)** for communication.
- **Access:** Standard REST endpoints and MCP tools share the same port and host.
- **Best for:** Remote deployments, shared in-memory state, and unified security/middleware.

**Example Implementation:**
```python
from fastapi import FastAPI
from fastmcp import FastMCP

app = FastAPI()
mcp = FastMCP("My MCP Server")

@mcp.tool()
async def my_tool():
    return "Result"

# Mount MCP as a sub-app
app.mount("/mcp", mcp.http_app())
```
*MCP Endpoint: `http://localhost:8000/mcp/sse`*

### Strategy B: Hybrid (Single Codebase, Separate Entry Points)
This approach uses a single definition of tools and resources but allows running the application in different "modes" depending on the transport needed.

- **How it works:** Define the `FastMCP` instance in a shared module. Create one entry point for the Web (FastAPI) and another for local/desktop use (stdio).
- **Transport:** Supports both **stdio** (for Claude Desktop) and **SSE** (for Web).
- **Best for:** Supporting local LLM clients (which often prefer stdio) while also providing a web interface.

**Recommendation:** Strategy B is the most flexible and robust for `ir-graph-2`.

---

## 2. Transport Comparison: stdio vs HTTP (SSE)

| Feature | stdio | HTTP (SSE/Streamable) |
| :--- | :--- | :--- |
| **Connection** | Local Subprocess (Pipes) | Network (HTTP) |
| **Use Case** | Claude Desktop, Local CLI | Remote Clients, Web Apps |
| **Setup** | Zero config | Requires host/port/CORS |
| **Performance** | High (local overhead only) | Moderate (network overhead) |
| **Same Process?**| Hard (Log collision risk) | Yes (via FastAPI mount) |

### The "Same Process" Problem for stdio + HTTP
It is technically possible to run both `stdio` and `HTTP` in the same process instance using `asyncio.gather()`, but it is **not recommended** due to **Stdout Collision**:
1. MCP `stdio` transport uses `sys.stdout` for protocol messages (JSON-RPC).
2. FastAPI/Uvicorn typically uses `sys.stdout` for logs.
3. If Uvicorn prints a log line while an MCP client is reading from stdout, the client will fail to parse the stream, breaking the connection.

---

## 3. Implementation Plan for `ir-graph-2`

To co-locate MCP with the existing `http_app`:

1.  **Define the Server:** Create `src/mcp_server.py` containing the `FastMCP` instance and tool definitions.
2.  **Share Logic:** Ensure `mcp_server.py` and `http_app` both use the same `Graphs` repository (ideally the new SQLite backend).
3.  **Mount in FastAPI:** In `src/http_app/__init__.py`, import the `mcp` instance and use `app.mount("/mcp", mcp.http_app())`.
4.  **CLI Entry Point:** Modify `src/mcp_server.py` to support running via `stdio` when executed directly:
    ```python
    if __name__ == "__main__":
        mcp.run()
    ```

---

## 4. Pitfalls & Considerations

### Lifespan Management
FastAPI and MCP both have startup/shutdown needs (e.g., DB connections).
- When mounting, ensure the `lifespan` of the main FastAPI app correctly initializes shared resources (like the SQLite connection pool) that the MCP tools will use.

### Security
- Standard FastAPI middleware (CORS, Authentication) can be applied to the `/mcp` path.
- If using SSE, ensure `CORSMiddleware` allows the origin of the MCP client if it's browser-based.

### Logging
- If running in `stdio` mode, redirect all application logs to `stderr` or a file to avoid corrupting the MCP stream on `stdout`.
- If running in `SSE` mode (via FastAPI), standard logging to `stdout` is safe.

## Sources

- [FastMCP Documentation](https://gofastmcp.com/)
- [MCP Python SDK Repository](https://github.com/modelcontextprotocol/python-sdk)
- [FastAPI Mounting Documentation](https://fastapi.tiangolo.com/advanced/sub-applications/)
- Community discussions on MCP transport patterns (Medium, Dev.to).
