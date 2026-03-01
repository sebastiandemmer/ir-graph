# Integrations

## Data Storage
- **Primary Persistence:** Local JSON file at `src/data/graphs.json`.
- **Database (Placeholder):** `SQLAlchemy`, `aiosqlite`, and `asyncmy` are listed as dependencies, but their configurations in `src/common/config.py` are currently commented out.

## Messaging & Task Queues
- **Service:** `dramatiq` and `redis` are listed in `pyproject.toml`.
- **Status:** Integration appears to be placeholder or commented out in the current codebase state.

## Observability & Logging
- **Service:** `opentelemetry` is included in dependencies.
- **Implementation:** Logging processors in `src/common/logs/processors.py` reference OpenTelemetry, but the main instrumentation in `src/http_app/__init__.py` is commented out.

## External APIs
- **Status:** No active external API integrations found. The system operates as a standalone FastAPI service.
