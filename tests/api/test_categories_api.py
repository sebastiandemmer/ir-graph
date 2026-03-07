import io
import pytest
from unittest.mock import patch
from pathlib import Path


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def seed_categories(client):
    """
    Seed app_config with a known set of categories before each test
    and patch save_ui_config so no real file is written.
    """
    from common.config import NodeCategoryConfig, UIConfig
    app = client.app
    app.state.app_config.UI_CONFIG = UIConfig(
        node_categories=[
            NodeCategoryConfig(name="Default"),
            NodeCategoryConfig(name="Workstation", icon="/static/assets/workstation.svg"),
            NodeCategoryConfig(name="Database", icon="/static/assets/database.svg"),
        ],
        color_schemes={},
    )
    # Patch at class level (required for Pydantic BaseSettings)
    with patch.object(
        app.state.app_config.__class__, "save_ui_config", autospec=True
    ) as mock_save:
        yield mock_save


# ── List ─────────────────────────────────────────────────────────────────────

def test_list_categories(client, seed_categories):
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    names = [c["name"] for c in data]
    assert "Default" in names
    assert "Workstation" in names


# ── Create ────────────────────────────────────────────────────────────────────

def test_create_category(client, seed_categories):
    response = client.post("/api/categories", json={"name": "Jump Server"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Jump Server"
    assert data["icon"] is None
    seed_categories.assert_called_once()


def test_create_category_with_icon(client, seed_categories):
    response = client.post(
        "/api/categories",
        json={"name": "Printer", "icon": "/static/assets/printer.svg"}
    )
    assert response.status_code == 201
    assert response.json()["icon"] == "/static/assets/printer.svg"


def test_create_duplicate_returns_409(client, seed_categories):
    response = client.post("/api/categories", json={"name": "Workstation"})
    assert response.status_code == 409


# ── Update ────────────────────────────────────────────────────────────────────

def test_update_category_name(client, seed_categories):
    response = client.patch("/api/categories/Workstation", json={"name": "Laptop"})
    assert response.status_code == 200
    assert response.json()["name"] == "Laptop"
    seed_categories.assert_called_once()


def test_update_category_icon(client, seed_categories):
    response = client.patch("/api/categories/Database", json={"icon": "/static/assets/db_new.svg"})
    assert response.status_code == 200
    assert response.json()["icon"] == "/static/assets/db_new.svg"


def test_update_category_not_found(client, seed_categories):
    response = client.patch("/api/categories/NonExistent", json={"name": "Foo"})
    assert response.status_code == 404


def test_update_category_name_collision(client, seed_categories):
    response = client.patch("/api/categories/Workstation", json={"name": "Database"})
    assert response.status_code == 409


def test_rename_default_returns_400(client, seed_categories):
    response = client.patch("/api/categories/Default", json={"name": "SomethingElse"})
    assert response.status_code == 400


# ── Delete ────────────────────────────────────────────────────────────────────

def test_delete_category(client, seed_categories):
    response = client.delete("/api/categories/Workstation")
    assert response.status_code == 204
    seed_categories.assert_called_once()

    cats = client.get("/api/categories").json()
    names = [c["name"] for c in cats]
    assert "Workstation" not in names


def test_delete_default_returns_400(client, seed_categories):
    response = client.delete("/api/categories/Default")
    assert response.status_code == 400


def test_delete_nonexistent_returns_404(client, seed_categories):
    response = client.delete("/api/categories/GhostCategory")
    assert response.status_code == 404


# ── Icon Upload ───────────────────────────────────────────────────────────────

def test_upload_icon_success(client, seed_categories, tmp_path):
    fake_svg = b'<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    assets_dir = tmp_path / "assets"
    assets_dir.mkdir()

    with patch("http_app.routes.api.categories._get_assets_dir", return_value=assets_dir):
        response = client.post(
            "/api/categories/Workstation/icon",
            files={"file": ("test_icon.svg", io.BytesIO(fake_svg), "image/svg+xml")},
        )

    assert response.status_code == 200
    data = response.json()
    assert "icon" in data
    assert data["icon"].endswith(".svg")
    assert data["icon"].startswith("/static/assets/")
    seed_categories.assert_called_once()


def test_upload_icon_invalid_extension(client, seed_categories):
    response = client.post(
        "/api/categories/Workstation/icon",
        files={"file": ("icon.exe", io.BytesIO(b"not an image"), "application/octet-stream")},
    )
    assert response.status_code == 400


def test_upload_icon_category_not_found(client, seed_categories, tmp_path):
    assets_dir = tmp_path / "assets"
    assets_dir.mkdir()
    with patch("http_app.routes.api.categories._get_assets_dir", return_value=assets_dir):
        response = client.post(
            "/api/categories/GhostCategory/icon",
            files={"file": ("icon.svg", io.BytesIO(b"<svg/>"), "image/svg+xml")},
        )
    assert response.status_code == 404
