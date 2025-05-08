from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import stats_service

router = APIRouter()


@router.post("/sales", response_model=List[schemas.statistics.SalesStat], dependencies=[Depends(deps.get_current_admin)])
async def get_sales_stats(
    query_params: schemas.statistics.StatisticsQueryParams,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取销售统计数据（需要管理员权限）
    """
    return await stats_service.get_sales_stats(
        db=db,
        start_date=query_params.start_date,
        end_date=query_params.end_date,
        merchant_id=query_params.merchant_id,
        time_unit=query_params.time_unit
    )


@router.post("/merchants", response_model=List[schemas.statistics.MerchantStat], dependencies=[Depends(deps.get_current_admin)])
async def get_merchant_stats(
    query_params: schemas.statistics.StatisticsQueryParams,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商户统计数据（需要管理员权限）
    """
    return await stats_service.get_merchant_stats(
        db=db,
        start_date=query_params.start_date,
        end_date=query_params.end_date,
        category_id=query_params.category_id,
        limit=limit
    )


@router.post("/products", response_model=List[schemas.statistics.ProductStat], dependencies=[Depends(deps.get_current_admin)])
async def get_product_stats(
    query_params: schemas.statistics.StatisticsQueryParams,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商品统计数据（需要管理员权限）
    """
    return await stats_service.get_product_stats(
        db=db,
        start_date=query_params.start_date,
        end_date=query_params.end_date,
        merchant_id=query_params.merchant_id,
        category_id=query_params.category_id,
        limit=limit
    )


@router.post("/groups", response_model=List[schemas.statistics.GroupStat], dependencies=[Depends(deps.get_current_admin)])
async def get_group_stats(
    query_params: schemas.statistics.StatisticsQueryParams,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取团购统计数据（需要管理员权限）
    """
    return await stats_service.get_group_stats(
        db=db,
        start_date=query_params.start_date,
        end_date=query_params.end_date,
        merchant_id=query_params.merchant_id,
        limit=limit
    )


@router.post("/users", response_model=List[schemas.statistics.UserStat], dependencies=[Depends(deps.get_current_admin)])
async def get_user_stats(
    query_params: schemas.statistics.StatisticsQueryParams,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取用户统计数据（需要管理员权限）
    """
    return await stats_service.get_user_stats(
        db=db,
        start_date=query_params.start_date,
        end_date=query_params.end_date,
        time_unit=query_params.time_unit
    )


@router.get("/admin-dashboard", response_model=schemas.statistics.StatisticsDashboard, dependencies=[Depends(deps.get_current_admin)])
async def get_admin_dashboard(
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取管理员仪表盘数据（需要管理员权限）
    """
    return await stats_service.get_admin_dashboard(db=db)


@router.get("/merchant-dashboard", response_model=schemas.statistics.MerchantDashboard)
async def get_merchant_dashboard(
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商户仪表盘数据
    """
    return await stats_service.get_merchant_dashboard(
        db=db,
        merchant_id=current_user.merchant_id
    )