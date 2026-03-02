---
status: testing
phase: 01-foundation
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md
started: 2026-03-02T22:53:00Z
updated: 2026-03-02T22:53:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Create Agent Graph
expected: |
  Calling tool `create_graph(name="UAT Test")` should return a JSON response where the name is "UAT Test (agent)".
awaiting: user response

## Tests

### 1. Create Agent Graph
expected: Calling tool `create_graph(name="UAT Test")` should return a JSON response where the name is "UAT Test (agent)".
result: [pending]

### 2. Read Graph Resource
expected: Accessing resource `graph://{id}` for a known graph ID should return the full JSON state of that graph.
result: [pending]

### 3. Add Node to Agent Graph
expected: Calling tool `add_node(graph_id, name="Node A")` on a graph with "(agent)" in its name should return a success message.
result: [pending]

### 4. Guardrail: Node to Human Graph
expected: Calling tool `add_node(graph_id, name="Node B")` on a graph WITHOUT "(agent)" in its name should return a "Permission Denied" message.
result: [pending]

### 5. Add Edge to Agent Graph
expected: Calling tool `add_edge(graph_id, source_node="Node A", target_node="Node B")` on an agent-owned graph should return a success message.
result: [pending]

### 6. Update Node in Agent Graph
expected: Calling tool `update_node(graph_id, node_name="Node A", description="Updated description")` should return a success message and update the state.
result: [pending]

### 7. Delete Node in Agent Graph
expected: Calling tool `delete_node(graph_id, node_name="Node A")` should remove the node and return a success message.
result: [pending]

### 8. API Unreachable Error
expected: If the FastAPI backend is stopped, attempting to use tools or resources should return a helpful error message asking to ensure the server is running.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0

## Gaps

[none yet]
