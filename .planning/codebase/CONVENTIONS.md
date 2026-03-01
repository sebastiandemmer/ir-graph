# Coding Conventions

**Analysis Date:** 2025-02-12

## Naming Patterns

**Files:**
- Python: snake_case (e.g., `dev_server.py`, `test_graphs_api.py`). Note: Some domain model files use PascalCase (e.g., `Graph.py`, `Node.py`, `Edge.py`), which is an exception to PEP8.
- JavaScript: kebab-case for external libraries (e.g., `cytoscape-undo-redo.js`), but `script.js` for main logic.

**Functions/Methods:**
- Python: snake_case (e.g., `add_node`, `get_node_by_name`). Exception: `toJSON` in domain models uses camelCase.
- JavaScript: camelCase (e.g., `initializeGraph`, `fetchUiConfig`).

**Variables:**
- Python: snake_case (e.g., `graph_id`, `new_node`).
- JavaScript: camelCase (e.g., `currentGraphId`, `uiConfig`).
- Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL` in JS).

**Types/Classes:**
- Python: PascalCase (e.g., `Graph`, `Node`, `GraphModel`).

## Code Style

**Formatting:**
- Python: `ruff` is used for both linting and formatting.
- Line Length: 120 characters (configured in `pyproject.toml`).
- JavaScript: No explicit formatter (like Prettier) detected in config, but follows consistent camelCase and 4-space or 2-space indentation (standard JS).

**Linting:**
- Python: `ruff` with rules:
  - `E`, `W` (pycodestyle)
  - `F` (pyflakes)
  - `I` (isort)
  - `N` (pep8-naming)
  - `S` (flake8-bandit)
  - `TID` (flake8-tidy-imports)
  - `RUF` (ruff-specific rules)

## Import Organization

**Order (Python):**
1. Standard library imports.
2. Third-party imports (e.g., `fastapi`, `pydantic`).
3. Local application imports (e.g., `irgraph`, `http_app`).
- Handled automatically by `ruff` (isort rule `I`).

**Path Aliases:**
- `src` is added to the Python path in `tests/conftest.py`.

## Error Handling

**Patterns:**
- Domain Layer: Raises `TypeError` or `ValueError` with descriptive messages when validation fails (e.g., `src/irgraph/Graph.py`).
- API Layer: Catches issues and raises `fastapi.HTTPException` with appropriate status codes (e.g., `404 Not Found`, `400 Bad Request`).

## Logging

**Framework:** `structlog` (configured in `pyproject.toml` and `src/common/logs/`).

**Patterns:**
- Custom processors are defined in `src/common/logs/processors.py`.

## Comments

**When to Comment:**
- Docstrings are used for some class methods (e.g., `delete_node` in `Graph.py`).
- TODOs are used for marking pending improvements (e.g., `@router.post("/graphs/")` in `src/http_app/routes/api/graphs.py`).

**JSDoc/TSDoc:**
- JavaScript functions often include JSDoc-style comments explaining parameters and purpose (e.g., `src/http_app/static/script.js`).

## Function Design

**Size:** Generally small, focused functions, though `script.js` contains some large event handler setups.

**Parameters:** 
- Python: Uses type hints for all parameters and return values.
- API: Uses Pydantic models for request bodies.

## Module Design

**Exports:** 
- Python: Uses `__init__.py` to expose relevant members (e.g., `src/irgraph/__init__.py`).
- JavaScript: Uses global scope within a `DOMContentLoaded` listener in `script.js`.

---

*Convention analysis: 2025-02-12*
