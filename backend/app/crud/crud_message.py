# app/crud/crud_message.py
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.message import Message
from app.schemas.message import MessageCreate, MessageUpdate

class CRUDMessage:
    def get(self, db: Session, id: int) -> Optional[Message]:
        return db.query(Message).filter(Message.id == id).first()
    
    def get_user_message(self, db: Session, *, message_id: int, user_id: int) -> Optional[Message]:
        return db.query(Message).filter(
            Message.id == message_id,
            Message.user_id == user_id
        ).first()
    
    def get_merchant_message(self, db: Session, *, message_id: int, merchant_id: int) -> Optional[Message]:
        return db.query(Message).filter(
            Message.id == message_id,
            Message.merchant_id == merchant_id
        ).first()
    
    def create(self, db: Session, *, obj_in: MessageCreate) -> Message:
        db_obj = Message(
            title=obj_in.title,
            content=obj_in.content,
            type=obj_in.type,
            link_type=obj_in.link_type,
            link_id=obj_in.link_id,
            link_url=obj_in.link_url,
            user_id=obj_in.user_id,
            merchant_id=obj_in.merchant_id,
            is_read=False
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(self, db: Session, *, db_obj: Message, obj_in: MessageUpdate) -> Message:
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, *, id: int) -> bool:
        obj = db.query(Message).filter(Message.id == id).first()
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True
    
    def search(
        self,
        db: Session,
        *,
        user_id: Optional[int] = None,
        merchant_id: Optional[int] = None,
        message_type: Optional[str] = None,
        is_read: Optional[bool] = None,
        keyword: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Message], int]:
        query = db.query(Message)
        
        # 用户或商户筛选
        if user_id:
            query = query.filter(Message.user_id == user_id)
        elif merchant_id:
            query = query.filter(Message.merchant_id == merchant_id)
        
        # 类型筛选
        if message_type:
            query = query.filter(Message.type == message_type)
        
        # 已读状态筛选
        if is_read is not None:
            query = query.filter(Message.is_read == is_read)
        
        # 关键词搜索
        if keyword:
            query = query.filter(
                or_(
                    Message.title.ilike(f"%{keyword}%"),
                    Message.content.ilike(f"%{keyword}%")
                )
            )
        
        # 按创建时间降序排序
        query = query.order_by(Message.created_at.desc())
        
        # 计算总数
        total = query.count()
        
        # 分页
        messages = query.offset(skip).limit(limit).all()
        
        return messages, total
    
    def mark_as_read(self, db: Session, *, message_id: int) -> Message:
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            return None
        
        message.is_read = True
        message.read_time = func.now()
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
    
    def mark_all_as_read(
        self,
        db: Session,
        *,
        user_id: Optional[int] = None,
        merchant_id: Optional[int] = None,
        message_type: Optional[str] = None
    ) -> int:
        query = db.query(Message).filter(Message.is_read == False)
        
        # 构建筛选条件
        conditions = []
        if user_id:
            conditions.append(Message.user_id == user_id)
        if merchant_id:
            conditions.append(Message.merchant_id == merchant_id)
        if message_type:
            conditions.append(Message.type == message_type)
        
        if conditions:
            query = query.filter(and_(*conditions))
        
        # 更新消息
        result = query.update(
            {
                "is_read": True,
                "read_time": func.now()
            },
            synchronize_session=False
        )
        
        db.commit()
        return result
    
    def count_unread(
        self,
        db: Session,
        *,
        user_id: Optional[int] = None,
        merchant_id: Optional[int] = None
    ) -> Dict[str, int]:
        # 基础查询
        if user_id:
            base_query = db.query(Message).filter(Message.user_id == user_id)
        elif merchant_id:
            base_query = db.query(Message).filter(Message.merchant_id == merchant_id)
        else:
            return {"total": 0, "unread": 0}
        
        # 计算总数
        total = base_query.count()
        
        # 计算未读数
        unread = base_query.filter(Message.is_read == False).count()
        
        # 计算各类型未读数
        types = {}
        for message_type in ["system", "order", "group", "merchant", "payment", "activity"]:
            type_count = base_query.filter(
                Message.type == message_type,
                Message.is_read == False
            ).count()
            types[message_type] = type_count
        
        return {
            "total": total,
            "unread": unread,
            "types": types
        }

# 实例
message = CRUDMessage()