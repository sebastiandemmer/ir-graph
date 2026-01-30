from common import AppConfig
from http_app import context


from fastapi import Request

def get_app_config(request: Request) -> AppConfig:
    return request.app.state.app_config