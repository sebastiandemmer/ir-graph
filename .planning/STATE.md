# Project State: IR Graph MCP Integration

## Context
**IR Graph** is being enhanced with an **MCP (Model Context Protocol) server** to enable AI agents to assist in Incident Response.

## Current Phase
- **Phase 0: Project Initialization** (COMPLETE)
- **Phase 1: MCP Server Foundation & Integration** (COMPLETE)
- **Next Phase:** Phase 2: Advanced IR Algorithms (NetworkX)

## Key Decisions
- **MCP Framework:** Using `mcp-python-sdk` (FastMCP).
- **Transport:** Hybrid approach—SSE for FastAPI integration, stdio for desktop clients.
- **Algorithms:** Integrating `NetworkX` for graph analysis.
- **Ownership Guardrails:** Agents can only modify graphs with "(agent)" in the name.

## Active Goals
- [ ] Begin Phase 2: Advanced IR Algorithms (NetworkX).

## Blockers
- None.
