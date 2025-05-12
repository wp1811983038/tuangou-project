from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import merchant_service

router = APIRouter()


@router.get("/", response_model=schemas.common.PaginatedResponse)
async def search_merchants(
    keyword: Optional[str] = Query(None, max_length=100),
    category_id: Optional[int] = Query(None, ge=1),
    status: Optional[int] = Query(None, ge=0),
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    distance: Optional[float] = Query(None, ge=0),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None, regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索商户列表
    """
    merchants, total = await merchant_service.search_merchants(
        db=db,
        keyword=keyword,
        category_id=category_id,
        status=status,
        latitude=latitude,
        longitude=longitude,
        distance=distance,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": merchants,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


@router.get("/{merchant_id}", response_model=schemas.merchant.MerchantDetail)
async def get_merchant(
    merchant_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商户详情
    """
    merchant = await merchant_service.get_merchant_detail(
        db=db,
        merchant_id=merchant_id
    )
    return merchant


@router.post("/", response_model=schemas.merchant.Merchant)
async def create_merchant(
    merchant_data: schemas.merchant.MerchantCreate,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建商户
    """
    merchant = await merchant_service.create_merchant(
        db=db,
        merchant_data=merchant_data,
        user_id=current_user.id
    )
    return merchant

#管理端更新
@router.put("/{merchant_id}", response_model=schemas.merchant.Merchant)
async def update_merchant(
    merchant_data: schemas.merchant.MerchantUpdate,
    merchant_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新商户信息（管理员可更新任意商户，商户只能更新自己）
    """
    # 检查用户是否有权限更新此商户
    if not current_user.is_admin and (not current_user.merchant_id or current_user.merchant_id != merchant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="没有权限更新其他商户的信息"
        )
    
    return await merchant_service.update_merchant(
        db=db,
        merchant_id=merchant_id,
        merchant_data=merchant_data
    )

#商户端更新
@router.put("/my", response_model=schemas.merchant.Merchant)
async def update_merchant(
    merchant_data: schemas.merchant.MerchantUpdate,
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新商户信息
    """
    return await merchant_service.update_merchant(
        db=db,
        merchant_id=current_user.merchant_id,
        merchant_data=merchant_data,
        user_id=current_user.id
    )
    

@router.put("/{merchant_id}", response_model=schemas.merchant.Merchant, dependencies=[Depends(deps.get_current_admin)])
async def update_merchant_by_admin(
    merchant_data: schemas.merchant.MerchantUpdate,
    merchant_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新商户信息（需要管理员权限）
    """
    return await merchant_service.update_merchant(
        db=db,
        merchant_id=merchant_id,
        merchant_data=merchant_data,
        is_admin=True  # 关键修改：标记为管理员调用
    )

@router.get("/categories/all", response_model=List[schemas.merchant.Category])
async def get_all_categories(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取所有分类
    """
    return await merchant_service.get_categories(
        db=db,
        is_active=is_active
    )


@router.post("/categories", response_model=schemas.merchant.Category, dependencies=[Depends(deps.get_current_admin)])
async def create_category(
    category_data: schemas.merchant.CategoryCreate,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建分类（需要管理员权限）
    """
    return await merchant_service.create_category(
        db=db,
        category_data=category_data
    )


@router.put("/categories/{category_id}", response_model=schemas.merchant.Category, dependencies=[Depends(deps.get_current_admin)])
async def update_category(
    category_data: schemas.merchant.CategoryUpdate,
    category_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新分类（需要管理员权限）
    """
    return await merchant_service.update_category(
        db=db,
        category_id=category_id,
        category_data=category_data
    )


@router.delete("/categories/{category_id}", response_model=schemas.common.BooleanResponse, dependencies=[Depends(deps.get_current_admin)])
async def delete_category(
    category_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    删除分类（需要管理员权限）
    """
    result = await merchant_service.delete_category(
        db=db,
        category_id=category_id
    )
    return {"data": result}