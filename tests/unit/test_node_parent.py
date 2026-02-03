import pytest
from irgraph.Node import Node
from irgraph.Graph import Graph

def test_node_parent_initialization():
    node = Node(name="ChildNode", parent="ParentGroup")
    assert node.name == "ChildNode"
    assert node.parent == "ParentGroup"

def test_node_parent_default():
    node = Node(name="OrphanNode")
    assert node.parent is None

def test_graph_update_node_parent():
    graph = Graph(name="TestGraph")
    node = Node(name="TestNode")
    graph.add_node(node)
    
    # Set parent
    graph.update_node("TestNode", "TestNode", new_parent="NewParent")
    assert node.parent == "NewParent"
    
    # Change parent
    graph.update_node("TestNode", "TestNode", new_parent="AnotherParent")
    assert node.parent == "AnotherParent"
    
    # Remove parent (simulate ungrouping with empty string or explicitly handling None if we decided on that, 
    # but based on code: new_parent="" sets it to None, new_parent=None does nothing)
    graph.update_node("TestNode", "TestNode", new_parent="")
    assert node.parent is None

def test_graph_add_node_with_parent():
    graph = Graph(name="TestGraph")
    node = Node(name="Child", parent="Group")
    graph.add_node(node)
    
    retrieved_node = graph.get_node_by_name("Child")
    assert retrieved_node.parent == "Group"

def test_delete_parent_clears_children():
    graph = Graph(name="TestGraph")
    parent = Node(name="Group")
    child = Node(name="Child", parent="Group")
    graph.add_node(parent)
    graph.add_node(child)
    
    assert graph.get_node_by_name("Child").parent == "Group"
    
    graph.delete_node("Group")
    
    assert graph.get_node_by_name("Group") is None
    assert graph.get_node_by_name("Child").parent is None
