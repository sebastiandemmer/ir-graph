# Roadmap - IR Graph MCP Integration

## Phase 1: MCP Server Foundation & Integration
- [x] Set up `FastMCP` server instance.
- [x] Implement read-only Resource: `graph://{graph_id}`.
- [x] Implement CRUD Tools: `create_graph`, `add_node`, `add_edge`, `update_node`, `delete_node`.
- [x] Mount MCP server into FastAPI (SSE transport).
- [x] Create standalone CLI entry point (stdio transport).
- [x] **Verification:** Successfully connect Claude Desktop (stdio) and verify graph mutations.

## Phase 2: Advanced IR Algorithms (NetworkX)
- [ ] Integrate `NetworkX` library.
- [ ] Implement `get_blast_radius` tool (Reachability analysis).
- [ ] Implement `find_lateral_movement` tool (Pathfinding).
- [ ] Implement `summarize_timeline` tool (Chronological analysis).
- [ ] **Verification:** Run IR-specific tools via MCP and verify output correctness.

## Phase 3: Refinement & Advanced Features
- [ ] Implement STIX 2.1 schema validation for IR entities.
- [ ] Add support for "Prompts" in MCP to guide LLM investigations.
- [ ] Optimize frontend to handle real-time updates if possible.
- [ ] **Verification:** Conduct a full mock IR investigation using the AI agent.
