import os
import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.api.api import router as api_router
from app.core.config import settings
from app.core.middleware import register_middlewares
from app.core.events import register_app_events
from app.db.init_db import init_db
from app.db.session import SessionLocal

# 创建必要的目录结构
def ensure_dir(dir_path):
    """确保目录存在，如果不存在则创建"""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        print(f"Created directory: {dir_path}")

# 创建静态文件主目录和子目录
static_path = "static"
ensure_dir(static_path)

# 创建常用的静态资源子目录
ensure_dir(os.path.join(static_path, "uploads"))
ensure_dir(os.path.join(static_path, "images"))
ensure_dir(os.path.join(static_path, "css"))
ensure_dir(os.path.join(static_path, "js"))
ensure_dir(os.path.join(static_path, "icons"))
ensure_dir(os.path.join(static_path, "uploads", "images"))

# 创建FastAPI应用
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.PROJECT_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 设置CORS
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        # allow_origins=["http://localhost:3000"], 
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# 注册中间件
register_middlewares(app)

# 注册事件处理器
register_app_events(app)

# 挂载静态文件目录
app.mount("/static", StaticFiles(directory=static_path), name="static")

# 添加API路由
app.include_router(api_router, prefix=settings.API_V1_STR)

# 初始化数据库
@app.on_event("startup")
async def initialize_db():
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()

# 直接运行main.py时启动服务器
if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host=settings.SERVER_HOST, 
        port=settings.SERVER_PORT, 
        reload=settings.DEBUG,
        workers=settings.WORKERS
    )