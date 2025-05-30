# backend/app/schemas/merchant.py
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, validator

from app.schemas.common import PaginationParams


class CategoryBase(BaseModel):
    """分类基础信息"""
    name: str
    icon: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class CategoryCreate(CategoryBase):
    """创建分类请求模型"""
    pass


class CategoryUpdate(CategoryBase):
    """更新分类请求模型"""
    name: Optional[str] = None


class Category(CategoryBase):
    """分类响应模型"""
    id: int
    created_at: Optional[datetime] = None  # 修改为可选，避免None值错误
    updated_at: Optional[datetime] = None  # 修改为可选

    class Config:
        from_attributes = True
        # 添加这个配置，忽略额外字段，避免序列化错误
        extra = "ignore"


class MerchantBase(BaseModel):
    """商户基础信息"""
    name: str
    logo: Optional[str] = None
    cover: Optional[str] = None
    description: Optional[str] = None
    contact_name: str
    contact_phone: str
    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_hours: Optional[str] = None
    # 添加服务半径字段
    service_radius: Optional[float] = Field(5.0, ge=0.1, le=50.0, description="服务半径(公里)")
    # 服务范围边界坐标
    north_boundary: Optional[float] = None
    south_boundary: Optional[float] = None
    east_boundary: Optional[float] = None
    west_boundary: Optional[float] = None


class MerchantCreate(MerchantBase):
    """创建商户请求模型"""
    license_number: Optional[str] = None
    license_image: Optional[str] = None
    category_ids: List[int] = []


class MerchantUpdate(BaseModel):
    """更新商户请求模型"""
    name: Optional[str] = None
    logo: Optional[str] = None
    cover: Optional[str] = None
    description: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_hours: Optional[str] = None
    service_radius: Optional[float] = None  # 服务半径字段
    north_boundary: Optional[float] = None
    south_boundary: Optional[float] = None
    east_boundary: Optional[float] = None
    west_boundary: Optional[float] = None
    license_number: Optional[str] = None
    license_image: Optional[str] = None
    category_ids: Optional[List[int]] = None


class MerchantInDB(MerchantBase):
    """数据库中的商户模型"""
    id: int
    license_number: Optional[str] = None
    license_image: Optional[str] = None
    status: int = 0
    rating: float = 5.0
    commission_rate: float = 0.05
    balance: float = 0.0
    created_at: Optional[datetime] = None  # 修改为可选
    updated_at: Optional[datetime] = None  # 修改为可选

    class Config:
        from_attributes = True
        extra = "ignore"  # 添加这个配置


class Merchant(MerchantBase):
    """商户响应模型"""
    id: int
    status: int
    rating: float
    categories: List[Category] = []
    product_count: Optional[int] = None
    distance: Optional[float] = None
    created_at: Optional[datetime] = None  # 修改为可选，避免序列化错误
    # 修改以下字段为可选，确保序列化安全
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    service_radius: Optional[float] = None
    north_boundary: Optional[float] = None
    south_boundary: Optional[float] = None
    east_boundary: Optional[float] = None
    west_boundary: Optional[float] = None
    commission_rate: Optional[float] = None
    license_number: Optional[str] = None
    license_image: Optional[str] = None

    class Config:
        from_attributes = True
        extra = "ignore"  # 添加这个配置，忽略额外字段


class MerchantDetail(Merchant):
    """商户详细信息响应模型"""
    license_number: Optional[str] = None
    commission_rate: Optional[float] = None  # 修改为可选

    class Config:
        from_attributes = True
        extra = "ignore"


class MerchantQueryParams(PaginationParams):
    """商户查询参数"""
    keyword: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[int] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance: Optional[float] = None  # km