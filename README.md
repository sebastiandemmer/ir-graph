# IR Graph

## Installation
TODO 

## Usage

### How-Tos:
- install new package: `uv install <packagename>`
- activate environment: `source ~/python-venvs/ir-graph-2/.venv/bin/activate`
- run webapp: `fastapi dev api.py`

## Potential workflows (outdated)

Read with cyptoscape to render in HTML


## TODOs
- [x] rewrite static mount and redirect to index.html
- [x] persist node locations
(- [ ] read/write to sqlitedb)
- [x] read/write to JSON
- [x] add custom icons via svg/png strings
- [x] auto load/save json on server start/stop
- [x] render graph to png
- [ ] create config json (categories, icon paths, color scheme)
- [ ] create color schemes
- [ ] check out cyptoscape JS extensions
- [ ] improve multi-graph support
- [ ] split graph API for different renderings:
    - Entity Graph
    - Lateral Movement Graph
    - timeline Graph

