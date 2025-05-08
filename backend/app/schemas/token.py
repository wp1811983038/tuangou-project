from typing import List, Optional
from pydantic import BaseModel


class Token(BaseModel):
    """访问令牌"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    scope: Optional[str] = None


class TokenPayload(BaseModel):
    """令牌载荷"""
    sub: Optional[str] = None
    scopes: List[str] = []
    exp: Optional[int] = None


class TokenData(BaseModel):
    """令牌数据"""
    user_id: Optional[int] = None
    scopes: List[str] = []