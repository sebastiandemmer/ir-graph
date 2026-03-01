# Research: SQLite Migration for IR Graph

**Project:** ir-graph-2
**Researched:** 2024-05-20
**Confidence:** HIGH

## Overview

The current JSON-based persistence in `src/data/graphs.json` is simple but limited as the project scales. Migrating to SQLite provides:
1. **Atomic Updates**: No need to rewrite the entire 5MB+ file for a single node move.
2. **Advanced Querying**: Ability to perform graph traversals (CTEs) and filtering in the database.
3. **Structured IR Metadata**: Flexible storage for diverse incident response artifacts (IPs, hashes, etc.).
4. **Data Integrity**: Foreign key constraints prevent orphaned edges or invalid node references.

## Proposed Schema

Following best practices for graph representation in relational databases and STIX 2.1 patterns.

### 1. `graphs` Table
Stores the top-level containers for different investigations or views.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique ID |
| `name` | TEXT NOT NULL | Graph name |
| `metadata` | JSON | Extra info (e.g., incident ID, investigator) |
| `created_at` | DATETIME | Defaults to CURRENT_TIMESTAMP |
| `updated_at` | DATETIME | Updated on modification |

### 2. `nodes` Table
Stores entities (Assets, Users, IPs, Files, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique ID |
| `graph_id` | INTEGER | FOREIGN KEY to `graphs.id` ON DELETE CASCADE |
| `name` | TEXT NOT NULL | Display name/Label |
| `type` | TEXT | Category (e.g., 'Server', 'User', 'Group') |
| `x` | INTEGER | UI position X |
| `y` | INTEGER | UI position Y |
| `parent_id` | INTEGER | FOREIGN KEY to `nodes.id` (self-referencing for hierarchy) |
| `description` | TEXT | Multi-line notes |
| `metadata` | JSON | IR attributes (IP, MAC, Hash, OS, etc.) |
| `created_at` | DATETIME | Timestamp of creation |

### 3. `edges` Table
Stores relationships between nodes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique ID |
| `graph_id` | INTEGER | FOREIGN KEY to `graphs.id` ON DELETE CASCADE |
| `source_id` | INTEGER | FOREIGN KEY to `nodes.id` ON DELETE CASCADE |
| `target_id` | INTEGER | FOREIGN KEY to `nodes.id` ON DELETE CASCADE |
| `directed` | BOOLEAN | Default 1 (True) |
| `relationship_type` | TEXT | Verb (e.g., 'logged_into', 'communicated_with') |
| `style` | TEXT | UI style ('solid', 'dotted', etc.) |
| `description` | TEXT | Relationship notes |
| `metadata` | JSON | Connection metadata (timestamps, bytes, ports) |
| `created_at` | DATETIME | Timestamp of creation |

## Migration Strategy

### Step 1: Preparation
- Backup `src/data/graphs.json`.
- Install dependencies: `SQLAlchemy` or `sqlite-utils`.

### Step 2: Data Transformation
Create a script `scripts/migrate_json_to_sqlite.py` that:
1. **Reads** the entire `graphs.json`.
2. **Inserts** graphs into the `graphs` table.
3. **Inserts** nodes in two passes:
   - *Pass 1*: Insert all nodes with `parent_id = NULL`. Store a mapping of `(graph_id, node_name) -> node_id`.
   - *Pass 2*: Update nodes with their actual `parent_id` using the mapping and the `parent` name from JSON.
4. **Inserts** edges using the mapping to resolve `source_id` and `target_id` from the JSON node names (`start` and `end`).

### Step 3: Code Refactoring
1. **Repository Pattern**: Introduce a `GraphRepository` class that handles SQL interactions.
2. **Update `Graphs.py`**:
   - Replace `load_from_json()` with `load_all_from_db()`.
   - Update `save_to_json()` (or replace it with immediate database updates in the API).
3. **Update API Routes**:
   - Ensure the `graph_id` used in routes (`/graphs/<id>`) maps to the SQLite `id` column.

## IR-Specific Advantages

### 1. Multi-hop Traversal
Finding all assets within 3 hops of a compromised node:
```sql
WITH RECURSIVE traverse(id, depth) AS (
  SELECT ?1, 0
  UNION
  SELECT e.target_id, t.depth + 1
  FROM edges e
  JOIN traverse t ON e.source_id = t.id
  WHERE t.depth < 3
)
SELECT DISTINCT n.* FROM nodes n JOIN traverse t ON n.id = t.id;
```

### 2. Flexible Artifacts
Using the `metadata` JSON column, we can store specific IR fields without schema changes:
- **IP Node**: `{"ip_address": "10.0.0.5", "asn": 1234, "geo": "US"}`
- **File Node**: `{"sha256": "...", "size": 1024, "path": "C:\Windows\..."}`

### 3. Timeline Views
Since every edge has a `created_at` (and potentially a `start_time` in `metadata`), we can query for events that happened within a specific time window.

## Potential Pitfalls
- **Performance of JSON queries**: SQLite JSON support is fast, but for very large datasets, common fields (like IP) should be extracted into indexed columns.
- **Node Name Uniqueness**: Currently, the system assumes names are unique per graph. SQLite IDs remove this constraint, but the UI might still need to handle duplicate names gracefully.

## Sources
- [SQLite JSON Documentation](https://www.sqlite.org/json1.html)
- [STIX 2.1 Standard](https://docs.oasis-open.org/cti/stix/v2.1/stix-v2.1.html)
- [Graph Modeling in Relational Databases](https://towardsdatascience.com/modeling-graphs-in-relational-databases-820836563467)
