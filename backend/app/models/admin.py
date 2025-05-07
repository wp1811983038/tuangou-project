from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Admin(Base):
    __tablename__ = "admins"

    admin_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True)
    password = Column(String(255))  # 存储加密后的密码
    name = Column(String(50))
    phone = Column(String(20))
    role = Column(Integer, default=1)  # 0: 超级管理员, 1: 普通管理员
    status = Column(Integer, default=1)  # 1: 正常, 0: 禁用
    last_login_time = Column(DateTime)
    create_time = Column(DateTime, default=func.now())