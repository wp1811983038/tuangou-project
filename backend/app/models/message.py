# app/models/message.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Message(Base):
    """消息表"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="用户ID")
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=True, comment="商户ID")
    title = Column(String(128), comment="标题")
    content = Column(Text, comment="内容")
    type = Column(String(20), default="system", comment="类型: system-系统消息, order-订单消息, group-团购消息, merchant-商户消息, payment-支付消息, activity-活动消息")
    link_type = Column(String(20), nullable=True, comment="链接类型: order-订单, group-团购, product-商品, url-网址")
    link_id = Column(Integer, nullable=True, comment="链接ID")
    link_url = Column(String(255), nullable=True, comment="链接URL")
    is_read = Column(Boolean, default=False, comment="是否已读")
    read_time = Column(DateTime, nullable=True, comment="阅读时间")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关系
    user = relationship("User", foreign_keys=[user_id])
    merchant = relationship("Merchant", foreign_keys=[merchant_id])