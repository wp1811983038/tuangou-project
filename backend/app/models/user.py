# app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base 

class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    open_id = Column(String(64), unique=True, index=True, comment="微信openid")
    union_id = Column(String(64), nullable=True, comment="微信unionid")
    nickname = Column(String(64), nullable=True, comment="用户昵称")
    avatar_url = Column(String(255), nullable=True, comment="头像URL")
    gender = Column(Integer, default=0, comment="性别: 0-未知, 1-男, 2-女")
    phone = Column(String(20), nullable=True, index=True, comment="手机号码")
    is_active = Column(Boolean, default=True, comment="是否激活")
    is_admin = Column(Boolean, default=False, comment="是否为管理员")
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=True, comment="关联商户ID")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    last_login_at = Column(DateTime, nullable=True, comment="最后登录时间")
    
    # 关系
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    groups_joined = relationship("GroupParticipant", back_populates="user")
    merchant = relationship("Merchant", back_populates="users")


class Address(Base):
    """用户地址表"""
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), comment="用户ID")
    recipient = Column(String(64), comment="收件人姓名")
    phone = Column(String(20), comment="收件人电话")
    province = Column(String(64), comment="省份")
    city = Column(String(64), comment="城市")
    district = Column(String(64), comment="区县")
    detail = Column(String(255), comment="详细地址")
    is_default = Column(Boolean, default=False, comment="是否默认地址")
    latitude = Column(Float, nullable=True, comment="纬度")
    longitude = Column(Float, nullable=True, comment="经度")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关系
    user = relationship("User", back_populates="addresses")


class Favorite(Base):
    """用户收藏表"""
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), comment="用户ID")
    product_id = Column(Integer, ForeignKey("products.id"), comment="商品ID")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    
    # 关系
    user = relationship("User", back_populates="favorites")
    product = relationship("Product", back_populates="favorites")