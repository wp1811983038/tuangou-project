from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.common import PaginationParams


class MessageType(str, Enum):
    """消息类型枚举"""
    SYSTEM = "system"       # 系统消息
    ORDER = "order"         # 订单消息
    GROUP = "group"         # 团购消息
    MERCHANT = "merchant"   # 商户消息
    PAYMENT = "payment"     # 支付消息
    ACTIVITY = "activity"   # 活动消息


class MessageBase(BaseModel):
    """消息基础信息"""
    title: str
    content: str
    type: MessageType = MessageType.SYSTEM
    link_type: Optional[str] = None  # order-订单, group-团购, product-商品, url-网址
    link_id: Optional[int] = None
    link_url: Optional[str] = None
    is_read: bool = False


class MessageCreate(BaseModel):
    """创建消息请求模型"""
    title: str
    content: str
    type: MessageType = MessageType.SYSTEM
    link_type: Optional[str] = None
    link_id: Optional[int] = None
    link_url: Optional[str] = None
    user_id: Optional[int] = None
    merchant_id: Optional[int] = None
    is_all_users: bool = False
    is_all_merchants: bool = False


class MessageUpdate(BaseModel):
    """更新消息请求模型"""
    is_read: Optional[bool] = None


class MessageInDB(MessageBase):
    """数据库中的消息模型"""
    id: int
    user_id: Optional[int] = None
    merchant_id: Optional[int] = None
    read_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class Message(MessageBase):
    """消息响应模型"""
    id: int
    user_id: Optional[int] = None
    merchant_id: Optional[int] = None
    read_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class MessageQueryParams(PaginationParams):
    """消息查询参数"""
    user_id: Optional[int] = None
    merchant_id: Optional[int] = None
    type: Optional[str] = None
    is_read: Optional[bool] = None
    keyword: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None


class MessageReadRequest(BaseModel):
    """消息已读请求模型"""
    message_id: int


class MessageReadAllRequest(BaseModel):
    """全部消息已读请求模型"""
    user_id: Optional[int] = None
    merchant_id: Optional[int] = None
    type: Optional[str] = None


class MessageCountResponse(BaseModel):
    """消息数量响应模型"""
    total: int = 0
    unread: int = 0
    types: dict = {}