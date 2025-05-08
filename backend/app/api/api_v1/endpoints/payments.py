from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request, BackgroundTasks, Response
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import payment_service, order_service, notification_service

router = APIRouter()


@router.post("/wechat/create", response_model=schemas.wechat.WxPaymentResponse)
async def create_wechat_payment(
    payment_data: schemas.wechat.WxPaymentRequest,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建微信支付
    """
    # 检查订单是否存在且属于该用户
    order = await order_service.get_order(
        db=db,
        order_id=payment_data.order_id,
        user_id=current_user.id
    )
    
    # 创建微信支付
    return await payment_service.create_wechat_payment(
        order_id=str(order["id"]),
        total_fee=payment_data.total_fee,
        body=payment_data.body,
        openid=current_user.open_id,
        attach=payment_data.attach,
        notify_url=payment_data.notify_url
    )


@router.post("/wechat/notify")
async def wechat_payment_notify(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    微信支付回调通知
    """
    # 读取XML数据
    xml_data = await request.body()
    
    # 处理支付结果
    result = await payment_service.handle_wechat_payment_notify(
        db=db,
        xml_data=xml_data.decode("utf-8")
    )
    
    # 支付成功，更新订单状态并发送通知
    if result.get("success"):
        order_id = result.get("order_id")
        if order_id:
            background_tasks.add_task(
                notification_service.send_order_notification,
                background_tasks=background_tasks,
                order_id=int(order_id),
                notification_type="paid"
            )
    
    # 返回处理结果
    return Response(
        content=result.get("response"),
        media_type="application/xml"
    )


@router.post("/wechat/refund", response_model=Dict)
async def create_wechat_refund(
    refund_data: schemas.order.OrderRefundRequest,
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建微信退款（商户操作）
    """
    # 检查订单是否存在且属于该商户
    order = await order_service.get_merchant_order(
        db=db,
        order_id=refund_data.order_id,
        merchant_id=current_user.merchant_id
    )
    
    # 获取支付记录
    payment = await payment_service.get_order_payment(
        db=db,
        order_id=refund_data.order_id
    )
    
    if not payment:
        raise HTTPException(status_code=404, detail="未找到支付记录")
    
    # 计算退款金额
    refund_amount = refund_data.refund_amount or order.actual_amount
    
    # 创建微信退款
    refund_result = await payment_service.create_wechat_refund(
        transaction_id=payment.transaction_id,
        out_trade_no=order.order_no,
        out_refund_no=None,  # 自动生成
        total_fee=int(order.actual_amount * 100),
        refund_fee=int(refund_amount * 100),
        refund_desc=refund_data.refund_reason
    )
    
    # 更新订单状态
    if refund_result.get("result_code") == "SUCCESS":
        await order_service.update_order_refund(
            db=db,
            order_id=refund_data.order_id,
            refund_amount=refund_amount,
            refund_reason=refund_data.refund_reason
        )
    
    return refund_result


@router.post("/wechat/refund/notify")
async def wechat_refund_notify(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    微信退款回调通知
    """
    # 读取XML数据
    xml_data = await request.body()
    
    # 处理退款结果
    result = await payment_service.handle_wechat_refund_notify(
        db=db,
        xml_data=xml_data.decode("utf-8")
    )
    
    # 退款成功，更新订单状态并发送通知
    if result.get("success"):
        order_id = result.get("order_id")
        if order_id:
            background_tasks.add_task(
                notification_service.send_order_notification,
                background_tasks=background_tasks,
                order_id=int(order_id),
                notification_type="refunded"
            )
    
    # 返回处理结果
    return Response(
        content=result.get("response"),
        media_type="application/xml"
    )


@router.get("/order/{order_id}/status", response_model=Dict)
async def get_payment_status(
    order_id: int,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取订单支付状态
    """
    # 检查订单是否存在且属于该用户
    order = await order_service.get_order(
        db=db,
        order_id=order_id,
        user_id=current_user.id
    )
    
    # 获取支付状态
    payment = await payment_service.get_order_payment(
        db=db,
        order_id=order_id
    )
    
    return {
        "order_id": order_id,
        "order_no": order.order_no,
        "payment_status": order.payment_status,
        "payment_time": payment.paid_time if payment else None,
        "payment_method": payment.method if payment else None
    }


@router.post("/simulate/pay", response_model=Dict)
async def simulate_payment(
    order_id: int = Body(..., embed=True),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    模拟支付（仅用于测试）
    """
    # 检查订单是否存在且属于该用户
    order = await order_service.get_order(
        db=db,
        order_id=order_id,
        user_id=current_user.id
    )
    
    # 模拟支付
    result = await payment_service.simulate_payment(
        db=db,
        order_id=order_id
    )
    
    # 发送支付成功通知
    if result.get("success"):
        background_tasks.add_task(
            notification_service.send_order_notification,
            background_tasks=background_tasks,
            order_id=order_id,
            notification_type="paid"
        )
    
    return result