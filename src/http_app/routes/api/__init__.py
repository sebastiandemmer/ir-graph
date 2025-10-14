from fastapi import APIRouter

from . import graphs

router = APIRouter(prefix="/api")

router.include_router(graphs.router)