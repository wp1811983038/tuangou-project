from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path, File, UploadFile
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import product_service

router = APIRouter()


@router.get("/", response_model=schemas.common.PaginatedResponse)
async def search_products(
    keyword: Optional[str] = Query(None, max_length=100),
    category_id: Optional[int] = Query(None, ge=1),
    merchant_id: Optional[int] = Query(None, ge=1),
    status: Optional[int] = Query(None, ge=0),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    is_hot: Optional[bool] = Query(None),
    is_new: Optional[bool] = Query(None),
    is_recommend: Optional[bool] = Query(None),
    has_group: Optional[bool] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None, regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    current_user: Optional[schemas.user.User] = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索商品列表
    """
    user_id = current_user.id if current_user else None
    
    products, total = await product_service.search_products(
        db=db,
        keyword=keyword,
        category_id=category_id,
        merchant_id=merchant_id,
        status=status,
        min_price=min_price,
        max_price=max_price,
        is_hot=is_hot,
        is_new=is_new,
        is_recommend=is_recommend,
        has_group=has_group,
        sort_by=sort_by,
        sort_order=sort_order,
        user_id=user_id,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": products,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


@router.get("/{product_id}", response_model=schemas.product.ProductDetail)
async def get_product(
    product_id: int = Path(..., ge=1),
    current_user: Optional[schemas.user.User] = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商品详情
    """
    user_id = current_user.id if current_user else None
    
    return await product_service.get_product(
        db=db,
        product_id=product_id,
        user_id=user_id
    )


@router.post("/", response_model=schemas.product.Product)
async def create_product(
    product_data: schemas.product.ProductCreate,
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建商品
    """
    return await product_service.create_product(
        db=db,
        product_data=product_data,
        merchant_id=current_user.merchant_id
    )


@router.put("/{product_id}", response_model=schemas.product.Product)
async def update_product(
    product_data: schemas.product.ProductUpdate,
    product_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新商品
    """
    return await product_service.update_product(
        db=db,
        product_id=product_id,
        product_data=product_data,
        merchant_id=current_user.merchant_id
    )


@router.put("/{product_id}/images", response_model=List[schemas.product.ProductImage])
async def update_product_images(
    images: List[schemas.product.ProductImageCreate],
    product_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新商品图片
    """
    return await product_service.update_product_images(
        db=db,
        product_id=product_id,
        merchant_id=current_user.merchant_id,
        images=images
    )


@router.put("/{product_id}/specifications", response_model=List[schemas.product.ProductSpecification])
async def update_product_specifications(
    specifications: List[schemas.product.ProductSpecificationCreate],
    product_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新商品规格
    """
    return await product_service.update_product_specifications(
        db=db,
        product_id=product_id,
        merchant_id=current_user.merchant_id,
        specifications=specifications
    )


@router.delete("/{product_id}", response_model=schemas.common.BooleanResponse)
async def delete_product(
    product_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    删除商品
    """
    result = await product_service.delete_product(
        db=db,
        product_id=product_id,
        merchant_id=current_user.merchant_id
    )
    return {"data": result}


@router.get("/{product_id}/related", response_model=List[schemas.product.Product])
async def get_related_products(
    product_id: int = Path(..., ge=1),
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取相关商品
    """
    return await product_service.get_related_products(
        db=db,
        product_id=product_id,
        limit=limit
    )