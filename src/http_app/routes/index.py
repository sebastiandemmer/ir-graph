from fastapi import APIRouter, Request, Security
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from http_app.templates import templates

# from .auth import decode_jwt

router = APIRouter()

@router.get("/", response_class=HTMLResponse, include_in_schema=True)
# async def hello(request: Request, jwt_token=Security(decode_jwt)):
async def hello(request: Request):
    return templates.TemplateResponse(
        name="index.html",
        request=request,
        context={},
    )

