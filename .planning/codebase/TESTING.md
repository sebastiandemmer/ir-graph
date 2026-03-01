# Testing Patterns

**Analysis Date:** 2025-02-12

## Test Framework

**Runner:**
- `pytest`
- Config: `pyproject.toml` (specifically `[tool.pytest.ini_options]`)

**Assertion Library:**
- Standard `assert` statement (used with `pytest`).

**Run Commands:**
```bash
pytest                  # Run all tests
pytest -n auto          # Run in parallel (using pytest-xdist)
pytest --cov=src        # Run with coverage (using pytest-cov)
```

## Test File Organization

**Location:**
- Separate `tests/` directory.

**Naming:**
- `test_*.py` (e.g., `tests/unit/test_graph.py`).

**Structure:**
```
tests/
├── conftest.py          # Fixtures and global setup
├── api/                # Integration tests for FastAPI endpoints
│   └── test_*.py
└── unit/               # Unit tests for domain logic
    └── test_*.py
```

## Test Structure

**Suite Organization:**
```python
def test_some_functionality():
    # Setup
    graph = Graph()
    
    # Action
    graph.add_node(Node("N1"))
    
    # Assert
    assert len(graph.nodes) == 1
```

**Patterns:**
- Setup: Minimal setup within individual tests or using fixtures.
- Assertions: Direct `assert` on object state or return values.

## Mocking

**Framework:** `unittest.mock` (Standard Library)

**Patterns:**
```python
@pytest.fixture
def client():
    from unittest.mock import MagicMock
    from http_app import graphs
    
    # Mocking global state methods to avoid side effects
    graphs.load_from_json = MagicMock()
    graphs.save_to_json = MagicMock()
    
    # ...
```

**What to Mock:**
- File system operations (e.g., `load_from_json`, `save_to_json`).
- External service calls.

**What NOT to Mock:**
- Pure domain logic (`Graph`, `Node`, `Edge`).
- API request/response cycle (handled by `fastapi.testclient.TestClient`).

## Fixtures and Factories

**Test Data:**
- Simple object instantiation (e.g., `Node("N1")`).
- `factory-boy` and `pytest-factoryboy` are present in dependencies, likely for more complex scenarios (e.g., migrations).

**Location:**
- `tests/conftest.py` contains the primary `client` fixture for API testing.

## Coverage

**Requirements:** 
- Enforced target: 100% (as per `fail_under = 100` in `pyproject.toml`).

**View Coverage:**
```bash
pytest --cov-report=term-missing
```

## Test Types

**Unit Tests:**
- Test individual methods of domain objects (e.g., `Graph.add_node`).
- Focused on correctness of logic and state transitions.

**Integration Tests:**
- API tests using `TestClient`.
- Verify end-to-end flow from request to domain logic and response (e.g., `tests/api/test_graphs_api.py`).

**E2E Tests:**
- Not explicitly detected for the frontend, but `fastapi.testclient` covers the backend E2E.

## Common Patterns

**Async Testing:**
- `asynctest` is included in dev dependencies for testing async components.

**Error Testing:**
```python
with pytest.raises(TypeError):
    graph.add_node("NotANode")
```

---

*Testing analysis: 2025-02-12*
