from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import timedelta
from app.utils.auth import create_token
from app.utils.password import verify_password, get_password_hash
from app.config import settings
from app.database import get_db
from app.models.admin import Admin
from pydantic import BaseModel

router = APIRouter()

# 管理员登录请求模型
class AdminLoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
    """
    管理员登录
    """
    # 从数据库查询管理员信息
    admin = db.query(Admin).filter(Admin.username == request.username).first()
    
    # 验证管理员是否存在及密码是否正确
    if not admin or not verify_password(request.password, admin.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    
    # 验证管理员状态
    if admin.status != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用"
        )
    
    # 更新最后登录时间
    admin.last_login_time = func.now()
    db.commit()
    
    # 创建token
    token_data = {
        "sub": str(admin.admin_id),
        "username": admin.username,
        "role": "admin",
        "admin_role": admin.role  # 0: 超级管理员, 1: 普通管理员
    }
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_token(token_data, expires)
    
    # 构建管理员信息
    adminInfo = {
        "adminId": admin.admin_id,
        "username": admin.username,
        "name": admin.name,
        "phone": admin.phone,
        "role": admin.role
    }
    
    return {
        "code": 0,
        "msg": "登录成功",
        "data": {
            "token": token,
            "adminInfo": adminInfo
        }
    }

# 创建管理员请求模型（仅超级管理员可用）
class CreateAdminRequest(BaseModel):
    username: str
    password: str
    name: str
    phone: str
    role: int = 1  # 默认为普通管理员

@router.post("/create")
async def create_admin(
    request: CreateAdminRequest, 
    db: Session = Depends(get_db),
    # 这里应该添加一个当前管理员验证的依赖项，确保是超级管理员在操作
):
    """
    创建管理员（仅超级管理员可用）
    """
    # 检查用户名是否已存在
    existing_admin = db.query(Admin).filter(Admin.username == request.username).first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该用户名已存在"
        )
    
    # 创建新管理员
    admin = Admin(
        username=request.username,
        password=get_password_hash(request.password),
        name=request.name,
        phone=request.phone,
        role=request.role,
        status=1  # 正常状态
    )
    
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    return {
        "code": 0,
        "msg": "管理员创建成功",
        "data": {
            "adminId": admin.admin_id
        }
    }