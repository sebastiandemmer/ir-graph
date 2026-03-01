# IR Graph - MCP Integration

## Overview
**IR Graph** is a specialized visualization tool for Incident Response (IR). The current goal is to add an **MCP (Model Context Protocol) server** to the tool, enabling LLMs and AI agents to interact with the graph data, perform queries, and potentially manipulate nodes and edges through standard MCP tools and resources.

## Goals
-   Implement an MCP server that exposes graph operations as tools.
-   Provide resources for LLMs to read current graph states and metadata.
-   Maintain compatibility with the existing FastAPI backend and JSON/SQLite persistence.
-   Enable seamless integration for agents to help analysts during IR investigations.

## Tech Stack
-   **Backend:** Python 3.10+, FastAPI.
-   **Persistence:** Migration to SQLite (as preferred).
-   **Frontend:** Vanilla JS/CSS (as preferred).
-   **MCP Integration:** `mcp` Python SDK.
