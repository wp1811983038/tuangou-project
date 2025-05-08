from typing import Any, List, Optional, Dict

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path, BackgroundTasks
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import group_service, notification_service

router = APIRouter()


@router.get("/", response_model=schemas.common.PaginatedResponse)
async def search_groups(
    keyword: Optional[str] = Query(None, max_length=100),
    merchant_id: Optional[int] = Query(None, ge=1),
    product_id: Optional[int] = Query(None, ge=1),
    status: Optional[int] = Query(None, ge=0),
    is_featured: Optional[bool] = Query(None),
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    distance: Optional[float] = Query(None, ge=0),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None, regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    current_user: Optional[schemas.user.User] = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索团购列表
    """
    user_id = current_user.id if current_user else None
    
    groups, total = await group_service.search_groups(
        db=db,
        keyword=keyword,
        merchant_id=merchant_id,
        product_id=product_id,
        status=status,
        is_featured=is_featured,
        latitude=latitude,
        longitude=longitude,
        distance=distance,
        sort_by=sort_by,
        sort_order=sort_order,
        user_id=user_id,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": groups,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


@router.get("/{group_id}", response_model=schemas.group.Group)
async def get_group(
    group_id: int = Path(..., ge=1),
    current_user: Optional[schemas.user.User] = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取团购详情
    """
    user_id = current_user.id if current_user else None
    
    return await group_service.get_group(
        db=db,
        group_id=group_id,
        user_id=user_id
    )


@router.post("/", response_model=schemas.group.Group)
async def create_group(
    group_data: schemas.group.GroupCreate,
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建团购
    """
    return await group_service.create_group(
        db=db,
        group_data=group_data,
        merchant_id=current_user.merchant_id
    )


@router.put("/{group_id}", response_model=schemas.group.Group)
async def update_group(
    group_data: schemas.group.GroupUpdate,
    background_tasks: BackgroundTasks,
    group_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新团购
    """
    group = await group_service.update_group(
        db=db,
        group_id=group_id,
        group_data=group_data,
        merchant_id=current_user.merchant_id
    )
    
    # 如果团购状态变为成功或失败，发送通知
    if group_data.status is not None and group_data.status in [2, 3]:
        notification_type = "succeeded" if group_data.status == 2 else "failed"
        background_tasks.add_task(
            notification_service.send_group_notification,
            background_tasks=background_tasks,
            group_id=group_id,
            notification_type=notification_type
        )
    
    return group


@router.post("/{group_id}/join", response_model=Dict)
async def join_group(
    background_tasks: BackgroundTasks,
    group_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    参与团购
    """
    participant = await group_service.join_group(
        db=db,
        group_id=group_id,
        user_id=current_user.id
    )
    
    # 发送参与通知
    background_tasks.add_task(
        notification_service.send_group_notification,
        background_tasks=background_tasks,
        group_id=group_id,
        notification_type="joined"
    )
    
    return participant


@router.post("/{group_id}/cancel", response_model=schemas.common.BooleanResponse)
async def cancel_group_participation(
    group_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    取消参与团购
    """
    result = await group_service.cancel_group_participation(
        db=db,
        group_id=group_id,
        user_id=current_user.id
    )
    return {"data": result}


@router.get("/my/joined", response_model=schemas.common.PaginatedResponse)
async def get_user_joined_groups(
    status: Optional[int] = Query(None, ge=0),
    pagination: dict = Depends(deps.get_pagination_params),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取用户参与的团购列表
    """
    groups, total = await group_service.get_user_joined_groups(
        db=db,
        user_id=current_user.id,
        status=status,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": groups,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


@router.get("/merchant/list", response_model=schemas.common.PaginatedResponse)
async def get_merchant_groups(
    status: Optional[int] = Query(None, ge=0),
    pagination: dict = Depends(deps.get_pagination_params),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商户的团购列表
    """
    groups, total = await group_service.get_merchant_groups(
        db=db,
        merchant_id=current_user.merchant_id,
        status=status,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": groups,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }