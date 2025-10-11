from irgraph.Edge import Edge
from irgraph.Node import Node
from irgraph.Graph import Graph

test_node = Node("first node")
test_node_2 = Node("second node")
test_edge = Edge(test_node,test_node)
test_edge.directed = False
test_edge_2 = Edge(test_node, test_node_2)
print(test_node)
print(test_edge)

graph = Graph(nodes=[test_node, test_node_2], edges=[test_edge, test_edge_2])
nodes = [test_node, test_node_2]
graph.add_nodes(nodes)
print(graph)