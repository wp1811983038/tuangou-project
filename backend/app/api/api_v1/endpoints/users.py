from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path
from pydantic import EmailStr
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import user_service

router = APIRouter()


@router.get("/me", response_model=schemas.user.UserProfile)
async def get_current_user_profile(
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取当前用户详细资料
    """
    return await user_service.get_user_profile(
        db=db,
        user_id=current_user.id
    )


@router.put("/me", response_model=schemas.user.User)
async def update_user_profile(
    user_data: schemas.user.UserUpdate,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新当前用户资料
    """
    return await user_service.update_user_profile(
        db=db,
        user_id=current_user.id,
        user_data=user_data
    )


@router.get("/addresses", response_model=List[schemas.user.UserAddress])
async def get_user_addresses(
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取用户地址列表
    """
    return await user_service.get_user_addresses(
        db=db,
        user_id=current_user.id
    )


@router.post("/addresses", response_model=schemas.user.UserAddress)
async def create_user_address(
    address_data: schemas.user.UserAddressCreate,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建用户地址
    """
    return await user_service.create_user_address(
        db=db,
        user_id=current_user.id,
        address_data=address_data
    )


@router.get("/addresses/{address_id}", response_model=schemas.user.UserAddress)
async def get_user_address(
    address_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取用户单个地址
    """
    return await user_service.get_user_address(
        db=db,
        user_id=current_user.id,
        address_id=address_id
    )


@router.put("/addresses/{address_id}", response_model=schemas.user.UserAddress)
async def update_user_address(
    address_data: schemas.user.UserAddressUpdate,
    address_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新用户地址
    """
    return await user_service.update_user_address(
        db=db,
        user_id=current_user.id,
        address_id=address_id,
        address_data=address_data
    )


@router.delete("/addresses/{address_id}", response_model=schemas.common.BooleanResponse)
async def delete_user_address(
    address_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    删除用户地址
    """
    result = await user_service.delete_user_address(
        db=db,
        user_id=current_user.id,
        address_id=address_id
    )
    return {"data": result}


@router.post("/addresses/{address_id}/default", response_model=schemas.user.UserAddress)
async def set_default_address(
    address_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    设置默认地址
    """
    return await user_service.set_default_address(
        db=db,
        user_id=current_user.id,
        address_id=address_id
    )


@router.post("/favorites/{product_id}", response_model=schemas.common.BooleanResponse)
async def toggle_favorite(
    product_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    收藏或取消收藏商品
    """
    is_favorite = await user_service.toggle_favorite(
        db=db,
        user_id=current_user.id,
        product_id=product_id
    )
    
    return {"data": is_favorite}


@router.get("/favorites", response_model=schemas.common.PaginatedResponse)
async def get_user_favorites(
    pagination: dict = Depends(deps.get_pagination_params),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取用户收藏的商品列表
    """
    favorites = await user_service.get_user_favorites(
        db=db,
        user_id=current_user.id,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": favorites,
            "total": len(favorites),
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (len(favorites) + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }