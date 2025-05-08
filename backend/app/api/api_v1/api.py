from fastapi import APIRouter

from app.api.api_v1.endpoints import (
    auth,
    users,
    merchants,
    products,
    groups,
    orders,
    reviews,
    uploads,
    locations,
    messages,
    admin,
    stats,
    payments
)

# API V1主路由
api_router = APIRouter()

# 注册各模块路由
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(users.router, prefix="/users", tags=["用户"])
api_router.include_router(merchants.router, prefix="/merchants", tags=["商户"])
api_router.include_router(products.router, prefix="/products", tags=["商品"])
api_router.include_router(groups.router, prefix="/groups", tags=["团购"])
api_router.include_router(orders.router, prefix="/orders", tags=["订单"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["评价"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["上传"])
api_router.include_router(locations.router, prefix="/locations", tags=["位置"])
api_router.include_router(messages.router, prefix="/messages", tags=["消息"])
api_router.include_router(admin.router, prefix="/admin", tags=["管理"])
api_router.include_router(stats.router, prefix="/stats", tags=["统计"])
api_router.include_router(payments.router, prefix="/payments", tags=["支付"])