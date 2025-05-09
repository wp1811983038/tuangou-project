from datetime import datetime
from enum import Enum
from typing import List, Optional
from app.schemas.token import Token
from pydantic import BaseModel, EmailStr, Field, validator


class UserType(str, Enum):
    """用户类型"""
    NORMAL = "normal"
    MERCHANT = "merchant"
    ADMIN = "admin"


class UserBase(BaseModel):
    """用户基础信息"""
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    gender: Optional[int] = 0
    phone: Optional[str] = None


class UserCreate(UserBase):
    """创建用户请求模型"""
    open_id: str
    union_id: Optional[str] = None


class UserUpdate(UserBase):
    """更新用户请求模型"""
    pass


class UserInDB(UserBase):
    """数据库中的用户模型"""
    id: int
    open_id: str
    union_id: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    merchant_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class User(UserBase):
    """用户响应模型"""
    id: int
    is_admin: bool = False
    has_merchant: bool = False
    merchant_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfile(User):
    """用户详细资料响应模型"""
    order_count: int = 0
    review_count: int = 0
    favorite_count: int = 0


class WxLoginRequest(BaseModel):
    """微信登录请求模型"""
    code: str
    user_info: Optional[dict] = None


class WxLoginResponse(BaseModel):
    """微信登录响应模型"""
    token: Token
    user: User
    is_new_user: bool = False


class UserAddress(BaseModel):
    """用户地址模型"""
    id: Optional[int] = None
    recipient: str
    phone: str
    province: str
    city: str
    district: str
    detail: str
    is_default: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


class UserAddressCreate(BaseModel):
    """创建用户地址请求模型"""
    recipient: str = Field(..., min_length=2, max_length=64)
    phone: str = Field(..., min_length=11, max_length=11)
    province: str
    city: str
    district: str
    detail: str = Field(..., min_length=5, max_length=255)
    is_default: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @validator('phone')
    def validate_phone(cls, v):
        if not v.isdigit() or len(v) != 11:
            raise ValueError('手机号格式不正确')
        return v


class UserAddressUpdate(UserAddressCreate):
    """更新用户地址请求模型"""
    pass


class UserRegister(BaseModel):
    """用户注册请求模型"""
    phone: str = Field(..., min_length=11, max_length=11)
    password: str = Field(..., min_length=6, max_length=32)
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    gender: Optional[int] = 0
    
    @validator('phone')
    def validate_phone(cls, v):
        if not v.isdigit() or len(v) != 11:
            raise ValueError('手机号格式不正确')
        return v
        
    @validator('password')
    def validate_password(cls, v):
        # 密码至少包含数字和字母
        if not any(c.isdigit() for c in v) or not any(c.isalpha() for c in v):
            raise ValueError('密码必须包含数字和字母')
        return v

class PhoneLoginRequest(BaseModel):
    """手机号登录请求模型"""
    phone: str = Field(..., min_length=11, max_length=11)
    password: str = Field(..., min_length=6)
    
    @validator('phone')
    def validate_phone(cls, v):
        if not v.isdigit() or len(v) != 11:
            raise ValueError('手机号格式不正确')
        return v

class PasswordResetRequest(BaseModel):
    """密码重置请求模型"""
    phone: str
    old_password: Optional[str] = None
    new_password: str = Field(..., min_length=6, max_length=32)
    
    @validator('new_password')
    def validate_password(cls, v):
        if not any(c.isdigit() for c in v) or not any(c.isalpha() for c in v):
            raise ValueError('密码必须包含数字和字母')
        return v

class MerchantRegister(UserRegister):
    """商户注册请求模型"""
    merchant_name: str
    contact_name: str
    contact_phone: str
    business_license: Optional[str] = None