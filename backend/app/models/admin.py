# app/models/admin.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Admin(Base):
    """管理员表"""
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(64), unique=True, index=True, comment="用户名")
    hashed_password = Column(String(128), comment="密码哈希")
    name = Column(String(64), nullable=True, comment="姓名")
    email = Column(String(128), nullable=True, comment="邮箱")
    phone = Column(String(20), nullable=True, comment="手机号")
    avatar = Column(String(255), nullable=True, comment="头像")
    role = Column(String(20), default="operator", comment="角色: admin-超级管理员, operator-运营")
    permissions = Column(JSON, nullable=True, comment="权限")
    is_active = Column(Boolean, default=True, comment="是否激活")
    last_login_at = Column(DateTime, nullable=True, comment="最后登录时间")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")


class SystemConfig(Base):
    """系统配置表"""
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    key = Column(String(64), unique=True, index=True, comment="配置键")
    value = Column(Text, nullable=True, comment="配置值")
    description = Column(String(255), nullable=True, comment="配置描述")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")


class Banner(Base):
    """轮播图表"""
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(128), comment="标题")
    image_url = Column(String(255), comment="图片URL")
    link_type = Column(String(20), comment="链接类型: product-商品, group-团购, url-网址")
    link_id = Column(Integer, nullable=True, comment="链接ID")
    link_url = Column(String(255), nullable=True, comment="链接URL")
    position = Column(String(20), default="home", comment="位置: home-首页, category-分类页")
    sort_order = Column(Integer, default=0, comment="排序")
    is_active = Column(Boolean, default=True, comment="是否激活")
    start_time = Column(DateTime, nullable=True, comment="开始时间")
    end_time = Column(DateTime, nullable=True, comment="结束时间")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")


class Notice(Base):
    """公告表"""
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(128), comment="标题")
    content = Column(Text, comment="内容")
    type = Column(String(20), default="system", comment="类型: system-系统公告, activity-活动公告")
    is_popup = Column(Boolean, default=False, comment="是否弹窗")
    is_top = Column(Boolean, default=False, comment="是否置顶")
    is_active = Column(Boolean, default=True, comment="是否激活")
    start_time = Column(DateTime, nullable=True, comment="开始时间")
    end_time = Column(DateTime, nullable=True, comment="结束时间")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")


class OperationLog(Base):
    """操作日志表"""
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    operator_id = Column(Integer, comment="操作者ID")
    operator_type = Column(String(20), comment="操作者类型: admin-管理员, merchant-商户, user-用户")
    module = Column(String(64), comment="模块")
    action = Column(String(64), comment="操作")
    ip = Column(String(64), nullable=True, comment="IP地址")
    request_method = Column(String(10), nullable=True, comment="请求方法")
    request_path = Column(String(255), nullable=True, comment="请求路径")
    request_params = Column(JSON, nullable=True, comment="请求参数")
    response_code = Column(Integer, nullable=True, comment="响应代码")
    response_message = Column(String(255), nullable=True, comment="响应消息")
    operation_time = Column(DateTime, server_default=func.now(), comment="操作时间")