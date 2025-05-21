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
    # 使用 authenticate_by_phone 而不是 authenticate_user
    user = await user_service.authenticate_by_phone(
        db=db,
        phone=form_data.username,  # 使用用户名作为手机号
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


@router.post("/register", response_model=schemas.token.Token)
async def register_user(
    user_data: schemas.user.UserRegister,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    用户手机号注册
    """
    # 创建新用户
    user = await user_service.create_user_with_password(
        db=db,
        user_data=user_data
    )
    
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

@router.post("/merchant/register", response_model=schemas.token.Token)
async def register_merchant(
    merchant_data: schemas.user.MerchantRegister,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    商户注册
    """
    # 创建商户和关联用户
    user, _ = await user_service.create_merchant_with_password(
        db=db,
        merchant_data=merchant_data
    )
    
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

@router.post("/phone-login", response_model=schemas.token.Token)
async def phone_login(
    login_data: schemas.user.PhoneLoginRequest,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    手机号密码登录
    """
    user = await user_service.authenticate_by_phone(
        db=db,
        phone=login_data.phone,
        password=login_data.password
    )
    
    if not user:
        raise HTTPException(status_code=400, detail="手机号或密码错误")
    
    # 生成访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user_id": user.id,
        "is_merchant": user.merchant_id is not None
    }

@router.post("/reset-password", response_model=schemas.common.BooleanResponse)
async def reset_password(
    reset_data: schemas.user.PasswordResetRequest,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    重置密码（已登录用户）
    """
    result = await user_service.reset_password(
        db=db,
        reset_data=reset_data,
        user_id=current_user.id
    )
    
    return {"data": result}

@router.post("/forgot-password", response_model=schemas.common.BooleanResponse)
async def forgot_password(
    reset_data: schemas.user.PasswordResetRequest,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    忘记密码（未登录用户）
    
    注意：实际项目中需要验证码流程，此处简化处理
    """
    # 实际项目中应先验证手机验证码
    result = await user_service.reset_password(
        db=db,
        reset_data=reset_data
    )
    
    return {"data": result}


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