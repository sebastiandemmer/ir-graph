from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


from http_app.routes import (
    api,
    index
    # user_registered_hook,
)


def init_routes(app: FastAPI) -> None:
    app.include_router(api.router)
    app.include_router(index.router)
    app.mount("/static", StaticFiles(directory="http_app/static"), name="static")
    # app.include_router(static.router)
    # app.include_router(user_registered_hook.router)