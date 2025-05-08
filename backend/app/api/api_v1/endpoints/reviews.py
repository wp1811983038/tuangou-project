from typing import Any, Dict, List, Optional, Union, Tuple, Callable

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import review_service

router = APIRouter()


@router.post("/", response_model=schemas.review.Review)
async def create_review(
    review_data: schemas.review.ReviewCreate,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建商品评价
    """
    return await review_service.create_review(
        db=db,
        review_data=review_data,
        user_id=current_user.id
    )


@router.get("/{review_id}", response_model=schemas.review.Review)
async def get_review(
    review_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取评价详情
    """
    return await review_service.get_review(
        db=db,
        review_id=review_id
    )


@router.get("/", response_model=schemas.common.PaginatedResponse)
async def search_reviews(
    product_id: Optional[int] = Query(None, ge=1),
    merchant_id: Optional[int] = Query(None, ge=1),
    user_id: Optional[int] = Query(None, ge=1),
    status: Optional[int] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=1, le=5),
    max_rating: Optional[float] = Query(None, ge=1, le=5),
    has_reply: Optional[bool] = Query(None),
    has_image: Optional[bool] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None, regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索评价列表
    """
    reviews, total = await review_service.search_reviews(
        db=db,
        product_id=product_id,
        merchant_id=merchant_id,
        user_id=user_id,
        status=status,
        min_rating=min_rating,
        max_rating=max_rating,
        has_reply=has_reply,
        has_image=has_image,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": reviews,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


@router.post("/{review_id}/reply", response_model=schemas.review.Review)
async def reply_review(
    reply_data: schemas.review.ReviewReplyRequest,
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    商户回复评价
    """
    return await review_service.reply_review(
        db=db,
        reply_data=reply_data,
        merchant_id=current_user.merchant_id
    )


@router.put("/admin/{review_id}/status", response_model=schemas.review.Review, dependencies=[Depends(deps.get_current_admin)])
async def update_review_status(
    status: int = Body(..., ge=0, le=2, embed=True),
    review_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新评价状态（需要管理员权限）
    """
    return await review_service.update_review_status(
        db=db,
        review_id=review_id,
        status=status
    )


@router.get("/product/{product_id}/stats", response_model=Dict)
async def get_product_review_stats(
    product_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商品评价统计
    """
    return await review_service.get_product_review_stats(
        db=db,
        product_id=product_id
    )