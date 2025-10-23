from fastapi import APIRouter
from http_app import graphs

router = APIRouter()

@router.post("/utils/save")
async def save_graphs_to_json():
    graphs.save_to_json()
    return 'success'