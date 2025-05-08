# app/models/product.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base
from app.models.category import Category, product_categories  # 导入而不是重复定义

class Product(Base):
    """商品表"""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), comment="商户ID")
    name = Column(String(128), comment="商品名称")
    thumbnail = Column(String(255), comment="缩略图")
    original_price = Column(Float, comment="原价")
    current_price = Column(Float, comment="现价")
    group_price = Column(Float, nullable=True, comment="团购价")
    stock = Column(Integer, default=0, comment="库存")
    unit = Column(String(20), default="件", comment="单位")
    description = Column(Text, nullable=True, comment="商品描述")
    detail = Column(Text, nullable=True, comment="商品详情")
    sales = Column(Integer, default=0, comment="销量")
    views = Column(Integer, default=0, comment="浏览量")
    status = Column(Integer, default=1, comment="状态: 0-下架, 1-上架")
    sort_order = Column(Integer, default=0, comment="排序")
    is_hot = Column(Boolean, default=False, comment="是否热门")
    is_new = Column(Boolean, default=True, comment="是否新品")
    is_recommend = Column(Boolean, default=False, comment="是否推荐")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关系
    merchant = relationship("Merchant", back_populates="products")
    categories = relationship("Category", secondary=product_categories, back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    specifications = relationship("ProductSpecification", back_populates="product", cascade="all, delete-orphan")
    groups = relationship("Group", back_populates="product")
    reviews = relationship("Review", back_populates="product")
    favorites = relationship("Favorite", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")

class ProductImage(Base):
    """商品图片表"""
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), comment="商品ID")
    image_url = Column(String(255), comment="图片URL")
    sort_order = Column(Integer, default=0, comment="排序")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    
    # 关系
    product = relationship("Product", back_populates="images")


class ProductSpecification(Base):
    """商品规格表"""
    __tablename__ = "product_specifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), comment="商品ID")
    name = Column(String(64), comment="规格名称")
    value = Column(String(128), comment="规格值")
    price_adjustment = Column(Float, default=0.0, comment="价格调整")
    stock = Column(Integer, default=0, comment="库存")
    sort_order = Column(Integer, default=0, comment="排序")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关系
    product = relationship("Product", back_populates="specifications")