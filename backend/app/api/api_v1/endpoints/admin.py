from typing import Any, List, Optional, Dict

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.security import create_access_token
from datetime import timedelta
from app.core.config import settings

from app import schemas
from app.api import deps
from app.services import admin_service, notification_service

router = APIRouter()


# backend/app/api/api_v1/endpoints/admin.py
@router.post("/login", response_model=Dict)
async def admin_login(
    login_data: schemas.admin.AdminLoginRequest,
    db: Session = Depends(deps.get_db)
) -> Any:
    """管理员登录"""
    # 添加日志
    print(f"接收到管理员登录请求: {login_data.username}")
    
    admin = await admin_service.authenticate_admin(
        db=db,
        username=login_data.username,
        password=login_data.password
    )
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名或密码错误"
        )
    
    # 生成访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(admin.id),
        expires_delta=access_token_expires
    )
    
    # 正确处理管理员对象
    admin_data = {
        "id": admin.id,
        "username": admin.username,
        "name": admin.name,
        "email": admin.email,
        "phone": admin.phone,
        "avatar": admin.avatar,
        "role": admin.role,
        "permissions": admin.permissions,
        "is_active": admin.is_active,
        "last_login_at": admin.last_login_at.isoformat() if admin.last_login_at else None
    }
    
    return {
        "admin": admin_data,
        "token": {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    }

@router.post("/", response_model=schemas.admin.Admin, dependencies=[Depends(deps.get_current_admin)])
async def create_admin(
    admin_data: schemas.admin.AdminCreate,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建管理员（需要管理员权限）
    """
    return await admin_service.create_admin(
        db=db,
        admin_data=admin_data
    )


@router.put("/{admin_id}", response_model=schemas.admin.Admin, dependencies=[Depends(deps.get_current_admin)])
async def update_admin(
    admin_data: schemas.admin.AdminUpdate,
    admin_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新管理员信息（需要管理员权限）
    """
    return await admin_service.update_admin(
        db=db,
        admin_id=admin_id,
        admin_data=admin_data
    )


@router.put("/password", response_model=schemas.common.BooleanResponse)
async def change_admin_password(
    password_data: schemas.admin.AdminPasswordChangeRequest,
    current_user: schemas.user.User = Depends(deps.get_current_admin),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    修改管理员密码
    """
    result = await admin_service.change_admin_password(
        db=db,
        admin_id=current_user.id,
        old_password=password_data.old_password,
        new_password=password_data.new_password
    )
    
    return {"data": result}


@router.get("/", response_model=schemas.common.PaginatedResponse, dependencies=[Depends(deps.get_current_admin)])
async def get_admins(
    pagination: dict = Depends(deps.get_pagination_params),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取管理员列表（需要管理员权限）
    """
    admins, total = await admin_service.get_admins(
        db=db,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": admins,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


@router.get("/config", response_model=List[schemas.admin.SystemConfig], dependencies=[Depends(deps.get_current_admin)])
async def get_system_configs(
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取系统配置列表（需要管理员权限）
    """
    configs, _ = await admin_service.get_system_configs(
        db=db,
        skip=0,
        limit=100
    )
    
    return configs


@router.put("/config/{config_id}", response_model=schemas.admin.SystemConfig, dependencies=[Depends(deps.get_current_admin)])
async def update_system_config(
    config_data: schemas.admin.SystemConfigUpdate,
    config_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新系统配置（需要管理员权限）
    """
    return await admin_service.update_system_config(
        db=db,
        config_id=config_id,
        config_data=config_data
    )


@router.post("/config/batch", response_model=List[schemas.admin.SystemConfig], dependencies=[Depends(deps.get_current_admin)])
async def batch_update_system_config(
    configs: schemas.admin.SystemConfigBatchUpdateRequest,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    批量更新系统配置（需要管理员权限）
    """
    return await admin_service.batch_update_system_config(
        db=db,
        configs=configs.configs
    )


@router.get("/banners", response_model=schemas.common.PaginatedResponse, dependencies=[Depends(deps.get_current_admin)])
async def search_banners(
    position: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None, regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索轮播图列表（需要管理员权限）
    """
    banners, total = await admin_service.search_banners(
        db=db,
        position=position,
        is_active=is_active,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": banners,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


@router.post("/banners", response_model=schemas.admin.Banner, dependencies=[Depends(deps.get_current_admin)])
async def create_banner(
    banner_data: schemas.admin.BannerCreate,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建轮播图（需要管理员权限）
    """
    return await admin_service.create_banner(
        db=db,
        banner_data=banner_data
    )


@router.put("/banners/{banner_id}", response_model=schemas.admin.Banner, dependencies=[Depends(deps.get_current_admin)])
async def update_banner(
    banner_data: schemas.admin.BannerUpdate,
    banner_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新轮播图（需要管理员权限）
    """
    return await admin_service.update_banner(
        db=db,
        banner_id=banner_id,
        banner_data=banner_data
    )


@router.delete("/banners/{banner_id}", response_model=schemas.common.BooleanResponse, dependencies=[Depends(deps.get_current_admin)])
async def delete_banner(
    banner_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    删除轮播图（需要管理员权限）
    """
    result = await admin_service.delete_banner(
        db=db,
        banner_id=banner_id
    )
    
    return {"data": result}


@router.get("/notices", response_model=schemas.common.PaginatedResponse, dependencies=[Depends(deps.get_current_admin)])
async def search_notices(
    type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    is_popup: Optional[bool] = Query(None),
    is_top: Optional[bool] = Query(None),
    keyword: Optional[str] = Query(None, max_length=100),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None, regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索公告列表（需要管理员权限）
    """
    notices, total = await admin_service.search_notices(
        db=db,
        type=type,
        is_active=is_active,
        is_popup=is_popup,
        is_top=is_top,
        keyword=keyword,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": notices,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


@router.post("/notices", response_model=schemas.admin.Notice, dependencies=[Depends(deps.get_current_admin)])
async def create_notice(
    notice_data: schemas.admin.NoticeCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建公告（需要管理员权限）
    """
    notice = await admin_service.create_notice(
        db=db,
        notice_data=notice_data
    )
    
    # 发送系统通知
    if notice.is_active:
        background_tasks.add_task(
            notification_service.send_system_notification,
            background_tasks=background_tasks,
            title=notice.title,
            content=notice.content,
            is_all_users=True,
            is_all_merchants=True
        )
    
    return notice


@router.put("/notices/{notice_id}", response_model=schemas.admin.Notice, dependencies=[Depends(deps.get_current_admin)])
async def update_notice(
    notice_data: schemas.admin.NoticeUpdate,
    notice_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新公告（需要管理员权限）
    """
    return await admin_service.update_notice(
        db=db,
        notice_id=notice_id,
        notice_data=notice_data
    )


@router.delete("/notices/{notice_id}", response_model=schemas.common.BooleanResponse, dependencies=[Depends(deps.get_current_admin)])
async def delete_notice(
    notice_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    删除公告（需要管理员权限）
    """
    result = await admin_service.delete_notice(
        db=db,
        notice_id=notice_id
    )
    
    return {"data": result}


@router.get("/dashboard", response_model=schemas.admin.StatDashboard, dependencies=[Depends(deps.get_current_admin)])
async def get_admin_dashboard(
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取管理员仪表盘数据（需要管理员权限）
    """
    from app.services import stats_service
    
    return await stats_service.get_admin_dashboard(db=db)


@router.post("/notification", response_model=schemas.common.MessageResponse, dependencies=[Depends(deps.get_current_admin)])
async def send_notification(
    title: str = Body(...),
    content: str = Body(...),
    user_ids: Optional[List[int]] = Body(None),
    merchant_ids: Optional[List[int]] = Body(None),
    is_all_users: bool = Body(False),
    is_all_merchants: bool = Body(False),
    background_tasks: BackgroundTasks = BackgroundTasks(),
) -> Any:
    """
    发送系统通知（需要管理员权限）
    """
    # 至少选择一种发送方式
    if not any([user_ids, merchant_ids, is_all_users, is_all_merchants]):
        raise HTTPException(status_code=400, detail="请至少选择一种发送方式")
    
    # 发送通知
    background_tasks.add_task(
        notification_service.send_system_notification,
        background_tasks=background_tasks,
        title=title,
        content=content,
        user_ids=user_ids,
        merchant_ids=merchant_ids,
        is_all_users=is_all_users,
        is_all_merchants=is_all_merchants
    )
    
    return {"message": "通知已发送"}