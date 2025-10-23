from fastapi import APIRouter, Depends

from common import AppConfig
from http_app.dependencies import get_app_config

router = APIRouter()

@router.get("/config")
async def get_ui_config(app_config: AppConfig = Depends(get_app_config)):
    return app_config.UI_CONFIG