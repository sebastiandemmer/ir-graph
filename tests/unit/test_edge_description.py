import pytest
from irgraph.Graph import Graph
from irgraph.Node import Node
from irgraph.Edge import Edge

def test_edge_description_initialization():
    n1 = Node("N1")
    n2 = Node("N2")
    edge = Edge(start=n1, end=n2, description="A connection")
    assert edge.description == "A connection"
    assert str(edge) == "Edge: Node: 'N1' --> Node: 'N2' (A connection)"

def test_edge_without_description():
    n1 = Node("N1")
    n2 = Node("N2")
    edge = Edge(start=n1, end=n2)
    assert edge.description is None
    assert str(edge) == "Edge: Node: 'N1' --> Node: 'N2'"

def test_graph_add_edge_with_description():
    graph = Graph()
    n1 = Node("N1")
    n2 = Node("N2")
    graph.add_nodes([n1, n2])
    
    edge = graph.add_edge_by_node_names("N1", "N2", description="Test Desc")
    assert edge.description == "Test Desc"
    assert graph.edges[0].description == "Test Desc"

def test_edge_serialization():
    n1 = Node("N1")
    n2 = Node("N2")
    edge = Edge(start=n1, end=n2, description="Desc")
    data = edge.toJSON()
    assert data["description"] == "Desc"
    assert data["start"] == "N1"
