from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from fastapi import HTTPException, status
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session

from app.models.message import Message
from app.schemas.message import MessageCreate, MessageUpdate, MessageType


async def create_message(db: Session, message_data: MessageCreate) -> Message:
    """创建消息"""
    # 创建消息
    message = Message(
        title=message_data.title,
        content=message_data.content,
        type=message_data.type,
        link_type=message_data.link_type,
        link_id=message_data.link_id,
        link_url=message_data.link_url,
        user_id=message_data.user_id,
        merchant_id=message_data.merchant_id,
        is_read=False
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    return message


async def create_bulk_messages(db: Session, message_data: MessageCreate) -> int:
    """批量创建消息"""
    if message_data.is_all_users:
        # 给所有用户发送消息
        users = db.query(User).filter(User.is_active == True).all()
        for user in users:
            message = Message(
                title=message_data.title,
                content=message_data.content,
                type=message_data.type,
                link_type=message_data.link_type,
                link_id=message_data.link_id,
                link_url=message_data.link_url,
                user_id=user.id,
                is_read=False
            )
            db.add(message)
        
        db.commit()
        return len(users)
    
    elif message_data.is_all_merchants:
        # 给所有商户发送消息
        merchants = db.query(Merchant).filter(Merchant.status == 1).all()
        for merchant in merchants:
            message = Message(
                title=message_data.title,
                content=message_data.content,
                type=message_data.type,
                link_type=message_data.link_type,
                link_id=message_data.link_id,
                link_url=message_data.link_url,
                merchant_id=merchant.id,
                is_read=False
            )
            db.add(message)
        
        db.commit()
        return len(merchants)
    
    else:
        # 单个消息
        message = Message(
            title=message_data.title,
            content=message_data.content,
            type=message_data.type,
            link_type=message_data.link_type,
            link_id=message_data.link_id,
            link_url=message_data.link_url,
            user_id=message_data.user_id,
            merchant_id=message_data.merchant_id,
            is_read=False
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        return 1


async def update_message(db: Session, message_id: int, message_data: MessageUpdate) -> Message:
    """更新消息（已读状态）"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="消息不存在")
    
    # 更新已读状态
    if message_data.is_read is not None:
        message.is_read = message_data.is_read
        
        if message_data.is_read:
            message.read_time = datetime.now()
    
    db.commit()
    db.refresh(message)
    
    return message


async def mark_message_read(db: Session, message_id: int, user_id: Optional[int] = None, merchant_id: Optional[int] = None) -> Message:
    """标记消息为已读"""
    query = db.query(Message).filter(Message.id == message_id)
    
    if user_id is not None:
        query = query.filter(Message.user_id == user_id)
    
    if merchant_id is not None:
        query = query.filter(Message.merchant_id == merchant_id)
    
    message = query.first()
    if not message:
        raise HTTPException(status_code=404, detail="消息不存在")
    
    # 标记为已读
    message.is_read = True
    message.read_time = datetime.now()
    
    db.commit()
    db.refresh(message)
    
    return message


async def mark_all_messages_read(db: Session, user_id: Optional[int] = None, merchant_id: Optional[int] = None, message_type: Optional[str] = None) -> int:
    """标记所有消息为已读"""
    query = db.query(Message).filter(Message.is_read == False)
    
    if user_id is not None:
        query = query.filter(Message.user_id == user_id)
    
    if merchant_id is not None:
        query = query.filter(Message.merchant_id == merchant_id)
    
    if message_type:
        query = query.filter(Message.type == message_type)
    
    messages = query.all()
    now = datetime.now()
    
    for message in messages:
        message.is_read = True
        message.read_time = now
    
    db.commit()
    
    return len(messages)


async def get_message(db: Session, message_id: int, user_id: Optional[int] = None, merchant_id: Optional[int] = None) -> Message:
    """获取消息详情"""
    query = db.query(Message).filter(Message.id == message_id)
    
    if user_id is not None:
        query = query.filter(Message.user_id == user_id)
    
    if merchant_id is not None:
        query = query.filter(Message.merchant_id == merchant_id)
    
    message = query.first()
    if not message:
        raise HTTPException(status_code=404, detail="消息不存在")
    
    return message


async def search_messages(
    db: Session,
    user_id: Optional[int] = None,
    merchant_id: Optional[int] = None,
    message_type: Optional[str] = None,
    is_read: Optional[bool] = None,
    keyword: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[Message], int]:
    """搜索消息列表"""
    query = db.query(Message)
    
    # 筛选条件
    if user_id is not None:
        query = query.filter(Message.user_id == user_id)
    
    if merchant_id is not None:
        query = query.filter(Message.merchant_id == merchant_id)
    
    if message_type:
        query = query.filter(Message.type == message_type)
    
    if is_read is not None:
        query = query.filter(Message.is_read == is_read)
    
    if keyword:
        query = query.filter(
            (Message.title.ilike(f"%{keyword}%")) |
            (Message.content.ilike(f"%{keyword}%"))
        )
    
    # 查询总数
    total = query.count()
    
    # 排序
    if sort_by:
        direction = desc if sort_order == "desc" else asc
        if sort_by == "created_at":
            query = query.order_by(direction(Message.created_at))
        elif sort_by == "read_time":
            query = query.order_by(direction(Message.read_time))
    else:
        # 默认按创建时间倒序
        query = query.order_by(Message.created_at.desc())
    
    # 分页
    messages = query.offset(skip).limit(limit).all()
    
    return messages, total


async def count_messages(
    db: Session,
    user_id: Optional[int] = None,
    merchant_id: Optional[int] = None
) -> Dict:
    """统计消息数量"""
    # 基础查询
    base_query = db.query(Message)
    
    if user_id is not None:
        base_query = base_query.filter(Message.user_id == user_id)
    
    if merchant_id is not None:
        base_query = base_query.filter(Message.merchant_id == merchant_id)
    
    # 总消息数
    total = base_query.count()
    
    # 未读消息数
    unread = base_query.filter(Message.is_read == False).count()
    
    # 按类型统计
    type_counts = {}
    for message_type in MessageType:
        count = base_query.filter(Message.type == message_type).count()
        type_counts[message_type.value] = count
    
    return {
        "total": total,
        "unread": unread,
        "types": type_counts
    }


async def delete_message(
    db: Session,
    message_id: int,
    user_id: Optional[int] = None,
    merchant_id: Optional[int] = None
) -> bool:
    """删除消息"""
    query = db.query(Message).filter(Message.id == message_id)
    
    if user_id is not None:
        query = query.filter(Message.user_id == user_id)
    
    if merchant_id is not None:
        query = query.filter(Message.merchant_id == merchant_id)
    
    message = query.first()
    if not message:
        raise HTTPException(status_code=404, detail="消息不存在")
    
    db.delete(message)
    db.commit()
    
    return True


async def create_order_message(
    db: Session,
    order_id: int,
    message_type: str,
    title: str,
    content: str
) -> Tuple[Message, Message]:
    """创建订单相关消息（用户和商户）"""
    # 获取订单信息
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    # 创建用户消息
    user_message = Message(
        title=title,
        content=content,
        type=message_type,
        link_type="order",
        link_id=order_id,
        user_id=order.user_id,
        is_read=False
    )
    
    # 创建商户消息
    merchant_message = Message(
        title=title,
        content=content,
        type=message_type,
        link_type="order",
        link_id=order_id,
        merchant_id=order.merchant_id,
        is_read=False
    )
    
    db.add(user_message)
    db.add(merchant_message)
    db.commit()
    
    db.refresh(user_message)
    db.refresh(merchant_message)
    
    return user_message, merchant_message


async def create_group_message(
    db: Session,
    group_id: int,
    message_type: str,
    title: str,
    content: str
) -> List[Message]:
    """创建团购相关消息（所有参与者）"""
    # 获取团购信息
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="团购不存在")
    
    # 获取所有参与者
    participants = db.query(GroupParticipant).filter(
        GroupParticipant.group_id == group_id,
        GroupParticipant.status != 0  # 非取消状态
    ).all()
    
    messages = []
    
    # 创建商户消息
    merchant_message = Message(
        title=title,
        content=content,
        type=message_type,
        link_type="group",
        link_id=group_id,
        merchant_id=group.merchant_id,
        is_read=False
    )
    
    db.add(merchant_message)
    messages.append(merchant_message)
    
    # 为每个参与者创建消息
    for participant in participants:
        user_message = Message(
            title=title,
            content=content,
            type=message_type,
            link_type="group",
            link_id=group_id,
            user_id=participant.user_id,
            is_read=False
        )
        
        db.add(user_message)
        messages.append(user_message)
    
    db.commit()
    
    for message in messages:
        db.refresh(message)
    
    return messages