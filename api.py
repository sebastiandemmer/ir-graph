from fastapi import FastAPI
from contextlib import asynccontextmanager
from pydantic import BaseModel, ConfigDict
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from irgraph.Edge import Edge
from irgraph.Node import Node
from irgraph.Graph import Graph
import json
import logging
from json import JSONDecodeError

class GraphModel(BaseModel):
    # model_config = ConfigDict(arbitrary_types_allowed=True)
    name: str


class EdgeModel(BaseModel):
    # model_config = ConfigDict(arbitrary_types_allowed=True)
    start_node: str
    end_node: str


class NodeModel(BaseModel):
    name: str
    position_x: int | None = None
    position_y: int | None = None
    category: str = "Default"

class NodesModel(BaseModel):
    nodes: list[NodeModel]


JSON_FILEPATH = 'graphs.json'

graphs = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    global graphs 
    try:
        graphs = load_from_json(JSON_FILEPATH)
    except JSONDecodeError:
        logging.error(f"Error loading graphs from {JSON_FILEPATH}")
        graphs = []
    yield
    save_to_json(JSON_FILEPATH)


app = FastAPI(lifespan=lifespan)




### ROUTES ###
@app.get("/", response_class=FileResponse)
async def root():
    return "static/index.html"
     

@app.get("/graphs/{graph_id}")
async def get_graphs(graph_id: int):
    return get_graph_by_id(graph_id)

@app.get("/graphs/")
async def get_graphs():
    return {"graphs":graphs}

@app.post("/graphs/")
async def create_graph(graph: GraphModel):
    new_graph = Graph(name=graph.name)
    graphs.append(new_graph)


@app.get("/graphs/{graph_id}/nodes")
async def get_edges(graph_id: int):
    return get_graph_by_id(graph_id).nodes

@app.post("/graphs/{graph_id}/nodes")
async def create_node(graph_id: int, node_model: NodeModel):
    graph = get_graph_by_id(graph_id)
    new_node = Node(name=node_model.name, category=node_model.category)
    graph.add_node(new_node)
    return graph

@app.patch("/graphs/{graph_id}/nodes")
async def update_all_nodes(graph_id: int, nodes_model: NodesModel):
    graph = get_graph_by_id(graph_id)
    for node_model in nodes_model.nodes:
        node = graph.get_node_by_name(node_model.name)
        node.position_x = node_model.position_x
        node.position_y = node_model.position_y
    return {"message": "Nodes updated"}
@app.get("/graphs/{graph_id}/edges")
async def get_edges(graph_id: int):
    return get_graph_by_id(graph_id).edges

@app.post("/graphs/{graph_id}/edges")
async def create_edge(graph_id: int, edge_model: EdgeModel):
    graph = get_graph_by_id(graph_id)
    start_node = graph.get_node_by_name(edge_model.start_node)
    end_node = graph.get_node_by_name(edge_model.end_node)
    if start_node is None or end_node is None:
        return "Node names incorrect"
    else:
        new_edge = Edge(start=start_node, end=end_node)
        graph.add_edge(new_edge)
    return graph

@app.post("/save")
async def save_graphs():
    save_to_json(JSON_FILEPATH)

app.mount("/static", StaticFiles(directory="static"), name="static")


### Helper functions ###

def get_graph_by_id(graph_id: int):
    if 0 <= graph_id < len(graphs):
        return graphs[graph_id]
    return None

def load_from_json(filepath: str) -> None:
    logging.info("reading graph from file {filepath}")
    with open(filepath) as json_file:
        graphs_json = json.load(json_file).get("graphs")
        graphs = list(map(graph_from_dict, graphs_json))
    return graphs
    
def graph_from_dict(graph_object: dict):
        graph = Graph(name=graph_object.get("name"))
        for node in graph_object.get("nodes", []):
            new_node = Node(name=node.get("name"), category=node.get("category", None), position_x=node.get("position_x", None), position_y=node.get("position_y", None))
            graph.add_node(new_node)
        for edge in graph_object.get("edges", []):
            graph.add_edge_by_node_names(from_name=edge.get("start"), to_name=edge.get("end"))
        return graph

def save_to_json(filepath: str) -> None:
    logging.info("Writing graph to file {filepath}")
    with open(filepath, 'w') as json_file:
        json_file.write(
            json.dumps(
                {'graphs':
                    [graph.toJSON() for graph in graphs]
                }, 
                indent=4)
            )
        
