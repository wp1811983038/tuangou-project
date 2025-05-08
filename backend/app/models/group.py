# app/models/group.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base 

class Group(Base):
    """团购表"""
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), comment="商户ID")
    product_id = Column(Integer, ForeignKey("products.id"), comment="商品ID")
    title = Column(String(128), comment="团购标题")
    cover_image = Column(String(255), comment="封面图")
    description = Column(Text, nullable=True, comment="团购描述")
    price = Column(Float, comment="团购价格")
    original_price = Column(Float, comment="原价")
    min_participants = Column(Integer, default=2, comment="最小成团人数")
    max_participants = Column(Integer, nullable=True, comment="最大成团人数")
    current_participants = Column(Integer, default=0, comment="当前参与人数")
    status = Column(Integer, default=1, comment="状态: 0-未开始, 1-进行中, 2-已成功, 3-已失败")
    start_time = Column(DateTime, comment="开始时间")
    end_time = Column(DateTime, comment="结束时间")
    is_featured = Column(Boolean, default=False, comment="是否推荐")
    sort_order = Column(Integer, default=0, comment="排序")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关系
    merchant = relationship("Merchant", back_populates="groups")
    product = relationship("Product", back_populates="groups")
    participants = relationship("GroupParticipant", back_populates="group", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="group")


class GroupParticipant(Base):
    """团购参与表"""
    __tablename__ = "group_participants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    group_id = Column(Integer, ForeignKey("groups.id"), comment="团购ID")
    user_id = Column(Integer, ForeignKey("users.id"), comment="用户ID")
    is_leader = Column(Boolean, default=False, comment="是否团长")
    join_time = Column(DateTime, server_default=func.now(), comment="参与时间")
    status = Column(Integer, default=1, comment="状态: 0-已取消, 1-已参与, 2-已支付")
    
    # 关系
    group = relationship("Group", back_populates="participants")
    user = relationship("User", back_populates="groups_joined")