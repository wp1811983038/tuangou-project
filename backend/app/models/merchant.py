# app/models/merchant.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Merchant(Base):
    """商户表"""
    __tablename__ = "merchants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(128), comment="商户名称")
    logo = Column(String(255), nullable=True, comment="商户Logo")
    cover = Column(String(255), nullable=True, comment="封面图")
    description = Column(Text, nullable=True, comment="商户描述")
    license_number = Column(String(64), nullable=True, comment="营业执照号")
    license_image = Column(String(255), nullable=True, comment="营业执照图片")
    contact_name = Column(String(64), comment="联系人姓名")
    contact_phone = Column(String(20), comment="联系人电话")
    province = Column(String(64), comment="省份")
    city = Column(String(64), comment="城市")
    district = Column(String(64), comment="区县")
    address = Column(String(255), comment="详细地址")
    latitude = Column(Float, nullable=True, comment="纬度")
    longitude = Column(Float, nullable=True, comment="经度")
    business_hours = Column(String(128), nullable=True, comment="营业时间")
    status = Column(Integer, default=0, comment="状态: 0-待审核, 1-正常, 2-已禁用")
    rating = Column(Float, default=5.0, comment="评分")
    commission_rate = Column(Float, default=0.05, comment="佣金率")
    balance = Column(Float, default=0.0, comment="账户余额")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关系
    products = relationship("Product", back_populates="merchant", cascade="all, delete-orphan")
    groups = relationship("Group", back_populates="merchant", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="merchant")
    users = relationship("User", back_populates="merchant")
    categories = relationship("MerchantCategory", back_populates="merchant", cascade="all, delete-orphan")


class Category(Base):
    """商品分类表"""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(64), comment="分类名称")
    icon = Column(String(255), nullable=True, comment="分类图标")
    sort_order = Column(Integer, default=0, comment="排序")
    is_active = Column(Boolean, default=True, comment="是否激活")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关系
    products = relationship("Product", secondary="product_categories", back_populates="categories")
    merchant_categories = relationship("MerchantCategory", back_populates="category")


class MerchantCategory(Base):
    """商户分类关联表"""
    __tablename__ = "merchant_categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), comment="商户ID")
    category_id = Column(Integer, ForeignKey("categories.id"), comment="分类ID")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    
    # 关系
    merchant = relationship("Merchant", back_populates="categories")
    category = relationship("Category", back_populates="merchant_categories")