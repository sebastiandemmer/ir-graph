# Codebase Concerns

**Analysis Date:** 2025-02-13

## Tech Debt

**Monolithic Frontend Logic:**
- Issue: `src/http_app/static/script.js` is over 1300 lines long and contains all frontend logic, including UI event listeners, API interaction, Cytoscape configuration, and state management.
- Files: `src/http_app/static/script.js`
- Impact: Makes maintenance difficult, increases the risk of regression, and hinders testing of frontend components.
- Fix approach: Break the script into smaller modules (e.g., `api.js`, `cytoscape-config.js`, `ui-handlers.js`).

**Hardcoded/Relative Path Resolution:**
- Issue: Paths for configuration and data files are resolved relative to `__file__` in multiple places.
- Files: `src/common/config.py`, `src/irgraph/Graphs.py`
- Impact: The application may fail to find critical files if the directory structure changes or if started from different working directories.
- Fix approach: Use a centralized configuration manager that handles path resolution based on an environment variable or a project root locator.

**Commented-out Dead Code:**
- Issue: Significant amounts of commented-out code for features like DI containers, SQLAlchemy, and telemetry.
- Files: `src/http_app/__init__.py`, `src/common/config.py`
- Impact: Increases noise and cognitive load for developers reading the code.
- Fix approach: Remove the dead code and rely on Git history if those features need to be re-introduced.

## Performance Bottlenecks

**Synchronous JSON Persistence:**
- Issue: `graphs.save_to_json()` is called synchronously after almost every state-changing API operation (add/delete/update nodes or edges).
- Files: `src/http_app/routes/api/graphs.py`
- Impact: As the graph data grows, these synchronous disk writes will significantly slow down API responses and increase I/O wait.
- Fix approach: Implement an asynchronous background task or a debounced write mechanism for persistence.

**N+1 API Calls for Grouping Operations:**
- Issue: The frontend performs sequential API calls in a loop when creating or dissolving groups.
- Files: `src/http_app/static/script.js` (`handleCreateGroup`, `handleUngroup`)
- Impact: Inefficient and leads to partial state updates if one call in the loop fails.
- Fix approach: Introduce bulk update endpoints in the API (e.g., `PATCH /graphs/{id}/nodes/bulk`).

## Fragile Areas

**Edge Deletion Logic:**
- Issue: `delete_edge` only removes the first matching edge between two nodes.
- Files: `src/irgraph/Graph.py`
- Impact: If multiple edges exist between the same source and target nodes, some will remain after a delete operation, leading to inconsistent graph states.
- Fix approach: Modify `delete_edge` to remove all matching edges or use unique edge identifiers.

**Lack of Atomic Writes/Locking:**
- Issue: The JSON-based storage does not use any form of file locking or atomic write operations.
- Files: `src/irgraph/Graphs.py`
- Impact: Concurrent writes from multiple processes or threads will lead to data corruption or loss.
- Fix approach: Use a proper database (like SQLite) or implement file locking and write-to-temp-then-rename patterns.

**Double FastAPI Initialization:**
- Issue: The `app` object is initialized twice in the `create_app` function.
- Files: `src/http_app/__init__.py`
- Impact: Redundant and confusing initialization logic.
- Fix approach: Consolidate into a single `FastAPI` instantiation.

## Inconsistent Logic/API Design

**Inconsistent Error Returns:**
- Issue: Some methods return error strings (e.g., "Node names incorrect") instead of raising specific exceptions or returning booleans.
- Files: `src/irgraph/Graph.py` (`add_edge_by_node_names`)
- Impact: The calling code has to check for specific string values, which is error-prone.
- Fix approach: Standardize on raising custom exceptions for domain-logic errors.

## Test Coverage Gaps

**Frontend Logic Testing:**
- What's not tested: The complex logic within `script.js` (UI interactions, graph transformations) is not covered by automated tests.
- Files: `src/http_app/static/script.js`
- Risk: Changes to frontend logic may break core graph manipulation features unnoticed.
- Priority: Medium

---

*Concerns audit: 2025-02-13*
