
import json
import logging

from irgraph.Graph import Graph
from irgraph.Node import Node

import os

class Graphs(object):
    def __init__(self):
        self.graphs = []
        # Resolves to src/data/graphs.json regardless of CWD
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        # Logic check:
        # __file__ = src/irgraph/Graphs.py
        # dirname = src/irgraph
        # dirname = src
        # We want src/data/graphs.json
        # Wait, data is in src/data.
        # So we want to go up one level from irgraph to src.
        
        # __file__ = src/irgraph/Graphs.py
        # dirname(__file__) = src/irgraph
        # dirname(src/irgraph) = src
        # join(src, 'data', 'graphs.json')
        
        src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
        self.json_file_path = os.path.join(src_dir, 'data', 'graphs.json')

    def get_graph_by_id(self, graph_id: int):
        if 0 <= graph_id < len(self.graphs):
            return self.graphs[graph_id]
        return None

    def load_from_json(self) -> None:
        logging.info("reading graph from file {filepath}")
        with open(self.json_file_path) as json_file:
            graphs_json = json.load(json_file).get("graphs")
            self.graphs = list(map(self.graph_from_dict, graphs_json))
        
    def graph_from_dict(self, graph_object: dict):
            graph = Graph(name=graph_object.get("name"))
            for node in graph_object.get("nodes", []):
                new_node = Node(
                    name=node.get("name"), 
                    category=node.get("category", None), 
                    position_x=node.get("position_x", None), 
                    position_y=node.get("position_y", None),
                    parent=node.get("parent", None)
                )
                graph.add_node(new_node)
            for edge in graph_object.get("edges", []):
                graph.add_edge_by_node_names(from_name=edge.get("start"), to_name=edge.get("end"), directed=edge.get("directed", True), description=edge.get("description"), style=edge.get("style", "solid"))
            return graph

    def delete_graph(self, graph_id: int) -> bool:
        if 0 <= graph_id < len(self.graphs):
            del self.graphs[graph_id]
            return True
        return False
    
    def update_graph_name(self, graph_id: int, new_name: str) -> bool:
        graph = self.get_graph_by_id(graph_id)
        if graph:
            graph.name = new_name
            return True
        return False

    def save_to_json(self) -> None:
        logging.info("Writing graph to file {filepath}")
        with open(self.json_file_path, 'w') as json_file:
            json_file.write(
                json.dumps(
                    {'graphs':
                        [graph.toJSON() for graph in self.graphs]
                    }, 
                    indent=4)
                )