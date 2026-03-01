# Architecture

**Analysis Date:** 2025-02-13

## Pattern Overview

**Overall:** Layered Monolith / MVC-inspired.

**Key Characteristics:**
- Separation of concerns between domain logic and presentation.
- Domain-driven design elements (Graph, Node, Edge entities).
- Simple file-based persistence (JSON).
- RESTful API design using FastAPI.

## Layers

**API Layer:**
- Purpose: Handles HTTP requests, input validation, and orchestrates domain logic.
- Location: `src/http_app/routes/api/`
- Contains: FastAPI routes, Pydantic models for request/response validation.
- Depends on: `src/irgraph/` (Domain Layer), `src/http_app/dependencies.py`.
- Used by: Frontend clients (web browser).

**Domain Layer:**
- Purpose: Encapsulates core business logic and entities related to graphs.
- Location: `src/irgraph/`
- Contains: `Graph`, `Node`, `Edge`, and `Graphs` (collection manager) classes.
- Depends on: Standard library, Pydantic (for some core schema hooks).
- Used by: `src/http_app/routes/api/`, `tests/unit/`.

**Persistence Layer:**
- Purpose: Manages reading and writing graph data to disk.
- Location: Integrated within `src/irgraph/Graphs.py`.
- Contains: Logic for JSON serialization/deserialization.
- Depends on: `src/data/graphs.json`.
- Used by: `src/http_app/__init__.py` (lifespan events), `src/http_app/routes/api/` (saving after updates).

**Frontend Layer:**
- Purpose: Provides a web interface for interacting with the graphs.
- Location: `src/http_app/static/` and `src/http_app/jinja_templates/`.
- Contains: HTML (Jinja2), CSS, and client-side JavaScript (Cytoscape.js for visualization).
- Depends on: API Layer endpoints.

## Data Flow

**Update Graph Flow:**

1. Client sends a `PATCH` request to `/api/graphs/{graph_id}`.
2. `src/http_app/routes/api/graphs.py` receives request and validates it against `GraphModel`.
3. The route handler calls `graphs.update_graph_name(graph_id, name)` on the global `Graphs` instance.
4. If successful, it calls `graphs.save_to_json()`.
5. `Graphs.save_to_json()` serializes all graphs and writes them to `src/data/graphs.json`.
6. API returns a success message to the client.

**State Management:**
- Server-side: In-memory state held in a global `Graphs` instance within `src/http_app/__init__.py`, periodically persisted to JSON.
- Client-side: Managed by JavaScript in `src/http_app/static/script.js` and rendered via Cytoscape.js.

## Key Abstractions

**Graph Entity:**
- Purpose: Represents a collection of nodes and edges.
- Examples: `src/irgraph/Graph.py`
- Pattern: Domain Entity.

**Graphs Manager:**
- Purpose: Manages multiple graphs and handles persistence.
- Examples: `src/irgraph/Graphs.py`
- Pattern: Repository / Collection Manager.

## Entry Points

**Web Server:**
- Location: `src/http_app/dev_server.py` (Development runner) or `src/http_app/__init__.py` (App factory).
- Triggers: Running the server via CLI (e.g., `uvicorn src.http_app.dev_server:app`).
- Responsibilities: Initializing FastAPI, mounting routes, setting up lifespan events for data loading.

## Error Handling

**Strategy:** Exception-based handling with FastAPI's built-in support and some custom logic.

**Patterns:**
- HTTP Exceptions: Raised in routes (e.g., `raise HTTPException(status_code=404)`).
- Domain Validation: Logic checks in domain classes (e.g., `if start_node is None: raise ValueError`).
- Catch-all: Middleware in `src/http_app/__init__.py` (currently commented out but structured for use).

## Cross-Cutting Concerns

**Logging:** Standard Python `logging` used in `src/irgraph/Graphs.py` and `src/http_app/__init__.py`.
**Validation:** Pydantic models in `src/http_app/routes/api/graphs.py` for API level, manual type/existence checks in domain models.
**Configuration:** Managed by `AppConfig` in `src/common/config.py`.

---

*Architecture analysis: 2025-02-13*
