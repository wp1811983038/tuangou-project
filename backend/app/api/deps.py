from typing import Dict, List, Any, Union, Optional, Tuple, Generator, TypeVar, Generic, Callable
from datetime import datetime
from fastapi import Depends, HTTPException, status, Security, Query
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from app.crud import crud_user  # 导入crud_user实例

from app.core.config import settings
from app.core.security import ALGORITHM
from app.db.session import SessionLocal
from app.models.user import User
from app.models.merchant import Merchant
from app.schemas.token import TokenPayload
from app.core.redis import RedisClient
from app.core.constants import CACHE_EXPIRE_TIME, CACHE_KEY_PREFIX
from app.models.admin import Admin  # 添加此导入

# OAuth2 密码流认证
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

# API密钥认证（用于管理员API）
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def get_db() -> Generator:
    """
    获取数据库会话
    
    Yields:
        数据库会话
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """
    获取当前用户
    
    Args:
        db: 数据库会话
        token: JWT令牌
        
    Returns:
        当前用户对象
        
    Raises:
        HTTPException: 认证失败或用户不存在
    """
    try:
        # 先从缓存获取用户信息
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        
        # 检查令牌是否过期
        if token_data.exp < datetime.now().timestamp():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="令牌已过期",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        user_id = int(token_data.sub)
        cache_key = f"{CACHE_KEY_PREFIX['user']}{user_id}"
        user_data = RedisClient.get(cache_key)
        
        if user_data:
            # 检查用户是否被禁用
            if not user_data.get("is_active", True):
                raise HTTPException(status_code=400, detail="用户已被禁用")
                
            # 从数据库获取完整用户信息
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="用户不存在"
                )
            return user
        
        # 缓存未命中，从数据库获取
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        # 更新缓存
        RedisClient.set(cache_key, {
            "id": user.id,
            "open_id": user.open_id,
            "nickname": user.nickname,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "merchant_id": user.merchant_id
        }, CACHE_EXPIRE_TIME["user"])
        
        return user
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无法验证凭据",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    获取当前活跃用户
    
    Args:
        current_user: 当前用户
        
    Returns:
        当前活跃用户
        
    Raises:
        HTTPException: 用户已禁用
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="用户已被禁用")
    return current_user


def get_current_merchant(
    current_user: User = Depends(get_current_active_user),
) -> Tuple[User, Merchant]:
    """
    获取当前商户用户
    
    Args:
        current_user: 当前用户
        
    Returns:
        (当前用户, 商户对象)
        
    Raises:
        HTTPException: 非商户用户
    """
    if not current_user.merchant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要商户权限"
        )
    
    merchant = db.query(Merchant).filter(
        Merchant.id == current_user.merchant_id
    ).first()
    
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商户不存在"
        )
    
    return current_user, merchant


# 通常在app/api/deps.py
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="无法验证凭据",
    headers={"WWW-Authenticate": "Bearer"},
)

from app.models.admin import Admin  # 添加此导入

def get_current_admin(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    """获取当前管理员用户"""
    try:
        # 解码JWT令牌
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        admin_id: str = payload.get("sub")
        if not admin_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # 从Admin模型查询而不是User模型
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise credentials_exception
    
    # 验证管理员状态
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理员账号已禁用"
        )
    
    return admin


def get_pagination_params(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量")
) -> Dict[str, int]:
    """
    获取分页参数
    
    Args:
        page: 页码
        page_size: 每页数量
        
    Returns:
        分页参数字典
    """
    skip = (page - 1) * page_size
    return {"skip": skip, "limit": page_size, "page": page, "page_size": page_size}