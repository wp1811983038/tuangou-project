from datetime import datetime, timedelta
from typing import Dict, Optional

from jose import jwt

from app.core.config import settings


def create_token(subject: str, expires_delta: Optional[timedelta] = None, scopes: Optional[list] = None) -> str:
    """
    创建JWT令牌
    
    Args:
        subject: 令牌主题(通常为用户ID)
        expires_delta: 过期时间增量
        scopes: 权限范围列表
        
    Returns:
        JWT令牌
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    
    if scopes:
        to_encode["scopes"] = scopes
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> Dict:
    """
    解码JWT令牌
    
    Args:
        token: JWT令牌
        
    Returns:
        解码后的数据
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])