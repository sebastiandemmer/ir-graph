from typing import Iterable

from fastapi import APIRouter, status, HTTPException
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
    description: str | None = None

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
    graphs.save_to_json()


@router.get("/graphs/{graph_id}/nodes")
async def get_edges(graph_id: int):
    return graphs.get_graph_by_id(graph_id).nodes

@router.post("/graphs/{graph_id}/nodes")
async def create_node(graph_id: int, node_model: NodeModel):
    graph = graphs.get_graph_by_id(graph_id)
    new_node = Node(name=node_model.name, category=node_model.category)
    graph.add_node(new_node)
    graphs.save_to_json()
    return graph

@router.patch("/graphs/{graph_id}/nodes")
async def update_all_nodes(graph_id: int, nodes_model: NodesModel):
    graph = graphs.get_graph_by_id(graph_id)
    for node_model in nodes_model.nodes:
        node = graph.get_node_by_name(node_model.name)
        node.position_x = node_model.position_x
        node.position_y = node_model.position_y
    graphs.save_to_json()
    return {"message": "Nodes updated"}

@router.delete("/graphs/{graph_id}/nodes")
async def delete_node(graph_id: int, node_name: str):
    graph = graphs.get_graph_by_id(graph_id)
    if graph and graph.delete_node(node_name):
        graphs.save_to_json()
        return {"message": "Node deleted"}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

@router.patch("/graphs/{graph_id}/nodes/{node_name}")
async def update_node(graph_id: int, node_name: str, node_model: NodeModel):
    graph = graphs.get_graph_by_id(graph_id)
    # Use update_node instead of rename_node
    if graph and graph.update_node(node_name, node_model.name, node_model.category):
        graphs.save_to_json()
        return {"message": "Node updated"}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node or graph not found")

@router.get("/graphs/{graph_id}/edges")
async def get_edges(graph_id: int):
    return graphs.get_graph_by_id(graph_id).edges

@router.post("/graphs/{graph_id}/edges")
async def create_edge(graph_id: int, edge_model: EdgeModel):
    graph = graphs.get_graph_by_id(graph_id)
    start_node = graph.get_node_by_name(edge_model.start_node)
    end_node = graph.get_node_by_name(edge_model.end_node)
    if start_node is None or end_node is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Node names incorrect")
    else:
        new_edge = Edge(start=start_node, end=end_node, description=edge_model.description)
        graph.add_edge(new_edge)
        graphs.save_to_json()
    return graph

@router.delete("/graphs/{graph_id}")
async def delete_graph(graph_id: int):
    if graphs.delete_graph(graph_id):
        graphs.save_to_json()
        return {"message": "Graph deleted"}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Graph not found")

@router.patch("/graphs/{graph_id}")
async def update_graph(graph_id: int, graph_model: GraphModel):
    if graphs.update_graph_name(graph_id, graph_model.name):
        graphs.save_to_json()
        return {"message": "Graph updated"}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Graph not found")

@router.delete("/graphs/{graph_id}/edges")
async def delete_edge(graph_id: int, start_node: str, end_node: str):
    graph = graphs.get_graph_by_id(graph_id)
    if graph and graph.delete_edge(start_node, end_node):
        graphs.save_to_json()
        return {"message": "Edge deleted"}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edge not found")

@router.patch("/graphs/{graph_id}/edges")
async def update_edge(graph_id: int, edge_model: EdgeModel):
    graph = graphs.get_graph_by_id(graph_id)
    if graph and graph.update_edge(edge_model.start_node, edge_model.end_node, edge_model.description):
        graphs.save_to_json()
        return {"message": "Edge updated"}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edge not found")
