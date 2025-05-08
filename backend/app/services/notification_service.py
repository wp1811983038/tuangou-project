from datetime import datetime
from typing import Dict, List, Optional, Any

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.services import message_service, wechat_service
from app.models.order import Order
from app.models.group import Group
from app.models.user import User
from app.models.merchant import Merchant
from app.db.session import SessionLocal
from app.schemas.group import GroupParticipant
from app.schemas.message import MessageCreate, MessageType


async def send_order_notification(
    background_tasks: BackgroundTasks,
    order_id: int,
    notification_type: str
):
    """
    发送订单相关通知
    
    Args:
        background_tasks: 后台任务
        order_id: 订单ID
        notification_type: 通知类型
    """
    background_tasks.add_task(
        _send_order_notification_task,
        order_id=order_id,
        notification_type=notification_type
    )


async def _send_order_notification_task(order_id: int, notification_type: str):
    """
    订单通知任务
    
    Args:
        order_id: 订单ID
        notification_type: 通知类型
    """
    db = SessionLocal()
    try:
        # 获取订单信息
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return
        
        # 获取用户信息
        user = db.query(User).filter(User.id == order.user_id).first()
        if not user:
            return
        
        # 获取商户信息
        merchant = db.query(Merchant).filter(Merchant.id == order.merchant_id).first()
        if not merchant:
            return
        
        # 通知内容
        title = ""
        content = ""
        
        if notification_type == "created":
            # 订单创建通知
            title = "订单已创建"
            content = f"您的订单 {order.order_no} 已创建成功，请尽快支付。"
            
            # 商户通知
            merchant_title = "新订单通知"
            merchant_content = f"您有一个新订单 {order.order_no}，请及时处理。"
            
        elif notification_type == "paid":
            # 订单支付通知
            title = "订单已支付"
            content = f"您的订单 {order.order_no} 已支付成功，商家正在处理。"
            
            # 商户通知
            merchant_title = "订单支付通知"
            merchant_content = f"订单 {order.order_no} 已支付，请及时处理。"
            
            # 发送微信订阅消息
            if user.open_id:
                await _send_order_paid_template_message(user.open_id, order)
            
        elif notification_type == "shipped":
            # 订单发货通知
            title = "订单已发货"
            content = f"您的订单 {order.order_no} 已发货，{order.delivery_company}，物流单号：{order.tracking_number}。"
            
        elif notification_type == "completed":
            # 订单完成通知
            title = "订单已完成"
            content = f"您的订单 {order.order_no} 已完成，感谢您的购买。"
            
            # 商户通知
            merchant_title = "订单完成通知"
            merchant_content = f"订单 {order.order_no} 已完成。"
            
        elif notification_type == "cancelled":
            # 订单取消通知
            title = "订单已取消"
            content = f"您的订单 {order.order_no} 已取消，原因：{order.cancel_reason}。"
            
            # 商户通知
            merchant_title = "订单取消通知"
            merchant_content = f"订单 {order.order_no} 已取消，原因：{order.cancel_reason}。"
            
        elif notification_type == "refunded":
            # 订单退款通知
            title = "订单已退款"
            content = f"您的订单 {order.order_no} 已退款，退款金额：{order.refund_amount}元。"
            
            # 商户通知
            merchant_title = "订单退款通知"
            merchant_content = f"订单 {order.order_no} 已退款，退款金额：{order.refund_amount}元。"
        
        # 发送站内消息
        if title and content:
            await message_service.create_order_message(
                db=db,
                order_id=order_id,
                message_type="order",
                title=title,
                content=content
            )
    
    finally:
        db.close()


async def _send_order_paid_template_message(open_id: str, order: Order):
    """
    发送订单支付成功微信订阅消息
    
    Args:
        open_id: 接收者openid
        order: 订单对象
    """
    # 模板数据
    template_data = {
        "character_string1": {
            "value": order.order_no
        },
        "amount2": {
            "value": f"{order.actual_amount}元"
        },
        "phrase3": {
            "value": "支付成功"
        },
        "time4": {
            "value": order.payment_time.strftime("%Y-%m-%d %H:%M:%S") if order.payment_time else ""
        },
        "thing5": {
            "value": "感谢您的购买，商家正在处理您的订单"
        }
    }
    
    # 跳转页面
    page = f"pages/order/detail/index?id={order.id}"
    
    # 发送订阅消息
    try:
        await wechat_service.send_subscribe_message(
            open_id=open_id,
            template_id="YOUR_TEMPLATE_ID",  # 订单支付成功通知模板ID
            data=template_data,
            page=page
        )
    except Exception as e:
        # 忽略发送失败
        print(f"发送订阅消息失败: {e}")


async def send_group_notification(
    background_tasks: BackgroundTasks,
    group_id: int,
    notification_type: str
):
    """
    发送团购相关通知
    
    Args:
        background_tasks: 后台任务
        group_id: 团购ID
        notification_type: 通知类型
    """
    background_tasks.add_task(
        _send_group_notification_task,
        group_id=group_id,
        notification_type=notification_type
    )


async def _send_group_notification_task(group_id: int, notification_type: str):
    """
    团购通知任务
    
    Args:
        group_id: 团购ID
        notification_type: 通知类型
    """
    db = SessionLocal()
    try:
        # 获取团购信息
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return
        
        # 通知内容
        title = ""
        content = ""
        
        if notification_type == "succeeded":
            # 团购成功通知
            title = "团购成功通知"
            content = f"您参与的团购 \"{group.title}\" 已成功，请及时支付订单。"
            
            # 发送微信订阅消息给参与者
            participants = db.query(GroupParticipant).filter(
                GroupParticipant.group_id == group_id,
                GroupParticipant.status != 0  # 非取消状态
            ).all()
            
            for participant in participants:
                user = db.query(User).filter(User.id == participant.user_id).first()
                if user and user.open_id:
                    await _send_group_success_template_message(user.open_id, group)
            
        elif notification_type == "failed":
            # 团购失败通知
            title = "团购失败通知"
            content = f"您参与的团购 \"{group.title}\" 未能达成，团购已失败。"
            
        elif notification_type == "joined":
            # 新参与者通知（仅商户）
            title = "团购参与通知"
            content = f"您的团购 \"{group.title}\" 有新用户参与，当前参与人数：{group.current_participants}人。"
        
        # 发送站内消息
        if title and content:
            await message_service.create_group_message(
                db=db,
                group_id=group_id,
                message_type="group",
                title=title,
                content=content
            )
    
    finally:
        db.close()


async def _send_group_success_template_message(open_id: str, group: Group):
    """
    发送团购成功微信订阅消息
    
    Args:
        open_id: 接收者openid
        group: 团购对象
    """
    # 模板数据
    template_data = {
        "thing1": {
            "value": group.title[:20]  # 截断长度，微信限制
        },
        "amount2": {
            "value": f"{group.price}元"
        },
        "thing3": {
            "value": "团购已成功，请及时支付订单"
        },
        "time4": {
            "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    }
    
    # 跳转页面
    page = f"pages/group/index?id={group.id}"
    
    # 发送订阅消息
    try:
        await wechat_service.send_subscribe_message(
            open_id=open_id,
            template_id="YOUR_TEMPLATE_ID",  # 团购成功通知模板ID
            data=template_data,
            page=page
        )
    except Exception as e:
        # 忽略发送失败
        print(f"发送订阅消息失败: {e}")


async def send_system_notification(
    background_tasks: BackgroundTasks,
    title: str,
    content: str,
    user_ids: Optional[List[int]] = None,
    merchant_ids: Optional[List[int]] = None,
    is_all_users: bool = False,
    is_all_merchants: bool = False
):
    """
    发送系统通知
    
    Args:
        background_tasks: 后台任务
        title: 通知标题
        content: 通知内容
        user_ids: 用户ID列表
        merchant_ids: 商户ID列表
        is_all_users: 是否发送给所有用户
        is_all_merchants: 是否发送给所有商户
    """
    background_tasks.add_task(
        _send_system_notification_task,
        title=title,
        content=content,
        user_ids=user_ids,
        merchant_ids=merchant_ids,
        is_all_users=is_all_users,
        is_all_merchants=is_all_merchants
    )


async def _send_system_notification_task(
    title: str,
    content: str,
    user_ids: Optional[List[int]] = None,
    merchant_ids: Optional[List[int]] = None,
    is_all_users: bool = False,
    is_all_merchants: bool = False
):
    """
    系统通知任务
    
    Args:
        title: 通知标题
        content: 通知内容
        user_ids: 用户ID列表
        merchant_ids: 商户ID列表
        is_all_users: 是否发送给所有用户
        is_all_merchants: 是否发送给所有商户
    """
    db = SessionLocal()
    try:
        if is_all_users:
            # 给所有用户发送消息
            message_data = MessageCreate(
                title=title,
                content=content,
                type=MessageType.SYSTEM,
                is_all_users=True
            )
            await message_service.create_bulk_messages(db, message_data)
        
        elif is_all_merchants:
            # 给所有商户发送消息
            message_data = MessageCreate(
                title=title,
                content=content,
                type=MessageType.SYSTEM,
                is_all_merchants=True
            )
            await message_service.create_bulk_messages(db, message_data)
        
        else:
            # 给指定用户发送消息
            if user_ids:
                for user_id in user_ids:
                    message_data = MessageCreate(
                        title=title,
                        content=content,
                        type=MessageType.SYSTEM,
                        user_id=user_id
                    )
                    await message_service.create_message(db, message_data)
            
            # 给指定商户发送消息
            if merchant_ids:
                for merchant_id in merchant_ids:
                    message_data = MessageCreate(
                        title=title,
                        content=content,
                        type=MessageType.SYSTEM,
                        merchant_id=merchant_id
                    )
                    await message_service.create_message(db, message_data)
    
    finally:
        db.close()