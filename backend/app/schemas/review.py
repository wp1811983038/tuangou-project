from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, validator

from app.schemas.common import PaginationParams
from app.schemas.user import User


class ReviewImageBase(BaseModel):
    """评价图片基础信息"""
    image_url: str
    sort_order: int = 0


class ReviewImageCreate(ReviewImageBase):
    """创建评价图片请求模型"""
    pass


class ReviewImage(ReviewImageBase):
    """评价图片响应模型"""
    id: int
    review_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewBase(BaseModel):
    """评价基础信息"""
    product_id: int
    content: Optional[str] = None
    rating: float = 5.0
    is_anonymous: bool = False


class ReviewCreate(ReviewBase):
    """创建评价请求模型"""
    order_id: int
    images: List[ReviewImageCreate] = []

    @validator('rating')
    def rating_must_in_range(cls, v):
        if v < 1 or v > 5:
            raise ValueError('评分必须在1-5之间')
        return v


class ReviewUpdate(BaseModel):
    """更新评价请求模型"""
    content: Optional[str] = None
    rating: Optional[float] = None
    is_anonymous: Optional[bool] = None
    status: Optional[int] = None
    reply_content: Optional[str] = None

    @validator('rating')
    def rating_must_in_range(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('评分必须在1-5之间')
        return v


class ReviewInDB(ReviewBase):
    """数据库中的评价模型"""
    id: int
    user_id: int
    order_id: Optional[int] = None
    status: int = 0  # 0-待审核, 1-已通过, 2-已拒绝
    reply_content: Optional[str] = None
    reply_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Review(ReviewBase):
    """评价响应模型"""
    id: int
    user_id: int
    order_id: Optional[int] = None
    status: int
    user: Optional[User] = None
    product_name: Optional[str] = None
    product_image: Optional[str] = None
    merchant_id: Optional[int] = None
    merchant_name: Optional[str] = None
    reply_content: Optional[str] = None
    reply_time: Optional[datetime] = None
    images: List[ReviewImage] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReviewQueryParams(PaginationParams):
    """评价查询参数"""
    product_id: Optional[int] = None
    merchant_id: Optional[int] = None
    user_id: Optional[int] = None
    status: Optional[int] = None
    min_rating: Optional[float] = None
    max_rating: Optional[float] = None
    has_reply: Optional[bool] = None
    has_image: Optional[bool] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None


class ReviewReplyRequest(BaseModel):
    """评价回复请求模型"""
    review_id: int
    reply_content: str = Field(..., min_length=1, max_length=500)