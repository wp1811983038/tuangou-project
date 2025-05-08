from fastapi import APIRouter
from app.api.api_v1.api import api_router as api_v1_router

# API主路由
router = APIRouter()

# 挂载API V1版本路由
router.include_router(api_v1_router, prefix="/v1")