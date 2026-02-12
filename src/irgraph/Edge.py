from irgraph.Node import Node

class Edge(object):
    
    def __init__(self, start: Node, end: Node, directed=True, description: str = None, style: str = "solid"):
        self.start = start
        self.end = end
        self.directed = directed
        self.description = description
        self.style = style

    def __repr__(self):
        return f"Edge(start={repr(self.start)}, end={repr(self.end)}, directed={self.directed}, description={repr(self.description)}, style={repr(self.style)})"
    
    def __str__(self):
        desc = f" ({self.description})" if self.description else ""
        return f"Edge: {self.start} --{">" if self.directed else ""} {self.end}{desc} [{self.style}]"

    def toJSON(self):
        return {"start":self.start.name, "end": self.end.name, "directed": self.directed, "description": self.description, "style": self.style}