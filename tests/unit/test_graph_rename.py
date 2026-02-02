import pytest
from irgraph.Graph import Graph
from irgraph.Node import Node
from irgraph.Edge import Edge

def test_rename_node_success():
    g = Graph(name="Test Graph")
    n1 = Node(name="A")
    n2 = Node(name="B")
    g.add_node(n1)
    g.add_node(n2)
    g.add_edge(Edge(start=n1, end=n2))
    
    # Rename A to C
    success = g.rename_node("A", "C")
    assert success is True
    assert g.get_node_by_name("A") is None
    assert g.get_node_by_name("C") is not None
    assert g.get_node_by_name("C").name == "C"
    
    # Check edges still point to the same object
    assert g.edges[0].start.name == "C"
    assert g.edges[0].end.name == "B"

def test_rename_node_duplicate_fails():
    g = Graph(name="Test Graph")
    n1 = Node(name="A")
    n2 = Node(name="B")
    g.add_node(n1)
    g.add_node(n2)
    
    # Try to rename A to B
    success = g.rename_node("A", "B")
    assert success is False
    assert g.get_node_by_name("A") is not None

def test_rename_node_not_found_fails():
    g = Graph(name="Test Graph")
    success = g.rename_node("X", "Y")
    assert success is False
