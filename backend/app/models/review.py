# app/models/review.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Review(Base):
    """评价表"""
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), comment="用户ID")
    product_id = Column(Integer, ForeignKey("products.id"), comment="商品ID")
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, comment="订单ID")
    content = Column(Text, nullable=True, comment="评价内容")
    rating = Column(Float, default=5.0, comment="评分")
    is_anonymous = Column(Boolean, default=False, comment="是否匿名")
    status = Column(Integer, default=0, comment="状态: 0-待审核, 1-已通过, 2-已拒绝")
    reply_content = Column(Text, nullable=True, comment="商家回复")
    reply_time = Column(DateTime, nullable=True, comment="回复时间")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关系
    user = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")
    images = relationship("ReviewImage", back_populates="review", cascade="all, delete-orphan")


class ReviewImage(Base):
    """评价图片表"""
    __tablename__ = "review_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    review_id = Column(Integer, ForeignKey("reviews.id"), comment="评价ID")
    image_url = Column(String(255), comment="图片URL")
    sort_order = Column(Integer, default=0, comment="排序")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    
    # 关系
    review = relationship("Review", back_populates="images")