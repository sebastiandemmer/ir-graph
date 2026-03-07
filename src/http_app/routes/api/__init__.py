from fastapi import APIRouter

from . import categories, config, graphs, utils

router = APIRouter(prefix="/api")

router.include_router(categories.router)
router.include_router(graphs.router)
router.include_router(utils.router)
router.include_router(config.router)