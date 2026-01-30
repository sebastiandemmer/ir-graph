import pytest
from irgraph.Node import Node

def test_node_initialization():
    node = Node(name="TestNode", category="TestCategory", position_x=10, position_y=20)
    assert node.name == "TestNode"
    assert node.category == "TestCategory"
    assert node.position_x == 10
    assert node.position_y == 20

def test_node_defaults():
    node = Node(name="DefaultNode")
    assert node.name == "DefaultNode"
    assert node.category == "Default"
    assert node.position_x is None
    assert node.position_y is None

def test_node_repr():
    node = Node(name="ReprNode")
    assert repr(node) == "Node(name='ReprNode')"

def test_node_str():
    node = Node(name="StrNode")
    assert str(node) == "Node: 'StrNode'"
