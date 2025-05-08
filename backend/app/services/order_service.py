from datetime import datetime, timedelta
import uuid
from typing import Dict, List, Optional, Tuple, Any

from fastapi import HTTPException, status
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session, joinedload

from app.models.order import Order, OrderItem, Payment
from app.models.user import User, Address
from app.models.merchant import Merchant
from app.models.product import Product, ProductSpecification
from app.models.group import Group, GroupParticipant
from app.schemas.order import OrderCreate, OrderUpdate, OrderItemCreate, OrderPayRequest, OrderRefundRequest, OrderCancelRequest, OrderDeliveryRequest


async def create_order(
    db: Session,
    order_data: OrderCreate,
    user_id: int
) -> Order:
    """创建订单"""
    # 检查地址是否存在且属于该用户
    address = db.query(Address).filter(
        Address.id == order_data.address_id,
        Address.user_id == user_id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="地址不存在或无权限")
    
    # 检查商户是否存在且状态正常
    merchant = db.query(Merchant).filter(
        Merchant.id == order_data.merchant_id,
        Merchant.status == 1  # 正常状态
    ).first()
    
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在或已禁用")
    
    # 检查团购（如果有）
    group = None
    is_group_order = False
    if order_data.group_id:
        group = db.query(Group).filter(
            Group.id == order_data.group_id,
            Group.status == 1,  # 进行中
            Group.end_time > datetime.now()
        ).first()
        
        if not group:
            raise HTTPException(status_code=404, detail="团购不存在或已结束")
        
        # 检查是否参与了该团购
        participant = db.query(GroupParticipant).filter(
            GroupParticipant.group_id == order_data.group_id,
            GroupParticipant.user_id == user_id,
            GroupParticipant.status != 0  # 非取消状态
        ).first()
        
        if not participant:
            raise HTTPException(status_code=400, detail="未参与该团购")
        
        # 检查是否已有订单
        existing_order = db.query(Order).filter(
            Order.user_id == user_id,
            Order.group_id == order_data.group_id,
            Order.status != 4  # 非取消状态
        ).first()
        
        if existing_order:
            raise HTTPException(status_code=400, detail="已有该团购订单")
        
        is_group_order = True
    
    # 处理订单项
    items_data = []
    total_amount = 0
    
    for item_data in order_data.items:
        # 检查商品是否存在且状态正常
        product = db.query(Product).filter(
            Product.id == item_data.product_id,
            Product.status == 1,  # 上架状态
            Product.merchant_id == order_data.merchant_id
        ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail=f"商品 {item_data.product_id} 不存在或已下架")
        
        # 获取规格（如果有）
        specification = None
        if item_data.specification_id:
            specification = db.query(ProductSpecification).filter(
                ProductSpecification.id == item_data.specification_id,
                ProductSpecification.product_id == item_data.product_id
            ).first()
            
            if not specification:
                raise HTTPException(status_code=404, detail=f"商品规格不存在")
        
        # 确定价格
        price = product.current_price
        if is_group_order and group:
            price = group.price
        elif specification:
            price = product.current_price + specification.price_adjustment
        
        # 检查库存
        stock = specification.stock if specification else product.stock
        if stock < item_data.quantity:
            raise HTTPException(status_code=400, detail=f"商品 {product.name} 库存不足")
        
        # 计算小计
        subtotal = price * item_data.quantity
        
        # 添加到订单项
        items_data.append({
            "product_id": product.id,
            "product_name": product.name,
            "product_image": product.thumbnail,
            "specification": specification.name + ": " + specification.value if specification else None,
            "price": price,
            "quantity": item_data.quantity,
            "subtotal": subtotal
        })
        
        total_amount += subtotal
        
        # 减少库存
        if specification:
            specification.stock -= item_data.quantity
        else:
            product.stock -= item_data.quantity
    
    # 生成订单号
    order_no = f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
    
    # 创建订单
    order = Order(
        order_no=order_no,
        user_id=user_id,
        merchant_id=order_data.merchant_id,
        group_id=order_data.group_id if is_group_order else None,
        address_id=order_data.address_id,
        total_amount=total_amount,
        actual_amount=total_amount,  # 暂不考虑优惠
        freight=0.0,  # 暂不考虑运费
        discount=0.0,  # 暂不考虑折扣
        status=0,  # 待支付
        payment_status=0,  # 未支付
        delivery_status=0,  # 未发货
        buyer_comment=order_data.buyer_comment
    )
    
    db.add(order)
    db.flush()  # 获取订单ID
    
    # 创建订单项
    for item_data in items_data:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item_data["product_id"],
            product_name=item_data["product_name"],
            product_image=item_data["product_image"],
            specification=item_data["specification"],
            price=item_data["price"],
            quantity=item_data["quantity"],
            subtotal=item_data["subtotal"]
        )
        db.add(order_item)
    
    # 更新团购参与者状态（如果是团购订单）
    if is_group_order and participant:
        participant.status = 1  # 已参与状态保持不变
    
    db.commit()
    db.refresh(order)
    
    # 设置订单自动取消
    # 在实际应用中，这里应该添加到任务队列中
    # 这里只是示例，实际实现可能会有所不同
    
    return order


async def get_order(db: Session, order_id: int, user_id: Optional[int] = None, merchant_id: Optional[int] = None) -> Dict:
    """获取订单详情"""
    query = db.query(Order)
    
    # 用户查询自己的订单
    if user_id is not None:
        query = query.filter(Order.user_id == user_id)
    
    # 商户查询自己店铺的订单
    if merchant_id is not None:
        query = query.filter(Order.merchant_id == merchant_id)
    
    order = query.filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在或无权限")
    
    # 获取订单项
    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    
    # 获取支付记录
    payments = db.query(Payment).filter(Payment.order_id == order_id).all()
    
    # 获取地址
    address = db.query(Address).filter(Address.id == order.address_id).first()
    
    # 获取商户信息
    merchant = db.query(Merchant).filter(Merchant.id == order.merchant_id).first()
    
    # 获取团购信息
    group = None
    if order.group_id:
        group = db.query(Group).filter(Group.id == order.group_id).first()
    
    # 计算倒计时（如果是待支付状态）
    countdown_seconds = None
    if order.status == 0:  # 待支付
        # 假设订单30分钟内有效
        order_time = order.created_at
        expiry_time = order_time + timedelta(minutes=30)
        now = datetime.now()
        
        if now < expiry_time:
            countdown_seconds = int((expiry_time - now).total_seconds())
        else:
            # 订单已过期，但状态未更新
            countdown_seconds = 0
    
    return {
        "id": order.id,
        "order_no": order.order_no,
        "user_id": order.user_id,
        "merchant_id": order.merchant_id,
        "group_id": order.group_id,
        "address_id": order.address_id,
        "total_amount": order.total_amount,
        "actual_amount": order.actual_amount,
        "freight": order.freight,
        "discount": order.discount,
        "status": order.status,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "payment_time": order.payment_time,
        "delivery_status": order.delivery_status,
        "delivery_company": order.delivery_company,
        "tracking_number": order.tracking_number,
        "delivery_time": order.delivery_time,
        "completion_time": order.completion_time,
        "cancel_time": order.cancel_time,
        "cancel_reason": order.cancel_reason,
        "refund_time": order.refund_time,
        "refund_reason": order.refund_reason,
        "refund_amount": order.refund_amount,
        "buyer_comment": order.buyer_comment,
        "seller_comment": order.seller_comment,
        "countdown_seconds": countdown_seconds,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "merchant_name": merchant.name if merchant else None,
        "merchant_logo": merchant.logo if merchant else None,
        "address": {
            "id": address.id,
            "recipient": address.recipient,
            "phone": address.phone,
            "province": address.province,
            "city": address.city,
            "district": address.district,
            "detail": address.detail,
            "latitude": address.latitude,
            "longitude": address.longitude
        } if address else None,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "product_image": item.product_image,
                "specification": item.specification,
                "price": item.price,
                "quantity": item.quantity,
                "subtotal": item.subtotal
            } for item in items
        ],
        "payments": [
            {
                "id": payment.id,
                "payment_no": payment.payment_no,
                "transaction_id": payment.transaction_id,
                "amount": payment.amount,
                "method": payment.method,
                "status": payment.status,
                "paid_time": payment.paid_time,
                "refund_time": payment.refund_time
            } for payment in payments
        ],
        "group": {
            "id": group.id,
            "title": group.title,
            "price": group.price,
            "min_participants": group.min_participants,
            "max_participants": group.max_participants,
            "current_participants": group.current_participants,
            "status": group.status,
            "end_time": group.end_time
        } if group else None
    }


async def search_orders(
    db: Session,
    user_id: Optional[int] = None,
    merchant_id: Optional[int] = None,
    group_id: Optional[int] = None,
    status: Optional[int] = None,
    payment_status: Optional[int] = None,
    delivery_status: Optional[int] = None,
    keyword: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[Dict], int]:
    """搜索订单列表"""
    query = db.query(Order)
    
    # 筛选条件
    if user_id is not None:
        query = query.filter(Order.user_id == user_id)
    
    if merchant_id is not None:
        query = query.filter(Order.merchant_id == merchant_id)
    
    if group_id is not None:
        query = query.filter(Order.group_id == group_id)
    
    if status is not None:
        query = query.filter(Order.status == status)
    
    if payment_status is not None:
        query = query.filter(Order.payment_status == payment_status)
    
    if delivery_status is not None:
        query = query.filter(Order.delivery_status == delivery_status)
    
    if keyword:
        query = query.filter(
            (Order.order_no.ilike(f"%{keyword}%")) |
            (Order.buyer_comment.ilike(f"%{keyword}%")) |
            Order.id.in_(
                db.query(OrderItem.order_id).filter(
                    OrderItem.product_name.ilike(f"%{keyword}%")
                )
            )
        )
    
    if start_date:
        query = query.filter(Order.created_at >= start_date)
    
    if end_date:
        query = query.filter(Order.created_at <= end_date)
    
    # 查询总数
    total = query.count()
    
    # 排序
    if sort_by:
        direction = desc if sort_order == "desc" else asc
        if sort_by == "created_at":
            query = query.order_by(direction(Order.created_at))
        elif sort_by == "total_amount":
            query = query.order_by(direction(Order.total_amount))
        elif sort_by == "payment_time":
            query = query.order_by(direction(Order.payment_time))
    else:
        # 默认按创建时间倒序
        query = query.order_by(Order.created_at.desc())
    
    # 分页
    orders = query.offset(skip).limit(limit).all()
    
    # 处理结果
    result = []
    for order in orders:
        # 获取商户信息
        merchant = db.query(Merchant).filter(Merchant.id == order.merchant_id).first()
        
        # 获取订单项
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        
        # 计算倒计时（如果是待支付状态）
        countdown_seconds = None
        if order.status == 0:  # 待支付
            # 假设订单30分钟内有效
            order_time = order.created_at
            expiry_time = order_time + timedelta(minutes=30)
            now = datetime.now()
            
            if now < expiry_time:
                countdown_seconds = int((expiry_time - now).total_seconds())
            else:
                # 订单已过期，但状态未更新
                countdown_seconds = 0
        
        order_data = {
            "id": order.id,
            "order_no": order.order_no,
            "user_id": order.user_id,
            "merchant_id": order.merchant_id,
            "group_id": order.group_id,
            "total_amount": order.total_amount,
            "actual_amount": order.actual_amount,
            "status": order.status,
            "payment_status": order.payment_status,
            "payment_method": order.payment_method,
            "payment_time": order.payment_time,
            "delivery_status": order.delivery_status,
            "delivery_company": order.delivery_company,
            "tracking_number": order.tracking_number,
            "created_at": order.created_at,
            "countdown_seconds": countdown_seconds,
            "merchant_name": merchant.name if merchant else None,
            "merchant_logo": merchant.logo if merchant else None,
            "items": [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "product_image": item.product_image,
                    "specification": item.specification,
                    "price": item.price,
                    "quantity": item.quantity
                } for item in items
            ]
        }
        
        result.append(order_data)
    
    return result, total


async def pay_order(db: Session, order_pay: OrderPayRequest, user_id: int) -> Dict:
    """订单支付（模拟）"""
    # 检查订单是否存在且属于该用户
    order = db.query(Order).filter(
        Order.id == order_pay.order_id,
        Order.user_id == user_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在或无权限")
    
    # 检查订单状态
    if order.status != 0:  # 不是待支付状态
        raise HTTPException(status_code=400, detail="订单状态不正确")
    
    # 检查订单是否已过期
    order_time = order.created_at
    expiry_time = order_time + timedelta(minutes=30)
    now = datetime.now()
    
    if now > expiry_time:
        # 订单已过期，自动取消
        order.status = 4  # 已取消
        order.cancel_time = now
        order.cancel_reason = "支付超时，系统自动取消"
        db.commit()
        
        raise HTTPException(status_code=400, detail="订单已过期")
    
    # 生成支付单号
    payment_no = f"PAY{now.strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
    
    # 模拟支付处理
    # 实际开发中，这里应该调用支付网关API
    
    # 创建支付记录
    payment = Payment(
        order_id=order.id,
        payment_no=payment_no,
        transaction_id=f"TX{uuid.uuid4().hex[:10].upper()}",  # 模拟交易ID
        amount=order.actual_amount,
        method=order_pay.payment_method,
        status=1,  # 已支付
        paid_time=now
    )
    
    db.add(payment)
    
    # 更新订单状态
    order.status = 1  # 已支付
    order.payment_status = 1  # 已支付
    order.payment_method = order_pay.payment_method
    order.payment_time = now
    
    # 如果是团购订单，更新团购参与状态
    if order.group_id:
        participant = db.query(GroupParticipant).filter(
            GroupParticipant.group_id == order.group_id,
            GroupParticipant.user_id == user_id
        ).first()
        
        if participant:
            participant.status = 2  # 已支付
    
    # 更新商品销量
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    for item in order_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            # Continuing order_service.py
            product.sales += item.quantity
    
    db.commit()
    db.refresh(order)
    
    return {
        "id": order.id,
        "order_no": order.order_no,
        "payment_no": payment_no,
        "status": order.status,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "payment_time": order.payment_time,
        "amount": order.actual_amount
    }


async def cancel_order(db: Session, order_cancel: OrderCancelRequest, user_id: int) -> Order:
    """取消订单"""
    # 检查订单是否存在且属于该用户
    order = db.query(Order).filter(
        Order.id == order_cancel.order_id,
        Order.user_id == user_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在或无权限")
    
    # 检查订单状态
    if order.status not in [0, 1]:  # 只有待支付和已支付状态可以取消
        raise HTTPException(status_code=400, detail="当前订单状态不允许取消")
    
    # 如果订单已支付，需要退款
    if order.status == 1:
        # 创建退款记录
        now = datetime.now()
        refund_amount = order.actual_amount
        
        payment = db.query(Payment).filter(
            Payment.order_id == order.id,
            Payment.status == 1  # 已支付
        ).first()
        
        if payment:
            payment.status = 2  # 已退款
            payment.refund_time = now
        
        # 更新订单状态
        order.status = 5  # 已退款
        order.payment_status = 2  # 已退款
        order.refund_time = now
        order.refund_reason = order_cancel.cancel_reason
        order.refund_amount = refund_amount
    else:
        # 待支付订单直接取消
        order.status = 4  # 已取消
        order.cancel_time = datetime.now()
        order.cancel_reason = order_cancel.cancel_reason
    
    # 如果是团购订单，更新团购参与状态
    if order.group_id:
        participant = db.query(GroupParticipant).filter(
            GroupParticipant.group_id == order.group_id,
            GroupParticipant.user_id == user_id
        ).first()
        
        if participant:
            participant.status = 0  # 已取消
            
            # 更新团购人数
            group = db.query(Group).filter(Group.id == order.group_id).first()
            if group:
                group.current_participants -= 1
    
    # 恢复商品库存
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    for item in order_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity
            
            # 如果已支付，需要减少销量
            if order.status == 5:  # 已退款
                product.sales -= item.quantity
    
    db.commit()
    db.refresh(order)
    
    return order


async def refund_order(db: Session, order_refund: OrderRefundRequest, user_id: int) -> Order:
    """申请退款"""
    # 检查订单是否存在且属于该用户
    order = db.query(Order).filter(
        Order.id == order_refund.order_id,
        Order.user_id == user_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在或无权限")
    
    # 检查订单状态
    if order.status not in [1, 2]:  # 只有已支付和已发货状态可以申请退款
        raise HTTPException(status_code=400, detail="当前订单状态不允许申请退款")
    
    # 确定退款金额
    refund_amount = order_refund.refund_amount
    if refund_amount is None or refund_amount > order.actual_amount:
        refund_amount = order.actual_amount
    
    # 更新订单状态
    now = datetime.now()
    order.status = 5  # 已退款
    order.payment_status = 2  # 已退款
    order.refund_time = now
    order.refund_reason = order_refund.refund_reason
    order.refund_amount = refund_amount
    
    # 更新支付记录
    payment = db.query(Payment).filter(
        Payment.order_id == order.id,
        Payment.status == 1  # 已支付
    ).first()
    
    if payment:
        payment.status = 2  # 已退款
        payment.refund_time = now
    
    # 如果是团购订单，更新团购参与状态
    if order.group_id:
        participant = db.query(GroupParticipant).filter(
            GroupParticipant.group_id == order.group_id,
            GroupParticipant.user_id == user_id
        ).first()
        
        if participant:
            participant.status = 0  # 已取消
            
            # 更新团购人数
            group = db.query(Group).filter(Group.id == order.group_id).first()
            if group:
                group.current_participants -= 1
    
    # 恢复商品库存和减少销量
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    for item in order_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity
            product.sales -= item.quantity
    
    db.commit()
    db.refresh(order)
    
    return order


async def confirm_order(db: Session, order_id: int, merchant_id: int) -> Order:
    """商户确认订单"""
    # 检查订单是否存在且属于该商户
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.merchant_id == merchant_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在或无权限")
    
    # 检查订单状态
    if order.status != 1:  # 只有已支付状态可以确认
        raise HTTPException(status_code=400, detail="当前订单状态不允许确认")
    
    # 更新订单状态
    order.status = 2  # 已确认/已发货
    order.delivery_status = 1  # 已发货
    order.delivery_time = datetime.now()
    
    db.commit()
    db.refresh(order)
    
    return order


async def deliver_order(db: Session, order_deliver: OrderDeliveryRequest, merchant_id: int) -> Order:
    """商户发货"""
    # 检查订单是否存在且属于该商户
    order = db.query(Order).filter(
        Order.id == order_deliver.order_id,
        Order.merchant_id == merchant_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在或无权限")
    
    # 检查订单状态
    if order.status != 1:  # 只有已支付状态可以发货
        raise HTTPException(status_code=400, detail="当前订单状态不允许发货")
    
    # 更新订单状态
    order.status = 2  # 已发货
    order.delivery_status = 1  # 已发货
    order.delivery_time = datetime.now()
    order.delivery_company = order_deliver.delivery_company
    order.tracking_number = order_deliver.tracking_number
    
    db.commit()
    db.refresh(order)
    
    return order


async def confirm_receipt(db: Session, order_id: int, user_id: int) -> Order:
    """用户确认收货"""
    # 检查订单是否存在且属于该用户
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == user_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在或无权限")
    
    # 检查订单状态
    if order.status != 2:  # 只有已发货状态可以确认收货
        raise HTTPException(status_code=400, detail="当前订单状态不允许确认收货")
    
    # 更新订单状态
    order.status = 3  # 已完成
    order.delivery_status = 2  # 已收货
    order.completion_time = datetime.now()
    
    db.commit()
    db.refresh(order)
    
    return order


async def add_seller_comment(db: Session, order_id: int, comment: str, merchant_id: int) -> Order:
    """商户添加备注"""
    # 检查订单是否存在且属于该商户
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.merchant_id == merchant_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在或无权限")
    
    # 添加商户备注
    order.seller_comment = comment
    
    db.commit()
    db.refresh(order)
    
    return order


async def get_order_statistics(
    db: Session,
    merchant_id: Optional[int] = None,
    user_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Dict:
    """获取订单统计数据"""
    query = db.query(Order)
    
    # 筛选条件
    if merchant_id is not None:
        query = query.filter(Order.merchant_id == merchant_id)
    
    if user_id is not None:
        query = query.filter(Order.user_id == user_id)
    
    if start_date:
        query = query.filter(Order.created_at >= start_date)
    
    if end_date:
        query = query.filter(Order.created_at <= end_date)
    
    # 订单总数
    total_count = query.count()
    
    # 订单总金额（已支付的）
    total_amount = db.query(func.sum(Order.actual_amount)).filter(
        Order.status.in_([1, 2, 3])  # 已支付、已发货、已完成
    ).scalar() or 0
    
    # 按状态统计订单数量
    status_counts = {}
    for status_value in range(6):  # 0-5
        count = query.filter(Order.status == status_value).count()
        status_counts[str(status_value)] = count
    
    # 最近订单
    recent_orders = query.order_by(Order.created_at.desc()).limit(5).all()
    
    return {
        "total_count": total_count,
        "total_amount": total_amount,
        "status_counts": status_counts,
        "recent_orders": [
            {
                "id": order.id,
                "order_no": order.order_no,
                "status": order.status,
                "actual_amount": order.actual_amount,
                "created_at": order.created_at
            } for order in recent_orders
        ]
    }


async def check_and_cancel_expired_orders():
    """检查并取消过期未支付订单（定时任务）"""
    with SessionLocal() as db:
        # 查找超过30分钟未支付的订单
        expire_time = datetime.now() - timedelta(minutes=30)
        expired_orders = db.query(Order).filter(
            Order.status == 0,  # 待支付
            Order.created_at < expire_time
        ).all()
        
        for order in expired_orders:
            # 更新订单状态
            order.status = 4  # 已取消
            order.cancel_time = datetime.now()
            order.cancel_reason = "支付超时，系统自动取消"
            
            # 如果是团购订单，更新团购参与状态
            if order.group_id:
                participant = db.query(GroupParticipant).filter(
                    GroupParticipant.group_id == order.group_id,
                    GroupParticipant.user_id == order.user_id
                ).first()
                
                if participant:
                    participant.status = 0  # 已取消
                    
                    # 更新团购人数
                    group = db.query(Group).filter(Group.id == order.group_id).first()
                    if group:
                        group.current_participants -= 1
        
        db.commit()
        
        return len(expired_orders)


async def check_and_auto_confirm_orders():
    """检查并自动确认收货（定时任务）"""
    with SessionLocal() as db:
        # 查找超过7天已发货但未确认收货的订单
        expire_time = datetime.now() - timedelta(days=7)
        auto_confirm_orders = db.query(Order).filter(
            Order.status == 2,  # 已发货
            Order.delivery_time < expire_time
        ).all()
        
        for order in auto_confirm_orders:
            # 更新订单状态
            order.status = 3  # 已完成
            order.delivery_status = 2  # 已收货
            order.completion_time = datetime.now()
        
        db.commit()
        
        return len(auto_confirm_orders)