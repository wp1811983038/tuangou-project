from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import user as user_router
from app.routers import merchant as merchant_router
from app.routers import admin as admin_router
from app.config import settings
from app.database import Base, engine
from app.routers import merchant_admin as merchant_admin_router

# 在已有的路由注册代码下方添加

# 创建数据库表（此操作假设数据库已存在）
Base.metadata.create_all(bind=engine)

# 创建FastAPI应用
app = FastAPI(
    title="团购小程序API",
    description="团购小程序后端API",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境应该设置为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(user_router.router, prefix="/api/user", tags=["用户"])
app.include_router(merchant_router.router, prefix="/api/merchant", tags=["商户"])
app.include_router(admin_router.router, prefix="/api/admin", tags=["管理员"])
app.include_router(merchant_admin_router.router, prefix="/api/admin", tags=["管理员-商户管理"])

@app.get("/")
async def root():
    return {"message": "欢迎使用团购小程序API"}
