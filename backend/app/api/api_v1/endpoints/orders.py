from typing import Any, Dict, List, Optional, Union, Tuple, Callable

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path, BackgroundTasks
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import order_service, notification_service

router = APIRouter()


@router.post("/", response_model=schemas.order.Order)
async def create_order(
    order_data: schemas.order.OrderCreate,
    background_tasks: BackgroundTasks,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建订单
    """
    order = await order_service.create_order(
        db=db,
        order_data=order_data,
        user_id=current_user.id
    )
    
    # 发送订单创建通知
    background_tasks.add_task(
        notification_service.send_order_notification,
        background_tasks=background_tasks,
        order_id=order.id,
        notification_type="created"
    )
    
    return order


@router.get("/{order_id}", response_model=schemas.order.Order)
async def get_order(
    order_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取订单详情
    """
    return await order_service.get_order(
        db=db,
        order_id=order_id,
        user_id=current_user.id
    )


@router.get("/", response_model=schemas.common.PaginatedResponse)
async def search_orders(
    keyword: Optional[str] = Query(None, max_length=100),
    group_id: Optional[int] = Query(None, ge=1),
    status: Optional[int] = Query(None, ge=0),
    payment_status: Optional[int] = Query(None, ge=0),
    delivery_status: Optional[int] = Query(None, ge=0),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None, regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索订单列表
    """
    from datetime import datetime
    
    # 处理日期参数
    start_datetime = None
    end_datetime = None
    
    if start_date:
        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
    
    if end_date:
        end_datetime = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
    
    orders, total = await order_service.search_orders(
        db=db,
        user_id=current_user.id,
        merchant_id=None,
        group_id=group_id,
        status=status,
        payment_status=payment_status,
        delivery_status=delivery_status,
        keyword=keyword,
        start_date=start_datetime,
        end_date=end_datetime,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": orders,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


@router.post("/{order_id}/pay", response_model=Dict)
async def pay_order(
    order_pay: schemas.order.OrderPayRequest,
    background_tasks: BackgroundTasks,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    订单支付（模拟）
    """
    payment_result = await order_service.pay_order(
        db=db,
        order_pay=order_pay,
        user_id=current_user.id
    )
    
    # 发送订单支付通知
    background_tasks.add_task(
        notification_service.send_order_notification,
        background_tasks=background_tasks,
        order_id=order_pay.order_id,
        notification_type="paid"
    )
    
    return payment_result


@router.post("/{order_id}/cancel", response_model=schemas.order.Order)
async def cancel_order(
    order_cancel: schemas.order.OrderCancelRequest,
    background_tasks: BackgroundTasks,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    取消订单
    """
    order = await order_service.cancel_order(
        db=db,
        order_cancel=order_cancel,
        user_id=current_user.id
    )
    
    # 发送订单取消通知
    background_tasks.add_task(
        notification_service.send_order_notification,
        background_tasks=background_tasks,
        order_id=order.id,
        notification_type="cancelled"
    )
    
    return order


@router.post("/{order_id}/refund", response_model=schemas.order.Order)
async def refund_order(
    order_refund: schemas.order.OrderRefundRequest,
    background_tasks: BackgroundTasks,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    申请退款
    """
    order = await order_service.refund_order(
        db=db,
        order_refund=order_refund,
        user_id=current_user.id
    )
    
    # 发送订单退款通知
    background_tasks.add_task(
        notification_service.send_order_notification,
        background_tasks=background_tasks,
        order_id=order.id,
        notification_type="refunded"
    )
    
    return order


@router.post("/{order_id}/receipt", response_model=schemas.order.Order)
async def confirm_receipt(
    order_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    确认收货
    """
    return await order_service.confirm_receipt(
        db=db,
        order_id=order_id,
        user_id=current_user.id
    )


@router.get("/merchant/list", response_model=schemas.common.PaginatedResponse)
async def get_merchant_orders(
    keyword: Optional[str] = Query(None, max_length=100),
    group_id: Optional[int] = Query(None, ge=1),
    status: Optional[int] = Query(None, ge=0),
    payment_status: Optional[int] = Query(None, ge=0),
    delivery_status: Optional[int] = Query(None, ge=0),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None, regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商户订单列表
    """
    from datetime import datetime
    
    # 处理日期参数
    start_datetime = None
    end_datetime = None
    
    if start_date:
        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
    
    if end_date:
        end_datetime = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
    
    orders, total = await order_service.search_orders(
        db=db,
        user_id=None,
        merchant_id=current_user.merchant_id,
        group_id=group_id,
        status=status,
        payment_status=payment_status,
        delivery_status=delivery_status,
        keyword=keyword,
        start_date=start_datetime,
        end_date=end_datetime,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": orders,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


@router.post("/merchant/{order_id}/confirm", response_model=schemas.order.Order)
async def confirm_order(
    order_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    商户确认订单
    """
    return await order_service.confirm_order(
        db=db,
        order_id=order_id,
        merchant_id=current_user.merchant_id
    )


@router.post("/merchant/{order_id}/deliver", response_model=schemas.order.Order)
async def deliver_order(
    order_deliver: schemas.order.OrderDeliveryRequest,
    background_tasks: BackgroundTasks,
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    商户发货
    """
    order = await order_service.deliver_order(
        db=db,
        order_deliver=order_deliver,
        merchant_id=current_user.merchant_id
    )
    
    # 发送订单发货通知
    background_tasks.add_task(
        notification_service.send_order_notification,
        background_tasks=background_tasks,
        order_id=order.id,
        notification_type="shipped"
    )
    
    return order


@router.post("/merchant/{order_id}/comment", response_model=schemas.order.Order)
async def add_seller_comment(
    comment: str = Body(..., embed=True),
    order_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    商户添加备注
    """
    return await order_service.add_seller_comment(
        db=db,
        order_id=order_id,
        comment=comment,
        merchant_id=current_user.merchant_id
    )


@router.get("/statistics", response_model=Dict)
async def get_user_order_statistics(
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取用户订单统计数据
    """
    return await order_service.get_order_statistics(
        db=db,
        user_id=current_user.id
    )


@router.get("/merchant/statistics", response_model=Dict)
async def get_merchant_order_statistics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商户订单统计数据
    """
    from datetime import datetime
    
    # 处理日期参数
    start_datetime = None
    end_datetime = None
    
    if start_date:
        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
    
    if end_date:
        end_datetime = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
    
    return await order_service.get_order_statistics(
        db=db,
        merchant_id=current_user.merchant_id,
        start_date=start_datetime,
        end_date=end_datetime
    )