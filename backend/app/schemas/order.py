from datetime import datetime
from typing import List, Optional, Union

from pydantic import BaseModel, Field, validator

from app.schemas.common import PaginationParams
from app.schemas.user import UserAddress


class OrderItemBase(BaseModel):
    """订单项基础信息"""
    product_id: int
    product_name: str
    product_image: str
    specification: Optional[str] = None
    price: float
    quantity: int
    subtotal: float


class OrderItemCreate(BaseModel):
    """创建订单项请求模型"""
    product_id: int
    specification_id: Optional[int] = None
    quantity: int

    @validator('quantity')
    def quantity_must_ge_one(cls, v):
        if v < 1:
            raise ValueError('数量不能小于1')
        return v


class OrderItem(OrderItemBase):
    """订单项响应模型"""
    id: int
    order_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentBase(BaseModel):
    """支付记录基础信息"""
    payment_no: str
    transaction_id: Optional[str] = None
    amount: float
    method: str
    status: int = 0  # 0-未支付, 1-已支付, 2-已退款
    paid_time: Optional[datetime] = None
    refund_time: Optional[datetime] = None


class Payment(PaymentBase):
    """支付记录响应模型"""
    id: int
    order_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    """订单基础信息"""
    order_no: str
    total_amount: float
    actual_amount: float
    freight: float = 0.0
    discount: float = 0.0
    status: int = 0  # 0-待支付, 1-已支付, 2-已发货, 3-已完成, 4-已取消, 5-已退款
    payment_status: int = 0  # 0-未支付, 1-已支付, 2-已退款
    payment_method: Optional[str] = None
    payment_time: Optional[datetime] = None
    delivery_status: int = 0  # 0-未发货, 1-已发货, 2-已收货
    delivery_company: Optional[str] = None
    tracking_number: Optional[str] = None
    delivery_time: Optional[datetime] = None
    completion_time: Optional[datetime] = None
    cancel_time: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    refund_time: Optional[datetime] = None
    refund_reason: Optional[str] = None
    refund_amount: float = 0.0
    buyer_comment: Optional[str] = None
    seller_comment: Optional[str] = None


class OrderCreate(BaseModel):
    """创建订单请求模型"""
    merchant_id: int
    address_id: int
    items: List[OrderItemCreate]
    group_id: Optional[int] = None
    buyer_comment: Optional[str] = None

    @validator('items')
    def items_not_empty(cls, v):
        if not v:
            raise ValueError('订单项不能为空')
        return v


class OrderUpdate(BaseModel):
    """更新订单请求模型"""
    status: Optional[int] = None
    payment_status: Optional[int] = None
    payment_method: Optional[str] = None
    payment_time: Optional[datetime] = None
    delivery_status: Optional[int] = None
    delivery_company: Optional[str] = None
    tracking_number: Optional[str] = None
    delivery_time: Optional[datetime] = None
    completion_time: Optional[datetime] = None
    cancel_time: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    refund_time: Optional[datetime] = None
    refund_reason: Optional[str] = None
    refund_amount: Optional[float] = None
    buyer_comment: Optional[str] = None
    seller_comment: Optional[str] = None


class OrderInDB(OrderBase):
    """数据库中的订单模型"""
    id: int
    user_id: int
    merchant_id: int
    group_id: Optional[int] = None
    address_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Order(OrderBase):
    """订单响应模型"""
    id: int
    user_id: int
    merchant_id: int
    group_id: Optional[int] = None
    address_id: Optional[int] = None
    merchant_name: Optional[str] = None
    merchant_logo: Optional[str] = None
    address: Optional[UserAddress] = None
    items: List[OrderItem] = []
    payments: List[Payment] = []
    countdown_seconds: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderQueryParams(PaginationParams):
    """订单查询参数"""
    keyword: Optional[str] = None
    merchant_id: Optional[int] = None
    user_id: Optional[int] = None
    group_id: Optional[int] = None
    status: Optional[int] = None
    payment_status: Optional[int] = None
    delivery_status: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None


class OrderPayRequest(BaseModel):
    """订单支付请求模型"""
    order_id: int
    payment_method: str


class OrderRefundRequest(BaseModel):
    """订单退款请求模型"""
    order_id: int
    refund_reason: str
    refund_amount: Optional[float] = None


class OrderCancelRequest(BaseModel):
    """订单取消请求模型"""
    order_id: int
    cancel_reason: str


class OrderDeliveryRequest(BaseModel):
    """订单发货请求模型"""
    order_id: int
    delivery_company: str
    tracking_number: str


class OrderConfirmRequest(BaseModel):
    """订单确认收货请求模型"""
    order_id: int