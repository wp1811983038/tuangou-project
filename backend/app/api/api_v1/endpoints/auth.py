from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.core.config import settings
from app.core.security import create_access_token
from app.services import user_service

router = APIRouter()


@router.post("/login", response_model=schemas.token.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取OAuth2访问令牌（用于API测试）
    """
    user = user_service.authenticate_user(
        db=db,
        username=form_data.username,
        password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="用户名或密码错误")
    
    # 生成访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@router.post("/wx-login", response_model=schemas.user.WxLoginResponse)
async def wx_login(
    login_data: schemas.user.WxLoginRequest,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    微信小程序登录
    """
    # 获取OpenID和UnionID
    auth_result = await user_service.code2session(login_data.code)
    
    # 登录或创建用户
    user, is_new_user, token = await user_service.login_or_create_user(
        db=db,
        open_id=auth_result["openid"],
        union_id=auth_result.get("unionid"),
        user_info=login_data.user_info
    )
    
    return {
        "token": token,
        "user": user,
        "is_new_user": is_new_user
    }


@router.post("/refresh-token", response_model=schemas.token.Token)
async def refresh_token(
    token: str = Body(...),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    刷新访问令牌
    """
    try:
        # 验证当前令牌
        current_user = deps.get_current_user(db=db, token=token)
        
        # 生成新令牌
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=str(current_user.id),
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    except HTTPException:
        raise HTTPException(status_code=401, detail="令牌无效或已过期")


@router.post("/logout")
async def logout(
    current_user: schemas.user.User = Depends(deps.get_current_active_user)
) -> Any:
    """
    退出登录
    """
    # 清除用户缓存
    from app.core.redis import RedisClient
    from app.core.constants import CACHE_KEY_PREFIX
    
    cache_key = f"{CACHE_KEY_PREFIX['user']}{current_user.id}"
    RedisClient.delete(cache_key)
    
    return {"message": "退出成功"}