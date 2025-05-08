from typing import Any, Dict, List, Optional, Union, Tuple, Callable

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import location_service

router = APIRouter()


@router.post("/search", response_model=List[schemas.location.LocationSearchResult])
async def search_location(
    search_params: schemas.location.LocationSearchParams,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索附近位置
    """
    return await location_service.search_location(
        latitude=search_params.latitude,
        longitude=search_params.longitude,
        keyword=search_params.keyword,
        radius=search_params.radius,
        type=search_params.type
    )


@router.post("/address", response_model=Dict)
async def get_address_by_location(
    coords: schemas.location.Coordinate,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    根据经纬度获取地址
    """
    return await location_service.get_address_by_location(
        latitude=coords.latitude,
        longitude=coords.longitude
    )


@router.post("/distance", response_model=schemas.location.DistanceCalculationResponse)
async def calculate_distance(
    distance_request: schemas.location.DistanceCalculationRequest,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    计算两点之间的距离
    """
    return await location_service.calculate_distance_api(
        start_latitude=distance_request.start_latitude,
        start_longitude=distance_request.start_longitude,
        end_latitude=distance_request.end_latitude,
        end_longitude=distance_request.end_longitude
    )


@router.post("/delivery-fee", response_model=Dict)
async def get_delivery_fee(
    merchant_id: int = Body(..., ge=1, embed=True),
    address_id: int = Body(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    计算配送费
    """
    fee = await location_service.get_delivery_fee(
        merchant_id=merchant_id,
        user_address_id=address_id,
        db=db
    )
    
    return {"fee": fee}


@router.post("/check-service-area", response_model=schemas.common.BooleanResponse)
async def check_in_service_area(
    merchant_id: int = Body(..., ge=1),
    latitude: float = Body(..., ge=-90, le=90),
    longitude: float = Body(..., ge=-180, le=180),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    检查位置是否在商户服务范围内
    """
    result = await location_service.check_in_service_area(
        merchant_id=merchant_id,
        latitude=latitude,
        longitude=longitude,
        db=db
    )
    
    return {"data": result}