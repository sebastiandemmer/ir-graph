from irgraph.Node import Node

class Edge(object):
    
    def __init__(self, start: Node, end: Node, directed=True):
        self.start = start
        self.end = end
        self.directed = directed

    def __repr__(self):
        return f"Edge(start={repr(self.start)}, end={repr(self.end)}, directed={self.directed})"
    
    def __str__(self):
        return f"Edge: {self.start} --{">" if self.directed else ""} {self.end}"

    def toJSON(self):
        return {"start":self.start.name, "end": self.end.name, "directed": self.directed}