# app/models/order.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Order(Base):
    """订单表"""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_no = Column(String(64), unique=True, index=True, comment="订单编号")
    user_id = Column(Integer, ForeignKey("users.id"), comment="用户ID")
    merchant_id = Column(Integer, ForeignKey("merchants.id"), comment="商户ID")
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True, comment="团购ID")
    address_id = Column(Integer, ForeignKey("addresses.id"), nullable=True, comment="地址ID")
    total_amount = Column(Float, comment="订单总金额")
    actual_amount = Column(Float, comment="实付金额")
    freight = Column(Float, default=0.0, comment="运费")
    discount = Column(Float, default=0.0, comment="折扣金额")
    status = Column(Integer, default=0, comment="状态: 0-待支付, 1-已支付, 2-已发货, 3-已完成, 4-已取消, 5-已退款")
    payment_status = Column(Integer, default=0, comment="支付状态: 0-未支付, 1-已支付, 2-已退款")
    payment_method = Column(String(20), nullable=True, comment="支付方式")
    payment_time = Column(DateTime, nullable=True, comment="支付时间")
    delivery_status = Column(Integer, default=0, comment="物流状态: 0-未发货, 1-已发货, 2-已收货")
    delivery_company = Column(String(64), nullable=True, comment="物流公司")
    tracking_number = Column(String(64), nullable=True, comment="物流单号")
    delivery_time = Column(DateTime, nullable=True, comment="发货时间")
    completion_time = Column(DateTime, nullable=True, comment="完成时间")
    cancel_time = Column(DateTime, nullable=True, comment="取消时间")
    cancel_reason = Column(String(255), nullable=True, comment="取消原因")
    refund_time = Column(DateTime, nullable=True, comment="退款时间")
    refund_reason = Column(String(255), nullable=True, comment="退款原因")
    refund_amount = Column(Float, default=0.0, comment="退款金额")
    buyer_comment = Column(Text, nullable=True, comment="买家备注")
    seller_comment = Column(Text, nullable=True, comment="卖家备注")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关系
    user = relationship("User", back_populates="orders")
    merchant = relationship("Merchant", back_populates="orders")
    group = relationship("Group", back_populates="orders")
    address = relationship("Address")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    """订单明细表"""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), comment="订单ID")
    product_id = Column(Integer, ForeignKey("products.id"), comment="商品ID")
    product_name = Column(String(128), comment="商品名称")
    product_image = Column(String(255), comment="商品图片")
    specification = Column(String(128), nullable=True, comment="规格")
    price = Column(Float, comment="价格")
    quantity = Column(Integer, comment="数量")
    subtotal = Column(Float, comment="小计")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    
    # 关系
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Payment(Base):
    """支付记录表"""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), comment="订单ID")
    payment_no = Column(String(64), unique=True, index=True, comment="支付单号")
    transaction_id = Column(String(64), nullable=True, comment="交易ID")
    amount = Column(Float, comment="支付金额")
    method = Column(String(20), comment="支付方式")
    status = Column(Integer, default=0, comment="状态: 0-未支付, 1-已支付, 2-已退款")
    paid_time = Column(DateTime, nullable=True, comment="支付时间")
    refund_time = Column(DateTime, nullable=True, comment="退款时间")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关系
    order = relationship("Order", back_populates="payments")