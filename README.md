# IR Graph 

**IR Graph** is a specialized visualization tool tailored for **Incident Response (IR)** operations. It allows analysts to construct, view, and manipulate complex relationships between entities, track lateral movement, and map incident timelines in an interactive graph interface.

## Key Features

*   **Interactive Graph Visualization**: Render and interact with nodes and edges representing IR entities.
*   **Persistence**: Automatically saves and loads graph data to/from JSON, ensuring your investigation state is preserved between sessions.
*   **Customization**: Support for custom icons, node categories, and configurable color schemes.
*   **Multi-Graph Support**: Manage separate graphs for different investigations or different aspects of a single case (e.g., Timeline vs. Entity Relationship).
*   **Export**: Render and export your graphs to PNG images for reporting.

## Installation

This project is built with Python 3.10+ and uses [uv](https://github.com/astral-sh/uv) (or PDM) for dependency management.

### Prerequisites
*   Python 3.10 or higher
*   `uv` (recommended) or `pip`

### Setup Steps

1.  **Clone the repository**
    ```bash
    git clone <repository_url>
    cd ir-graph-2
    ```

2.  **Install dependencies**
    Using `uv`:
    ```bash
    uv sync
    ```
    
    Or using standard `pip`:
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate
    pip install -e .
    ```

## Usage

### Starting the Development Server

1.  **Activate the environment** (if not using `uv run`):
    ```bash
    source .venv/bin/activate
    ```

2.  **Run the server**:
    The easiest way to run the local development server (with hot-reload):
    
    ```bash
    # Run the dev server script
    python src/http_app/dev_server.py
    ```
    
    The server will start at `http://0.0.0.0:8000`.

### Key Operations
*   **Access the UI**: Open your browser to `http://localhost:8000`.
*   **Save/Load**: Graphs are automatically saved to `graphs.json` on shutdown and loaded on startup.

## Roadmap & Status

### Implemented
- [x] **Core Graph**: Node/Edge creation and manipulation.
- [x] **Persistence**: JSON-based save/load.
- [x] **Visuals**: Custom icons (SVG/PNG), basic coloring.
- [x] **Management**: Multi-graph switching.
- [x] **Serving**: FastAPI backend with static file serving.

### Future Work
- [ ] **Database Integration**: Migrate from JSON validation to SQLite/SQL for scalable persistence.
- [ ] **Advanced Views**:
    -   *Lateral Movement Graph*: Specialized layout for attack paths.
    -   *Timeline Graph*: Temporal visualization of events.
- [ ] **Theming**: UI-configurable color schemes.
- [ ] **Frontend**: Cytoscape.js extensions for improved layout and interaction.
