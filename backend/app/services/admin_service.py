from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any

from fastapi import HTTPException, status
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.core.jwt import create_token
from app.models.admin import Admin, SystemConfig, Banner, Notice, OperationLog
from app.schemas.admin import (
    AdminCreate, AdminUpdate, SystemConfigCreate, SystemConfigUpdate,
    BannerCreate, BannerUpdate, NoticeCreate, NoticeUpdate
)


async def authenticate_admin(db: Session, username: str, password: str) -> Optional[Admin]:
    """管理员登录认证"""
    admin = db.query(Admin).filter(Admin.username == username).first()
    if not admin:
        return None
    if not verify_password(password, admin.hashed_password):
        return None
    if not admin.is_active:
        raise HTTPException(status_code=400, detail="管理员账号已被禁用")
    
    # 更新最后登录时间
    admin.last_login_at = datetime.now()
    db.commit()
    
    return admin


async def create_admin(db: Session, admin_data: AdminCreate) -> Admin:
    """创建管理员"""
    # 检查用户名是否已存在
    existing_admin = db.query(Admin).filter(Admin.username == admin_data.username).first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # 创建管理员
    hashed_password = get_password_hash(admin_data.password)
    admin = Admin(
        username=admin_data.username,
        hashed_password=hashed_password,
        name=admin_data.name,
        email=admin_data.email,
        phone=admin_data.phone,
        avatar=admin_data.avatar,
        role=admin_data.role,
        permissions=admin_data.permissions,
        is_active=True
    )
    
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    return admin


async def update_admin(db: Session, admin_id: int, admin_data: AdminUpdate) -> Admin:
    """更新管理员信息"""
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="管理员不存在")
    
    # 更新信息
    if admin_data.name is not None:
        admin.name = admin_data.name
    
    if admin_data.email is not None:
        admin.email = admin_data.email
    
    if admin_data.phone is not None:
        admin.phone = admin_data.phone
    
    if admin_data.avatar is not None:
        admin.avatar = admin_data.avatar
    
    if admin_data.role is not None:
        admin.role = admin_data.role
    
    if admin_data.permissions is not None:
        admin.permissions = admin_data.permissions
    
    if admin_data.is_active is not None:
        admin.is_active = admin_data.is_active
    
    admin.updated_at = datetime.now()
    
    db.commit()
    db.refresh(admin)
    
    return admin


async def change_admin_password(db: Session, admin_id: int, old_password: str, new_password: str) -> bool:
    """修改管理员密码"""
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="管理员不存在")
    
    # 验证旧密码
    if not verify_password(old_password, admin.hashed_password):
        raise HTTPException(status_code=400, detail="旧密码不正确")
    
    # 更新密码
    admin.hashed_password = get_password_hash(new_password)
    admin.updated_at = datetime.now()
    
    db.commit()
    
    return True


async def delete_admin(db: Session, admin_id: int) -> bool:
    """删除管理员"""
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="管理员不存在")
    
    db.delete(admin)
    db.commit()
    
    return True


async def get_admin(db: Session, admin_id: int) -> Admin:
    """获取管理员详情"""
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="管理员不存在")
    
    return admin


async def get_admins(db: Session, skip: int = 0, limit: int = 20) -> Tuple[List[Admin], int]:
    """获取管理员列表"""
    # 查询总数
    total = db.query(func.count(Admin.id)).scalar()
    
    # 查询列表
    admins = db.query(Admin).order_by(Admin.created_at.desc()).offset(skip).limit(limit).all()
    
    return admins, total


async def create_system_config(db: Session, config_data: SystemConfigCreate) -> SystemConfig:
    """创建系统配置"""
    # 检查键是否已存在
    existing_config = db.query(SystemConfig).filter(SystemConfig.key == config_data.key).first()
    if existing_config:
        raise HTTPException(status_code=400, detail="配置键已存在")
    
    # 创建配置
    config = SystemConfig(
        key=config_data.key,
        value=config_data.value,
        description=config_data.description
    )
    
    db.add(config)
    db.commit()
    db.refresh(config)
    
    return config


async def update_system_config(db: Session, config_id: int, config_data: SystemConfigUpdate) -> SystemConfig:
    """更新系统配置"""
    config = db.query(SystemConfig).filter(SystemConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    
    # 更新配置
    config.value = config_data.value
    if config_data.description is not None:
        config.description = config_data.description
    
    config.updated_at = datetime.now()
    
    db.commit()
    db.refresh(config)
    
    return config


async def batch_update_system_config(db: Session, configs: Dict[str, str]) -> List[SystemConfig]:
    """批量更新系统配置"""
    updated_configs = []
    
    for key, value in configs.items():
        config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        if config:
            config.value = value
            config.updated_at = datetime.now()
            updated_configs.append(config)
    
    db.commit()
    
    return updated_configs


async def get_system_config(db: Session, config_id: int) -> SystemConfig:
    """获取系统配置详情"""
    config = db.query(SystemConfig).filter(SystemConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    
    return config


async def get_system_config_by_key(db: Session, key: str) -> SystemConfig:
    """通过键获取系统配置"""
    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if not config:
        raise HTTPException(status_code=404, detail=f"配置键 {key} 不存在")
    
    return config


async def get_system_configs(db: Session, skip: int = 0, limit: int = 20) -> Tuple[List[SystemConfig], int]:
    """获取系统配置列表"""
    # 查询总数
    total = db.query(func.count(SystemConfig.id)).scalar()
    
    # 查询列表
    configs = db.query(SystemConfig).order_by(SystemConfig.key).offset(skip).limit(limit).all()
    
    return configs, total


async def create_banner(db: Session, banner_data: BannerCreate) -> Banner:
    """创建轮播图"""
    # 创建轮播图
    banner = Banner(
        title=banner_data.title,
        image_url=banner_data.image_url,
        link_type=banner_data.link_type,
        link_id=banner_data.link_id,
        link_url=banner_data.link_url,
        position=banner_data.position,
        sort_order=banner_data.sort_order,
        is_active=banner_data.is_active,
        start_time=banner_data.start_time,
        end_time=banner_data.end_time
    )
    
    db.add(banner)
    db.commit()
    db.refresh(banner)
    
    return banner


async def update_banner(db: Session, banner_id: int, banner_data: BannerUpdate) -> Banner:
    """更新轮播图"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="轮播图不存在")
    
    # 更新信息
    update_data = banner_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(banner, key, value)
    
    banner.updated_at = datetime.now()
    
    db.commit()
    db.refresh(banner)
    
    return banner


async def delete_banner(db: Session, banner_id: int) -> bool:
    """删除轮播图"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="轮播图不存在")
    
    db.delete(banner)
    db.commit()
    
    return True


async def get_banner(db: Session, banner_id: int) -> Banner:
    """获取轮播图详情"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="轮播图不存在")
    
    return banner


async def search_banners(
    db: Session,
    position: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[Banner], int]:
    """搜索轮播图"""
    query = db.query(Banner)
    
    # 筛选条件
    if position:
        query = query.filter(Banner.position == position)
    
    if is_active is not None:
        query = query.filter(Banner.is_active == is_active)
    
    # 获取总数
    total = query.count()
    
    # 排序
    if sort_by:
        direction = desc if sort_order == "desc" else asc
        if sort_by == "sort_order":
            query = query.order_by(direction(Banner.sort_order))
        elif sort_by == "created_at":
            query = query.order_by(direction(Banner.created_at))
    else:
        # 默认按排序值和创建时间排序
        query = query.order_by(Banner.sort_order.desc(), Banner.created_at.desc())
    
    # 分页
    banners = query.offset(skip).limit(limit).all()
    
    return banners, total


async def get_active_banners(db: Session, position: str) -> List[Banner]:
    """获取当前活动的轮播图"""
    now = datetime.now()
    
    query = db.query(Banner).filter(
        Banner.position == position,
        Banner.is_active == True,
        (Banner.start_time == None) | (Banner.start_time <= now),
        (Banner.end_time == None) | (Banner.end_time >= now)
    ).order_by(Banner.sort_order.desc())
    
    return query.all()


async def create_notice(db: Session, notice_data: NoticeCreate) -> Notice:
    """创建公告"""
    notice = Notice(
        title=notice_data.title,
        content=notice_data.content,
        type=notice_data.type,
        is_popup=notice_data.is_popup,
        is_top=notice_data.is_top,
        is_active=notice_data.is_active,
        start_time=notice_data.start_time,
        end_time=notice_data.end_time
    )
    
    db.add(notice)
    db.commit()
    db.refresh(notice)
    
    return notice


async def update_notice(db: Session, notice_id: int, notice_data: NoticeUpdate) -> Notice:
    """更新公告"""
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="公告不存在")
    
    # 更新信息
    update_data = notice_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(notice, key, value)
    
    notice.updated_at = datetime.now()
    
    db.commit()
    db.refresh(notice)
    
    return notice


async def delete_notice(db: Session, notice_id: int) -> bool:
    """删除公告"""
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="公告不存在")
    
    db.delete(notice)
    db.commit()
    
    return True


async def get_notice(db: Session, notice_id: int) -> Notice:
    """获取公告详情"""
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="公告不存在")
    
    return notice


async def search_notices(
    db: Session,
    type: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_popup: Optional[bool] = None,
    is_top: Optional[bool] = None,
    keyword: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[Notice], int]:
    """搜索公告"""
    query = db.query(Notice)
    
    # 筛选条件
    if type:
        query = query.filter(Notice.type == type)
    
    if is_active is not None:
        query = query.filter(Notice.is_active == is_active)
    
    if is_popup is not None:
        query = query.filter(Notice.is_popup == is_popup)
    
    if is_top is not None:
        query = query.filter(Notice.is_top == is_top)
    
    if keyword:
        query = query.filter(
            (Notice.title.ilike(f"%{keyword}%")) |
            (Notice.content.ilike(f"%{keyword}%"))
        )
    
    # 获取总数
    total = query.count()
    
    # 排序
    if sort_by:
        direction = desc if sort_order == "desc" else asc
        if sort_by == "created_at":
            query = query.order_by(direction(Notice.created_at))
    else:
        # 默认按置顶和创建时间排序
        query = query.order_by(Notice.is_top.desc(), Notice.created_at.desc())
    
    # 分页
    notices = query.offset(skip).limit(limit).all()
    
    return notices, total


async def get_active_notices(db: Session, type: Optional[str] = None) -> List[Notice]:
    """获取当前活动的公告"""
    now = datetime.now()
    
    query = db.query(Notice).filter(
        Notice.is_active == True,
        (Notice.start_time == None) | (Notice.start_time <= now),
        (Notice.end_time == None) | (Notice.end_time >= now)
    )
    
    if type:
        query = query.filter(Notice.type == type)
    
    # 排序：置顶优先，然后按创建时间倒序
    query = query.order_by(Notice.is_top.desc(), Notice.created_at.desc())
    
    return query.all()


async def add_operation_log(
    db: Session,
    operator_id: int,
    operator_type: str,
    module: str,
    action: str,
    ip: Optional[str] = None,
    request_method: Optional[str] = None,
    request_path: Optional[str] = None,
    request_params: Optional[Dict] = None,
    response_code: Optional[int] = None,
    response_message: Optional[str] = None
) -> OperationLog:
    """添加操作日志"""
    log = OperationLog(
        operator_id=operator_id,
        operator_type=operator_type,
        module=module,
        action=action,
        ip=ip,
        request_method=request_method,
        request_path=request_path,
        request_params=request_params,
        response_code=response_code,
        response_message=response_message,
        operation_time=datetime.now()
    )
    
    db.add(log)
    db.commit()
    db.refresh(log)
    
    return log


async def get_operation_logs(
    db: Session,
    operator_id: Optional[int] = None,
    operator_type: Optional[str] = None,
    module: Optional[str] = None,
    action: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[OperationLog], int]:
    """获取操作日志"""
    query = db.query(OperationLog)
    
    # 筛选条件
    if operator_id:
        query = query.filter(OperationLog.operator_id == operator_id)
    
    if operator_type:
        query = query.filter(OperationLog.operator_type == operator_type)
    
    if module:
        query = query.filter(OperationLog.module == module)
    
    if action:
        query = query.filter(OperationLog.action == action)
    
    if start_time:
        query = query.filter(OperationLog.operation_time >= start_time)
    
    if end_time:
        query = query.filter(OperationLog.operation_time <= end_time)
    
    # 获取总数
    total = query.count()
    
    # 排序和分页
    logs = query.order_by(OperationLog.operation_time.desc()).offset(skip).limit(limit).all()
    
    return logs, total