import pytest
from irgraph.Graph import Graph
from irgraph.Node import Node
from irgraph.Edge import Edge
import networkx as nx

def test_blast_radius():
    g = Graph("Test (agent)")
    a = Node("A")
    b = Node("B")
    c = Node("C")
    d = Node("D")
    
    g.add_nodes([a, b, c, d])
    g.add_edge_by_node_names("A", "B")
    g.add_edge_by_node_names("B", "C")
    
    # A -> B -> C
    # D (isolated)
    
    G = g.to_networkx()
    
    # Blast radius of A should be {B, C}
    radius_a = nx.descendants(G, "A")
    assert radius_a == {"B", "C"}
    
    # Blast radius of B should be {C}
    radius_b = nx.descendants(G, "B")
    assert radius_b == {"C"}
    
    # Blast radius of D should be empty
    radius_d = nx.descendants(G, "D")
    assert radius_d == set()

def test_blast_radius_cyclic():
    g = Graph("Cyclic (agent)")
    a = Node("A")
    b = Node("B")
    
    g.add_nodes([a, b])
    g.add_edge_by_node_names("A", "B")
    g.add_edge_by_node_names("B", "A")
    
    G = g.to_networkx()
    
    # In a cycle A <-> B, A should have B as descendant and B should have A as descendant
    assert nx.descendants(G, "A") == {"B"}
    assert nx.descendants(G, "B") == {"A"}
