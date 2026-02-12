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
            raise ValueError(f"Start node {edge.start.name} is not in graph")
        
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

    def add_edge_by_node_names(self, from_name: str, to_name: str, directed: bool = True, description: str = None, style: str = "solid") -> Edge | None:
        assert isinstance(from_name, str), TypeError(f"Got {from_name} instead of <str>")
        assert isinstance(to_name, str), TypeError(f"Got {to_name} instead of <str>")
        
        start_node = self.get_node_by_name(from_name)
        end_node = self.get_node_by_name(to_name)
        if start_node is None or end_node is None:
            return "Node names incorrect"
        else:
            new_edge = Edge(start=start_node, end=end_node, directed=directed, description=description, style=style)
            self.add_edge(new_edge)
            return new_edge

    def delete_edge(self, start_node: str, end_node: str) -> bool:
        for i, edge in enumerate(self.edges):
            if edge.start.name == start_node and edge.end.name == end_node:
                del self.edges[i]
                return True
        return False

    def delete_node(self, node_name: str) -> bool:
        """Deletes a node by name and all associated edges."""
        node_to_delete = self.get_node_by_name(node_name)
        if not node_to_delete:
            return False
        
        # Remove associated edges
        self.edges = [e for e in self.edges if e.start.name != node_name and e.end.name != node_name]
        
        # Remove node
        self.nodes = [n for n in self.nodes if n.name != node_name]
        
        # Clear parent references in remaining nodes
        for node in self.nodes:
            if node.parent == node_name:
                node.parent = None

        return True

    def update_node(self, old_name: str, new_name: str, new_category: str = None, new_parent: str = None) -> bool:
        """Updates a node's name and optional category."""
        node = self.get_node_by_name(old_name)
        if not node:
            return False

        if new_name != old_name:
            if self.get_node_by_name(new_name):
                return False # New name already exists
            node.name = new_name
            
        if new_category is not None:
            node.category = new_category
        
        # We allow setting parent to None (ungrouping) by explicitly passing something if needed,
        # but here the arg default is None which implies "no change" typically in this pattern.
        # However, to allow clearing, we might need a sentinel or check if argument was provided.
        # For simplicity in this project's style so far:
        # If new_parent is passed (not None), we update it.
        # To clear it, we might need an explicit empty string or specific None handling if we change the signature.
        # Given the current pattern:
        if new_parent is not None:
            # If empty string, treat as removing parent
            if new_parent == "":
                node.parent = None
            else:
                node.parent = new_parent
            
        return True

    def update_edge(self, start_node: str, end_node: str, description: str, style: str = None) -> bool:
        for edge in self.edges:
            if edge.start.name == start_node and edge.end.name == end_node:
                edge.description = description
                if style is not None:
                    edge.style = style
                return True
        return False

    def toJSON(self):
        return {
            'name': self.name,
            'nodes': [vars(node) for node in self.nodes],
            'edges': [ edge.toJSON() for edge in self.edges]
        }