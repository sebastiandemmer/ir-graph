from irgraph.Node import Node
from irgraph.Edge import Edge
from pydantic import GetCoreSchemaHandler
from pydantic_core import core_schema

class Graph(object):
    def __init__(self, name: str = "", nodes:list = [], edges: list = []):
        self.name = name
        self.nodes = []
        self.add_nodes(nodes)

        self.edges = []
        self.add_edges(edges)

    def __repr__(self):
        return f"Graph(nodes={self.nodes}, edges={self.edges})"

    def __str__(self):
        return f"Graph: Nodes: {list(map(str,self.nodes))}, Edges: {list(map(str, self.edges))}"


    # def __get_pydantic_core_schema__(
    #     self,
    #     source_type: type[str], # Use the type annotation here
    #     handler: GetCoreSchemaHandler
    # ) -> core_schema.CoreSchema:
    #     # This function will be called by Pydantic to generate a schema for the Graph type
    #     # You can define how Pydantic should validate and handle this type
    #     # For example, you could define a serialization or validation logic
    #     return core_schema.no_info_plain_validator_function(self._pydantic_validate_graph)

    # def _pydantic_validate_graph(self, graph_instance):
    #     # Add your validation logic for Graph instances here
    #     if not isinstance(graph_instance, Graph):
    #         raise ValueError("Expected an instance of Graph")
    #     return graph_instance # Return the validated instance

    def add_node(self, new_node: Node):
        if not isinstance(new_node, Node):
            raise TypeError("Node must be type 'Node'")
        for node in self.nodes:
            if node.name == new_node.name:
                return
        self.nodes.append(new_node)
        
    def add_nodes(self, nodes: [Node]):
        if isinstance(nodes, list):
            for node in nodes:
                self.add_node(node)
        else:
            raise TypeError("Nodes to add must be in a list")


    def add_edge(self, edge: Edge):
        if not isinstance(edge, Edge):
            raise TypeError("Node must be type 'Node'")

        if edge.start not in self.nodes:
            raise ValueError(f"Start node {edge.node} is not in graph")
        
        if edge.end not in self.nodes:
            raise ValueError(f"Start node {edge.end} is not in graph")

        self.edges.append(edge)
        
    def add_edges(self, edges: [Edge]):
        if isinstance(edges, list):
            for edge in edges:
                self.add_edge(edge)
        else:
            raise TypeError("Edges to add must be in a list")

    def get_node_by_name(self, name: str) -> Node | None:
        if isinstance(name, str):
            for node in self.nodes:
                if node.name == name:
                    return node
            return None
        else:
            raise TypeError("Edges to add must be in a list")

    def add_edge_by_node_names(self, from_name: str, to_name: str, directed: bool = True) -> Edge | None:
        assert isinstance(from_name, str), TypeError(f"Got {from_name} instead of <str>")
        assert isinstance(to_name, str), TypeError(f"Got {to_name} instead of <str>")
        
        start_node = self.get_node_by_name(from_name)
        end_node = self.get_node_by_name(to_name)
        if start_node is None or end_node is None:
            return "Node names incorrect"
        else:
            new_edge = Edge(start=start_node, end=end_node)
            self.add_edge(new_edge)
            return new_edge

    def toJSON(self):
        return {
            'name': self.name,
            'nodes': [vars(node) for node in self.nodes],
            'edges': [ edge.toJSON() for edge in self.edges]
        }