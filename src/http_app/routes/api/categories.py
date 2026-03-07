import os
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel

from common import AppConfig
from http_app.dependencies import get_app_config

router = APIRouter()

ALLOWED_EXTENSIONS = {".svg", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB

PROTECTED_CATEGORIES = {"Default"}


def _get_assets_dir() -> Path:
    """Return the absolute path to the static/assets directory."""
    return Path(__file__).parent.parent.parent / "static" / "assets"


def _find_category(app_config: AppConfig, name: str):
    for cat in app_config.UI_CONFIG.node_categories:
        if cat.name == name:
            return cat
    return None


# ── Pydantic models ────────────────────────────────────────────────────────────

class CategoryCreateModel(BaseModel):
    name: str
    icon: str | None = None


class CategoryUpdateModel(BaseModel):
    name: str | None = None
    icon: str | None = None


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/categories")
async def list_categories(app_config: AppConfig = Depends(get_app_config)):
    """Return all node categories."""
    return app_config.UI_CONFIG.node_categories


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreateModel,
    app_config: AppConfig = Depends(get_app_config),
):
    """Create a new node category."""
    if _find_category(app_config, body.name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category '{body.name}' already exists.",
        )

    from common.config import NodeCategoryConfig
    new_cat = NodeCategoryConfig(name=body.name, icon=body.icon)
    app_config.UI_CONFIG.node_categories.append(new_cat)
    app_config.save_ui_config()
    return new_cat


@router.patch("/categories/{name}")
async def update_category(
    name: str,
    body: CategoryUpdateModel,
    app_config: AppConfig = Depends(get_app_config),
):
    """Rename a category and/or update its icon path."""
    cat = _find_category(app_config, name)
    if cat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    if name in PROTECTED_CATEGORIES and body.name and body.name != name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{name}' cannot be renamed.",
        )

    if body.name and body.name != name:
        if _find_category(app_config, body.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Category '{body.name}' already exists.",
            )
        cat.name = body.name

    if body.icon is not None:
        cat.icon = body.icon

    app_config.save_ui_config()
    return cat


@router.delete("/categories/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    name: str,
    app_config: AppConfig = Depends(get_app_config),
):
    """Delete a category by name."""
    if name in PROTECTED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{name}' is protected and cannot be deleted.",
        )

    original_len = len(app_config.UI_CONFIG.node_categories)
    app_config.UI_CONFIG.node_categories = [
        c for c in app_config.UI_CONFIG.node_categories if c.name != name
    ]
    if len(app_config.UI_CONFIG.node_categories) == original_len:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    app_config.save_ui_config()


@router.post("/categories/{name}/icon")
async def upload_category_icon(
    name: str,
    file: UploadFile = File(...),
    app_config: AppConfig = Depends(get_app_config),
):
    """Upload an icon file for a category. Saves it to static/assets/ and updates the config."""
    cat = _find_category(app_config, name)
    if cat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    # Validate extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file_ext}' not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 2 MB limit.",
        )

    # Sanitise filename: use category name, lowercase, alphanumeric + underscore
    safe_name = re.sub(r"[^a-z0-9_]", "_", name.lower())
    filename = f"{safe_name}{file_ext}"
    assets_dir = _get_assets_dir()
    assets_dir.mkdir(parents=True, exist_ok=True)
    dest = assets_dir / filename

    with open(dest, "wb") as f:
        f.write(content)

    icon_url = f"/static/assets/{filename}"
    cat.icon = icon_url
    app_config.save_ui_config()

    return {"icon": icon_url, "filename": filename}
