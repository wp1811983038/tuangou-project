from sqlalchemy import Column, Integer, String, DateTime, Float, Text
from sqlalchemy.sql import func
from app.database import Base

class Merchant(Base):
    __tablename__ = "merchants"

    merchant_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100))
    logo = Column(String(255))
    introduction = Column(Text)
    business_license = Column(String(255))
    food_license = Column(String(255))
    contact_person = Column(String(50))
    contact_phone = Column(String(20))
    password = Column(String(255))  # 存储加密后的密码
    province = Column(String(50))
    city = Column(String(50))
    district = Column(String(50))
    address = Column(String(255))
    latitude = Column(String(20))
    longitude = Column(String(20))
    service_radius = Column(Float)
    status = Column(Integer, default=0)  # 0: 审核中, 1: 正常, -1: 禁用
    create_time = Column(DateTime, default=func.now())
    update_time = Column(DateTime, default=func.now(), onupdate=func.now())