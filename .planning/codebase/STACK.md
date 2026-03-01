# Technology Stack

**Analysis Date:** 2025-02-12

## Languages

**Primary:**
- Python 3.10 to 3.14 - Backend logic, API development, and data processing.

**Secondary:**
- JavaScript (ES6+) - Frontend interactivity and graph visualization in `src/http_app/static/script.js`.
- HTML5/CSS3 - Frontend structure and styling in `src/http_app/jinja_templates/` and `src/http_app/static/style.css`.

## Runtime

**Environment:**
- Python 3.10+
- Modern Web Browsers (for the frontend)

**Package Manager:**
- PDM (Primary) - Defined in `pyproject.toml` with `pdm-backend`.
- uv - `uv.lock` is present, suggesting use for fast dependency resolution.
- Lockfile: `uv.lock` and `package-lock.json` (though `package.json` is not in root).

## Frameworks

**Core:**
- FastAPI - Web framework for the backend API (`src/http_app/__init__.py`).
- Cytoscape.js - Graph visualization library used in the frontend (`src/http_app/static/cytoscape.min.js`).
- Jinja2 - Templating engine for HTML rendering (`src/http_app/jinja_templates/`).

**Testing:**
- Pytest - Test runner and framework (`tests/`).
- Coverage - Test coverage analysis.
- Factory-boy - Test data generation (`pyproject.toml`).

**Build/Dev:**
- Ruff - Linting and formatting.
- Mypy - Static type checking.
- Uvicorn - ASGI server for running the FastAPI application.

## Key Dependencies

**Critical:**
- Pydantic v2 - Data validation and settings management (`src/common/config.py`).
- Structlog - Structured logging for the application (`src/common/logs/`).
- OpenTelemetry SDK - Observability and tracing (`src/common/logs/__init__.py`).
- Python-Socketio - Real-time communication support (included in `pyproject.toml` but usage is limited in current core).

**Infrastructure (Present in manifest, currently inactive in core):**
- SQLAlchemy / SQLAlchemy-bind-manager - ORM and database management.
- Dramatiq - Task queue system.
- aiosqlite / asyncmy - Async database drivers.
- Redis - Backend for Dramatiq.

## Configuration

**Environment:**
- Managed via `pydantic-settings` in `src/common/config.py`.
- Supports environment variables and `.env` files.
- Uses `SettingsConfigDict` with nested delimiters (`__`).

**Build:**
- `pyproject.toml` - Main project configuration.
- `uv.lock` - Dependency lockfile.

## Platform Requirements

**Development:**
- Python 3.10+
- Node.js (implicitly, for frontend assets/management if used, though JS is served directly).

**Production:**
- Any platform supporting Python (Docker, Linux, etc.).
- Deployment target: Currently configured for local/production environments via `ENVIRONMENT` config.

---

*Stack analysis: 2025-02-12*
