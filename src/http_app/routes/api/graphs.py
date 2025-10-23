from typing import Iterable

from fastapi import APIRouter, status
from pydantic import BaseModel, ConfigDict
from http_app import graphs

from irgraph.Graph import Graph
from irgraph.Node import Node
from irgraph.Edge import Edge

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


router = APIRouter()

@router.get("/graphs/{graph_id}")
async def get_graphs(graph_id: int):
    return graphs.get_graph_by_id(graph_id)

@router.get("/graphs/")
async def get_graphs():
    return graphs.graphs

@router.post("/graphs/")
async def create_graph(graph: GraphModel):
    new_graph = Graph(name=graph.name)
    #TODO replace with proper append method
    graphs.graphs.append(new_graph)


@router.get("/graphs/{graph_id}/nodes")
async def get_edges(graph_id: int):
    return graphs.get_graph_by_id(graph_id).nodes

@router.post("/graphs/{graph_id}/nodes")
async def create_node(graph_id: int, node_model: NodeModel):
    graph = graphs.get_graph_by_id(graph_id)
    new_node = Node(name=node_model.name, category=node_model.category)
    graph.add_node(new_node)
    return graph

@router.patch("/graphs/{graph_id}/nodes")
async def update_all_nodes(graph_id: int, nodes_model: NodesModel):
    graph = graphs.get_graph_by_id(graph_id)
    for node_model in nodes_model.nodes:
        node = graph.get_node_by_name(node_model.name)
        node.position_x = node_model.position_x
        node.position_y = node_model.position_y
    return {"message": "Nodes updated"}

@router.get("/graphs/{graph_id}/edges")
async def get_edges(graph_id: int):
    return graphs.get_graph_by_id(graph_id).edges

@router.post("/graphs/{graph_id}/edges")
async def create_edge(graph_id: int, edge_model: EdgeModel):
    graph = graphs.get_graph_by_id(graph_id)
    start_node = graph.get_node_by_name(edge_model.start_node)
    end_node = graph.get_node_by_name(edge_model.end_node)
    if start_node is None or end_node is None:
        return "Node names incorrect"
    else:
        new_edge = Edge(start=start_node, end=end_node)
        graph.add_edge(new_edge)
    return graph
