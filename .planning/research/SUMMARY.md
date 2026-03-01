# Research Summary: IR-Graph-2 MCP & IR Workflows

**Domain:** Graph Management System with AI-Driven IR
**Researched:** 2024-05-24
**Overall confidence:** HIGH

## Executive Summary
The `ir-graph-2` project is moving beyond a simple graph editor to become a high-value tool for AI-driven Incident Response (IR). Research into IR analyst workflows (NIST/SANS) highlights critical gaps where relationship-driven analysis (graphs) outperforms linear logs. An AI agent using MCP can automate complex IR tasks like **blast radius analysis**, **lateral movement detection**, and **automated timeline generation**. This requires a shift from JSON storage to **SQLite** (for query efficiency) and the addition of **NetworkX** to provide robust graph algorithm support.

## Key Findings
- **Workflows:** IR analysts transition from detection to containment and investigation. AI agents can automate the "graph building" and "impact analysis" steps during these transitions.
- **High-Value Tools:** `find_lateral_movement`, `get_blast_radius`, and `summarize_timeline` identified as high-value differentiator features.
- **Stack:** Python 3.12, `mcp`, `FastMCP`, **NetworkX** (Algorithms), and **SQLite** (Persistence).
- **Architecture:** MCP Tools will wrap graph algorithms. SQLite will store node/edge metadata and potentially pre-computed graph metrics.

## Implications for Roadmap

1. **Phase 1: Persistence Migration** - Migrate to SQLite. Implement `GraphRepository`.
2. **Phase 2: Foundation MCP** - Basic CRUD tools for nodes/edges.
3. **Phase 3: IR Algorithm Integration** - Add `NetworkX` and implement the first high-value IR tool: `get_blast_radius`.
4. **Phase 4: Advanced Investigation Tools** - Implement `find_lateral_movement` and `summarize_timeline`.
5. **Phase 5: Reporting & Export** - Implement STIX export and executive summary generation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | NetworkX is the industry standard for graph logic in Python. |
| Features | HIGH | IR analysts confirm graph-based analysis is a major productivity booster. |
| Architecture | MEDIUM | Mapping a complex dynamic graph to SQLite efficiently requires careful schema design. |
| Pitfalls | MEDIUM | Performance on extremely large graphs (10k+ nodes) may require optimization. |

## Gaps to Address
- **Data Ingestion:** How to ingest data from external IR tools (SIEM/EDR) into the graph?
- **Schema Standardization:** Adopting STIX 2.1 schema for nodes/edges to ensure the AI agent speaks a "common language" of security.
