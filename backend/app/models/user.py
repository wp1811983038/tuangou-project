from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    openid = Column(String(50), unique=True, index=True)
    nickname = Column(String(50))
    avatar = Column(String(255))
    phone = Column(String(20))
    gender = Column(Integer, default=0)  # 0: 未知, 1: 男, 2: 女
    register_time = Column(DateTime, default=func.now())
    last_login_time = Column(DateTime, default=func.now(), onupdate=func.now())
    status = Column(Integer, default=1)  # 1: 正常, 0: 禁用

class Address(Base):
    __tablename__ = "addresses"

    address_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, index=True)
    receiver = Column(String(50))
    phone = Column(String(20))
    province = Column(String(50))
    city = Column(String(50))
    district = Column(String(50))
    detail_address = Column(String(255))
    latitude = Column(String(20))
    longitude = Column(String(20))
    is_default = Column(Boolean, default=False)
    create_time = Column(DateTime, default=func.now())