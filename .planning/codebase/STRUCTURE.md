# Codebase Structure

**Analysis Date:** 2025-02-13

## Directory Layout

```
ir-graph-2/
├── src/                # Root source directory
│   ├── common/         # Shared utilities and configuration
│   ├── data/           # Persistence storage (JSON files)
│   ├── http_app/       # FastAPI application and presentation layer
│   │   ├── routes/     # API and HTML route handlers
│   │   ├── static/     # Client-side assets (JS, CSS, SVGs)
│   │   └── jinja_templates/ # HTML templates (Jinja2)
│   └── irgraph/        # Core domain logic (Models)
├── tests/              # Test suite
│   ├── api/            # Integration/API tests
│   └── unit/           # Domain/Unit tests
├── pyproject.toml      # Project dependencies and configuration
└── uv.lock             # Python lockfile
```

## Directory Purposes

**src/common/:**
- Purpose: Shared configuration, logging, and constants.
- Contains: `config.py`, `config.json`.
- Key files: `src/common/config.py` (AppConfig class).

**src/data/:**
- Purpose: Local storage for graph data in JSON format.
- Contains: `graphs.json`, `config.json`.
- Key files: `src/data/graphs.json` (Main data storage).

**src/http_app/:**
- Purpose: Presentation layer using FastAPI.
- Contains: Application factory, routes, static files, and templates.
- Key files: `src/http_app/__init__.py` (create_app factory).

**src/irgraph/:**
- Purpose: Core business logic and graph domain models.
- Contains: `Graph`, `Node`, `Edge`, and `Graphs` collection management.
- Key files: `src/irgraph/Graph.py`, `src/irgraph/Graphs.py`.

**tests/:**
- Purpose: Automated tests for the application.
- Contains: Unit tests for domain logic and integration tests for API.
- Key files: `tests/unit/test_graph.py`, `tests/api/test_graphs_api.py`.

## Key File Locations

**Entry Points:**
- `src/http_app/dev_server.py`: Development server entry point (FastAPI).
- `src/http_app/__init__.py`: Application initialization and middleware.

**Configuration:**
- `src/common/config.py`: Environment-based application configuration.
- `pyproject.toml`: Build system and dependency management.

**Core Logic:**
- `src/irgraph/Graph.py`: Represents a single graph and its operations.
- `src/irgraph/Graphs.py`: Handles multiple graphs and persistence (JSON).

**Testing:**
- `tests/unit/`: Unit tests for domain objects.
- `tests/api/`: Integration tests for API endpoints.

## Naming Conventions

**Files:**
- Domain Models: PascalCase (e.g., `Node.py`, `Graph.py`) - note that some follow standard Python snake_case too (e.g., `Graphs.py`).
- Routes and Logic: snake_case (e.g., `graphs.py`, `dev_server.py`).

**Directories:**
- Modules: snake_case (e.g., `http_app`, `irgraph`).

## Where to Add New Code

**New Feature (API):**
- Primary code: `src/http_app/routes/api/` (new route file or existing).
- Tests: `tests/api/` (matching test file).

**New Domain Model:**
- Implementation: `src/irgraph/` (new file with PascalCase class name).
- Tests: `tests/unit/` (matching unit test file).

**New UI Component/Script:**
- Implementation: `src/http_app/static/` (for JS/CSS) or `src/http_app/jinja_templates/` (for HTML).

**Utilities:**
- Shared helpers: `src/common/`.

## Special Directories

**src/data/:**
- Purpose: Contains the "database" (JSON files).
- Committed: Yes (initial structure/sample data).

---

*Structure analysis: 2025-02-13*
