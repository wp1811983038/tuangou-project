from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import message_service

router = APIRouter()


@router.get("/", response_model=schemas.common.PaginatedResponse)
async def search_messages(
    message_type: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    keyword: Optional[str] = Query(None, max_length=100),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None, regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索消息列表
    """
    messages, total = await message_service.search_messages(
        db=db,
        user_id=current_user.id,
        merchant_id=current_user.merchant_id,
        message_type=message_type,
        is_read=is_read,
        keyword=keyword,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": messages,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


@router.get("/{message_id}", response_model=schemas.message.Message)
async def get_message(
    message_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取消息详情
    """
    return await message_service.get_message(
        db=db,
        message_id=message_id,
        user_id=current_user.id,
        merchant_id=current_user.merchant_id
    )


@router.post("/{message_id}/read", response_model=schemas.message.Message)
async def mark_message_read(
    message_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    标记消息为已读
    """
    return await message_service.mark_message_read(
        db=db,
        message_id=message_id,
        user_id=current_user.id,
        merchant_id=current_user.merchant_id
    )


@router.post("/read-all", response_model=schemas.common.MessageResponse)
async def mark_all_messages_read(
    message_type: Optional[str] = Body(None),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    标记所有消息为已读
    """
    count = await message_service.mark_all_messages_read(
        db=db,
        user_id=current_user.id,
        merchant_id=current_user.merchant_id,
        message_type=message_type
    )
    
    return {"message": f"已将{count}条消息标记为已读"}


@router.delete("/{message_id}", response_model=schemas.common.BooleanResponse)
async def delete_message(
    message_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    删除消息
    """
    result = await message_service.delete_message(
        db=db,
        message_id=message_id,
        user_id=current_user.id,
        merchant_id=current_user.merchant_id
    )
    
    return {"data": result}


@router.get("/count", response_model=Dict)
async def count_messages(
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    统计消息数量
    """
    return await message_service.count_messages(
        db=db,
        user_id=current_user.id,
        merchant_id=current_user.merchant_id
    )