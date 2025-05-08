from datetime import datetime
from typing import List, Optional, Union

from pydantic import BaseModel, Field, validator

from app.schemas.common import PaginationParams
from app.schemas.merchant import Merchant
from app.schemas.product import Product
from app.schemas.user import User


class GroupBase(BaseModel):
    """团购基础信息"""
    title: str
    cover_image: str
    description: Optional[str] = None
    price: float
    original_price: float
    min_participants: int = 2
    max_participants: Optional[int] = None
    status: int = 1  # 0-未开始, 1-进行中, 2-已成功, 3-已失败
    start_time: datetime
    end_time: datetime
    is_featured: bool = False
    sort_order: int = 0


class GroupCreate(BaseModel):
    """创建团购请求模型"""
    product_id: int
    title: str
    cover_image: Optional[str] = None
    description: Optional[str] = None
    price: float
    min_participants: int = 2
    max_participants: Optional[int] = None
    duration_days: int = Field(..., ge=1, le=30)
    is_featured: bool = False

    @validator('min_participants')
    def min_participants_must_ge_two(cls, v):
        if v < 2:
            raise ValueError('最小成团人数不能小于2')
        return v

    @validator('max_participants')
    def max_participants_must_ge_min(cls, v, values):
        if v is not None and 'min_participants' in values and v < values['min_participants']:
            raise ValueError('最大成团人数不能小于最小成团人数')
        return v

    @validator('price')
    def price_must_ge_zero(cls, v):
        if v <= 0:
            raise ValueError('价格必须大于0')
        return v


class GroupUpdate(BaseModel):
    """更新团购请求模型"""
    title: Optional[str] = None
    cover_image: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    min_participants: Optional[int] = None
    max_participants: Optional[int] = None
    end_time: Optional[datetime] = None
    is_featured: Optional[bool] = None
    sort_order: Optional[int] = None
    status: Optional[int] = None

    @validator('min_participants')
    def min_participants_must_ge_two(cls, v):
        if v is not None and v < 2:
            raise ValueError('最小成团人数不能小于2')
        return v

    @validator('max_participants')
    def max_participants_must_ge_min(cls, v, values):
        if v is not None and 'min_participants' in values and values['min_participants'] is not None and v < values['min_participants']:
            raise ValueError('最大成团人数不能小于最小成团人数')
        return v

    @validator('price')
    def price_must_ge_zero(cls, v):
        if v is not None and v <= 0:
            raise ValueError('价格必须大于0')
        return v


class GroupInDB(GroupBase):
    """数据库中的团购模型"""
    id: int
    merchant_id: int
    product_id: int
    current_participants: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class GroupParticipantBase(BaseModel):
    """团购参与者基础信息"""
    is_leader: bool = False
    status: int = 1  # 0-已取消, 1-已参与, 2-已支付


class GroupParticipantCreate(BaseModel):
    """创建团购参与请求模型"""
    group_id: int


class GroupParticipant(GroupParticipantBase):
    """团购参与者响应模型"""
    id: int
    group_id: int
    user_id: int
    user: Optional[User] = None
    join_time: datetime

    class Config:
        orm_mode = True


class Group(GroupBase):
    """团购响应模型"""
    id: int
    merchant_id: int
    product_id: int
    current_participants: int = 0
    merchant: Optional[Merchant] = None
    product: Optional[Product] = None
    remaining_seconds: Optional[int] = None
    remaining_count: Optional[int] = None
    participants: List[GroupParticipant] = []
    is_joined: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class GroupQueryParams(PaginationParams):
    """团购查询参数"""
    keyword: Optional[str] = None
    merchant_id: Optional[int] = None
    product_id: Optional[int] = None
    status: Optional[int] = None
    is_featured: Optional[bool] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance: Optional[float] = None  # km