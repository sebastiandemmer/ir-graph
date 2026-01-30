import pytest
from http_app import graphs

def test_get_config(client):
    # The config logic depends on AppConfig and files.
    # We might need to mock get_app_config or just test it returns defaults if file missing.
    response = client.get("/api/config")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)

def test_save_utils(client):
    response = client.post("/api/utils/save")
    assert response.status_code == 200
    
    # Verify our mock was called
    graphs.save_to_json.assert_called_once()
    assert response.json() == "success"
