from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.utils.auth import create_token
from app.utils.wechat import get_openid
from app.config import settings
from app.database import get_db
from app.models.user import User
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()

# 微信登录请求模型
class WechatLoginRequest(BaseModel):
    code: str
    userInfo: Dict[str, Any]

@router.post("/login")
async def user_login(request: WechatLoginRequest, db: Session = Depends(get_db)):
    """
    用户通过微信登录
    """
    # 获取openid
    wx_result = get_openid(request.code)
    
    if not wx_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=wx_result["msg"]
        )
    
    openid = wx_result["openid"]
    
    # 查询用户是否存在
    user = db.query(User).filter(User.openid == openid).first()
    
    if not user:
        # 新用户，创建记录
        user = User(
            openid=openid,
            nickname=request.userInfo.get("nickName", ""),
            avatar=request.userInfo.get("avatarUrl", ""),
            gender=request.userInfo.get("gender", 0)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # 更新用户登录时间
        user.last_login_time = func.now()
        db.commit()
    
    # 创建token
    token_data = {
        "sub": str(user.user_id),
        "openid": openid,
        "role": "user"
    }
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_token(token_data, expires)
    
    # 构建用户信息
    userInfo = {
        "userId": user.user_id,
        "nickname": user.nickname,
        "avatar": user.avatar,
        "phone": user.phone
    }
    
    return {
        "code": 0,
        "msg": "登录成功",
        "data": {
            "token": token,
            "userInfo": userInfo
        }
    }