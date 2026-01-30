import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure src is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../src")))

from http_app import create_app

@pytest.fixture
def client():
    # Mock the global graphs object to avoid file operations
    from unittest.mock import MagicMock
    from http_app import graphs
    
    graphs.load_from_json = MagicMock()
    graphs.save_to_json = MagicMock()
    # Reset graphs list for each test
    graphs.graphs = []
    
    app = create_app()
    with TestClient(app) as c:
        yield c
