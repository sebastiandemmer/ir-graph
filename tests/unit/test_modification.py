import pytest
from irgraph.Graph import Graph
from irgraph.Node import Node
from irgraph.Edge import Edge
from irgraph.Graphs import Graphs

def test_delete_edge():
    graph = Graph()
    n1 = Node("N1")
    n2 = Node("N2")
    graph.add_nodes([n1, n2])
    graph.add_edge_by_node_names("N1", "N2")
    
    assert len(graph.edges) == 1
    assert graph.delete_edge("N1", "N2") is True
    assert len(graph.edges) == 0
    assert graph.delete_edge("N1", "N2") is False

def test_update_edge():
    graph = Graph()
    n1 = Node("N1")
    n2 = Node("N2")
    graph.add_nodes([n1, n2])
    graph.add_edge_by_node_names("N1", "N2", description="Old Desc")
    
    assert graph.edges[0].description == "Old Desc"
    assert graph.update_edge("N1", "N2", "New Desc") is True
    assert graph.edges[0].description == "New Desc"
    assert graph.update_edge("N1", "N3", "New Desc") is False

def test_graphs_collection_delete():
    graphs = Graphs()
    g1 = Graph(name="G1")
    g2 = Graph(name="G2")
    graphs.graphs = [g1, g2]
    
    assert graphs.delete_graph(0) is True
    assert len(graphs.graphs) == 1
    assert graphs.graphs[0].name == "G2"
    assert graphs.delete_graph(10) is False

def test_graphs_collection_update():
    graphs = Graphs()
    g1 = Graph(name="G1")
    graphs.graphs = [g1]
    
    assert graphs.update_graph_name(0, "G1_Updated") is True
    assert graphs.graphs[0].name == "G1_Updated"
    assert graphs.update_graph_name(10, "G1_Updated") is False

def test_delete_node():
    graph = Graph()
    n1 = Node("N1")
    n2 = Node("N2")
    graph.add_nodes([n1, n2])
    graph.add_edge_by_node_names("N1", "N2")
    
    assert len(graph.nodes) == 2
    assert len(graph.edges) == 1
    assert graph.delete_node("N1") is True
    assert len(graph.nodes) == 1
    assert len(graph.edges) == 0
    assert graph.get_node_by_name("N1") is None
    assert graph.delete_node("N1") is False
