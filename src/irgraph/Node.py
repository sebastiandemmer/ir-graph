import datetime

class Node(object):
    
    def __init__(self, name: str, category: str = "Default", position_x: int = None, position_y: int = None, parent: str = None):
        self.name = name
        self.position_x = position_x
        self.position_y = position_y
        self.category = category
        self.parent = parent
        # self.created = datetime.datetime.utcnow()

    def __repr__(self):
        return f"Node(name='{self.name}')"
    
    def __str__(self):
        return f"Node: '{self.name}'"