# Incident Response Graph Taxonomy

Modeling a *single intrusion* requires a focused, tactical taxonomy. The goal is to track **who** did **what**, to **which asset**, and **when**.

Here is a proposed lightweight taxonomy optimized for an MCP agent to understand and traverse during an active investigation.

## 1. Node Types (Entities)

Nodes represent the concrete "nouns" of the investigation.

*   **`system` / `endpoint`**: A physical or virtual machine (e.g., "HR-Laptop-01", "DB-Server").
*   **`cloud_infrastructure`**: High-level resources in an AWS, Azure, or GCP environment (e.g., "S3 Bucket", "EC2 Instance").
*   **`saas_application`**: Legitimate external services accessed during an incident (e.g., "Office 365", "Okta", "Salesforce").
*   **`attacker_infrastructure`**: An external entity used for Command & Control (C2) or payload delivery/data exfiltration (e.g., a specific Domain or Cloud Bucket).
*   **`threat_actor`**: The human or group responsible for the intrusion (e.g., "APT29", "Scattered Spider", "Insider Threat").

## 2. Edge Types (Relationships)

Edges represent the "verbs"—how the nouns interacted. Edges in an `ir-graph` *must* be directional.

*   **Lateral Movement:**
    *   `moved_to` (System -> System/Cloud Infrastructure/SaaS Application)
*   **Command & Exfiltration:**
    *   `communicated_with` (System -> Attacker Infrastructure)
    *   `exfiltrated_to` (System/Cloud Infrastructure -> Attacker Infrastructure)
*   **Attribution & Control:**
    *   `controlled` (Threat Actor -> Attacker Infrastructure)
    *   `accessed` (Threat Actor -> System/Cloud Infrastructure/SaaS Application)

## 3. Required Properties for Nodes & Edges

To make tools like `get_blast_radius` or `summarize_timeline` work efficiently via MCP, Nodes and Edges require specific properties:

**Common Properties (Nodes & Edges):**
*   `timestamp_discovered`: The time an analyst or automated tool first identified this entity/activity during the investigation.

**Edge-Specific Properties:**
*   `timestamp_occurred`: The exact time the event or interaction actually happened (e.g., from system logs).

**Node-Specific Properties:**
*   `type`: One of the Node Types defined above.
*   `confidence`: A binary flag representing the source of the finding (`evidence-based` vs `inferred`). 
    *   `evidence-based`: Directly observed in logs or forensic artifacts.
    *   `inferred`: Educated analyst deduction (e.g. missing logs, connecting the dots).


