from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Union

from pydantic import BaseModel, Field, validator

from app.schemas.common import PaginationParams
from app.schemas.merchant import Category


class ProductSpecificationBase(BaseModel):
    """商品规格基础信息"""
    name: str
    value: str
    price_adjustment: float = 0.0
    stock: int = 0
    sort_order: int = 0


class ProductSpecificationCreate(ProductSpecificationBase):
    """创建商品规格请求模型"""
    pass


class ProductSpecificationUpdate(ProductSpecificationBase):
    """更新商品规格请求模型"""
    pass


class ProductSpecification(ProductSpecificationBase):
    """商品规格响应模型"""
    id: int
    product_id: Optional[int] = None  # 修改为可选
    created_at: Optional[datetime] = None  # 修改为可选
    updated_at: Optional[datetime] = None  # 修改为可选

    class Config:
        from_attributes = True


class ProductImageBase(BaseModel):
    """商品图片基础信息"""
    image_url: str
    sort_order: int = 0


class ProductImageCreate(ProductImageBase):
    """创建商品图片请求模型"""
    pass


class ProductImageUpdate(ProductImageBase):
    """更新商品图片请求模型"""
    pass


class ProductImage(ProductImageBase):
    """商品图片响应模型"""
    id: int
    product_id: Optional[int] = None  # 修改为可选
    created_at: Optional[datetime] = None  # 修改为可选

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    """商品基础信息"""
    name: str
    thumbnail: str
    original_price: float
    current_price: float
    group_price: Optional[float] = None
    stock: int = 0
    unit: str = "件"
    description: Optional[str] = None
    detail: Optional[str] = None
    status: int = 1  # 0-下架, 1-上架
    sort_order: int = 0
    is_hot: bool = False
    is_new: bool = True
    is_recommend: bool = False


class ProductCreate(ProductBase):
    """创建商品请求模型"""
    category_ids: List[int]
    images: List[ProductImageCreate] = []
    specifications: List[ProductSpecificationCreate] = []

    @validator('current_price')
    def current_price_must_le_original(cls, v, values):
        if 'original_price' in values and v > values['original_price']:
            raise ValueError('现价不能大于原价')
        return v

    @validator('group_price')
    def group_price_must_le_current(cls, v, values):
        if v is not None and 'current_price' in values and v > values['current_price']:
            raise ValueError('团购价不能大于现价')
        return v

    @validator('stock')
    def stock_must_ge_zero(cls, v):
        if v < 0:
            raise ValueError('库存不能小于0')
        return v


class ProductUpdate(BaseModel):
    """更新商品请求模型"""
    name: Optional[str] = None
    thumbnail: Optional[str] = None
    original_price: Optional[float] = None
    current_price: Optional[float] = None
    group_price: Optional[float] = None
    stock: Optional[int] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    detail: Optional[str] = None
    status: Optional[int] = None
    sort_order: Optional[int] = None
    is_hot: Optional[bool] = None
    is_new: Optional[bool] = None
    is_recommend: Optional[bool] = None
    category_ids: Optional[List[int]] = None

    @validator('current_price')
    def current_price_must_le_original(cls, v, values):
        if v is not None and 'original_price' in values and values['original_price'] is not None and v > values['original_price']:
            raise ValueError('现价不能大于原价')
        return v

    @validator('group_price')
    def group_price_must_le_current(cls, v, values):
        if v is not None and 'current_price' in values and values['current_price'] is not None and v > values['current_price']:
            raise ValueError('团购价不能大于现价')
        return v

    @validator('stock')
    def stock_must_ge_zero(cls, v):
        if v is not None and v < 0:
            raise ValueError('库存不能小于0')
        return v


class ProductInDB(ProductBase):
    """数据库中的商品模型"""
    id: int
    merchant_id: int
    sales: int = 0
    views: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Product(ProductBase):
    """商品响应模型"""
    id: int
    merchant_id: int
    merchant_name: Optional[str] = None
    sales: int = 0
    views: int = 0
    categories: List[Category] = []
    has_group: bool = False
    favorite_count: int = 0
    is_favorite: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductDetail(Product):
    """商品详细信息响应模型"""
    images: List[ProductImage] = []
    specifications: List[ProductSpecification] = []
    related_products: List[Product] = []


class ProductQueryParams(PaginationParams):
    """商品查询参数"""
    keyword: Optional[str] = None
    category_id: Optional[int] = None
    merchant_id: Optional[int] = None
    status: Optional[int] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    is_hot: Optional[bool] = None
    is_new: Optional[bool] = None
    is_recommend: Optional[bool] = None
    has_group: Optional[bool] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None