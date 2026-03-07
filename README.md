# IR Graph 

**IR Graph** is a specialized visualization tool tailored for **Incident Response (IR)** operations. It allows analysts to construct, view, and manipulate complex relationships between entities, track lateral movement, and map incident timelines in an interactive graph interface.

## Key Features

*   **Interactive Graph Visualization**: Render and interact with nodes and edges representing IR entities.
*   **Persistence**: Automatically saves and loads graph data to/from JSON.
*   **Category Management**: Specialized admin page to create, edit, and delete node categories with custom icon support.
*   **Customization**: Curated set of 20+ built-in icons for common IR entities (Workstations, Servers, Cloud assets, etc.).
*   **Multi-Graph Support**: Manage separate graphs for different investigations.
*   **Export/Import**: 
    *   Export current view to PNG for reports.
    *   Export/Import graphs as portable JSON files to share with other analysts.
*   **Modern UI**: Sleek, minimalist design with icon-rich dropdowns and responsive layout.

## Installation

This project is built with Python 3.10+ and uses [uv](https://github.com/astral-sh/uv) (or standard `pip`) for dependency management.

### Prerequisites
*   Python 3.10 or higher
*   `uv` (recommended) or `pip`

### Setup Steps

1.  **Clone the repository**
    ```bash
    git clone <repository_url>
    cd ir-graph
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

The easiest way to start the server is to use the provided script (which checks for a running instance):

```bash
./start_server.sh
```

Alternatively, you can run the dev server directly:
    
```bash
python src/http_app/dev_server.py
```
    
The server will start at `http://localhost:8000`.

### Key Operations
*   **Access the UI**: Open your browser to `http://localhost:8000`.
*   **Manage Categories**: Click the ⚙️ icon in the sidebar header to access the Category Manager.
*   **Save/Load**: Data is automatically saved to `graphs.json` and `config.json`.
*   **Export/Import**: Use the **Actions** section in the sidebar to export to PNG/JSON or import a graph.

## Roadmap & Status

### Implemented
- [x] **Core Graph**: Node/Edge creation and manipulation.
- [x] **Persistence**: Auto-saving to JSON (graphs and UI configuration).
- [x] **Category Management**: Dedicated UI for full CRUD operations on categories and custom icon uploads.
- [x] **Visuals**: 20+ built-in high-quality SVG icons for IR entities.
- [x] **Management**: Multi-graph switching and portable JSON Export/Import.
- [x] **Interaction**:
    -   Radial Context Menus for nodes and edges.
    -   Drag-and-drop edge creation (Edgehandles).
    -   Undo/Redo support.
    -   Icon-rich category pickers.
- [x] **Serving**: FastAPI backend with static file serving.

### Future Work
- [ ] **Database Integration**: Migrate from JSON to SQLite/Postgres for scalable persistence.
- [ ] **Advanced Views**:
    -   *Lateral Movement Graph*: Specialized layout for attack paths.
    -   *Timeline Graph*: Temporal visualization of events.
- [ ] **Theming**: UI-configurable color schemes.
