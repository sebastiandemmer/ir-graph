
import json
import logging

from irgraph.Graph import Graph
from irgraph.Node import Node

class Graphs(object):
    def __init__(self):
        self.graphs = []
        self.json_file_path = 'data/graphs.json'

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
                new_node = Node(name=node.get("name"), category=node.get("category", None), position_x=node.get("position_x", None), position_y=node.get("position_y", None))
                graph.add_node(new_node)
            for edge in graph_object.get("edges", []):
                graph.add_edge_by_node_names(from_name=edge.get("start"), to_name=edge.get("end"))
            return graph

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