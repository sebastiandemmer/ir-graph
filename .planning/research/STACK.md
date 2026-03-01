# Technology Stack

**Project:** ir-graph-2 (MCP Integration)
**Researched:** 2024-05-24

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Python | 3.12+ | Backend Logic | Project requirement, existing codebase. |
| mcp | latest | MCP Protocol | Primary interface for LLM integration. |
| FastMCP | latest | High-level SDK | Simplifies tool/resource definition via decorators. |

### Database / Storage
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| SQLite | 3.x | Persistence | Migrating from JSON to support atomicity and complex IR queries. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Pydantic | 2.x | Data Validation | Already used in project, excellent for MCP tool schemas. |
| **NetworkX** | **3.x** | **Graph Algorithms**| **Required for high-value IR tools like `get_blast_radius` and `find_lateral_movement`.** |
| uv | latest | Dependency Mgmt | Recommended for MCP projects, handles `uvx` for easy execution. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| MCP SDK | FastMCP | Raw MCP SDK | FastMCP is much more concise for tool-heavy servers. |
| Persistence| SQLite | JSON | JSON lacks atomicity and is slow for large graphs with multi-client access. |
| Graph Lib | NetworkX | Custom Logic | NetworkX is industry standard, debugged, and feature-rich. |

## Installation

```bash
# Add MCP and Graph dependencies
uv add "mcp[cli]" networkx

# Dev dependencies
uv add --dev pytest
```

## Sources
- [MCP Python SDK Documentation](https://github.com/modelcontextprotocol/python-sdk)
- [FastMCP Repository](https://github.com/jlowin/fastmcp)
- [NetworkX Documentation](https://networkx.org/)
