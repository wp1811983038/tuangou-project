from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any

from fastapi import HTTPException, status
from sqlalchemy import func, desc, asc, and_
from sqlalchemy.orm import Session, joinedload

from app.models.group import Group, GroupParticipant
from app.models.product import Product
from app.models.merchant import Merchant
from app.models.user import User
from app.schemas.group import GroupCreate, GroupUpdate
from app.core.utils import calculate_distance
from backend.app.db.session import SessionLocal
from backend.app.models.order import Order


async def get_group(db: Session, group_id: int, user_id: Optional[int] = None) -> Dict:
    """获取团购详情"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="团购不存在")
    
    # 获取商品
    product = db.query(Product).filter(Product.id == group.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    # 获取商户
    merchant = db.query(Merchant).filter(Merchant.id == group.merchant_id).first()
    
    # 获取参与者
    participants = db.query(GroupParticipant).filter(
        GroupParticipant.group_id == group_id
    ).all()
    
    # 构建参与者信息
    participant_list = []
    for p in participants:
        user = db.query(User).filter(User.id == p.user_id).first()
        if user:
            participant_list.append({
                "id": p.id,
                "user_id": p.user_id,
                "is_leader": p.is_leader,
                "status": p.status,
                "join_time": p.join_time,
                "user": {
                    "id": user.id,
                    "nickname": user.nickname,
                    "avatar_url": user.avatar_url
                }
            })
    
    # 计算剩余时间
    remaining_seconds = 0
    if group.status == 1 and group.end_time > datetime.now():
        remaining_seconds = int((group.end_time - datetime.now()).total_seconds())
    
    # 计算剩余人数
    remaining_count = 0
    if group.status == 1:
        if group.max_participants:
            remaining_count = group.max_participants - group.current_participants
        else:
            remaining_count = 999  # 无上限
    
    # 检查用户是否已参与
    is_joined = False
    if user_id:
        participant = db.query(GroupParticipant).filter(
            GroupParticipant.group_id == group_id,
            GroupParticipant.user_id == user_id,
            GroupParticipant.status != 0  # 非取消状态
        ).first()
        if participant:
            is_joined = True
    
    return {
        "id": group.id,
        "merchant_id": group.merchant_id,
        "product_id": group.product_id,
        "title": group.title,
        "cover_image": group.cover_image,
        "description": group.description,
        "price": group.price,
        "original_price": group.original_price,
        "min_participants": group.min_participants,
        "max_participants": group.max_participants,
        "current_participants": group.current_participants,
        "status": group.status,
        "start_time": group.start_time,
        "end_time": group.end_time,
        "is_featured": group.is_featured,
        "sort_order": group.sort_order,
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "merchant": {
            "id": merchant.id,
            "name": merchant.name,
            "logo": merchant.logo
        } if merchant else None,
        "product": {
            "id": product.id,
            "name": product.name,
            "thumbnail": product.thumbnail,
            "original_price": product.original_price,
            "current_price": product.current_price,
            "description": product.description
        } if product else None,
        "participants": participant_list,
        "remaining_seconds": remaining_seconds,
        "remaining_count": remaining_count,
        "is_joined": is_joined
    }


async def search_groups(
    db: Session,
    keyword: Optional[str] = None,
    merchant_id: Optional[int] = None,
    product_id: Optional[int] = None,
    status: Optional[int] = None,
    is_featured: Optional[bool] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    distance: Optional[float] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[Dict], int]:
    """搜索团购列表"""
    query = db.query(Group)
    
    # 筛选条件
    if keyword:
        query = query.filter(Group.title.ilike(f"%{keyword}%"))
    
    if merchant_id:
        query = query.filter(Group.merchant_id == merchant_id)
    
    if product_id:
        query = query.filter(Group.product_id == product_id)
    
    if status is not None:
        query = query.filter(Group.status == status)
    else:
        # 默认只显示进行中的团购
        query = query.filter(Group.status == 1)
    
    # 只显示未过期的团购
    query = query.filter(Group.end_time > datetime.now())
    
    if is_featured is not None:
        query = query.filter(Group.is_featured == is_featured)
    
    # 查询总数
    total = query.count()
    
    # 排序
    if sort_by:
        direction = desc if sort_order == "desc" else asc
        if sort_by == "price":
            query = query.order_by(direction(Group.price))
        elif sort_by == "remaining_time":
            # 按剩余时间排序
            query = query.order_by(direction(Group.end_time))
        elif sort_by == "participants":
            query = query.order_by(direction(Group.current_participants))
        elif sort_by == "created_at":
            query = query.order_by(direction(Group.created_at))
    else:
        # 默认按推荐和排序值排序
        query = query.order_by(Group.is_featured.desc(), Group.sort_order.desc())
    
    # 分页
    groups = query.offset(skip).limit(limit).all()
    
    # 处理结果
    result = []
    for group in groups:
        # 获取商品
        product = db.query(Product).filter(Product.id == group.product_id).first()
        
        # 获取商户
        merchant = db.query(Merchant).filter(Merchant.id == group.merchant_id).first()
        
        # 计算剩余时间
        remaining_seconds = 0
        if group.status == 1 and group.end_time > datetime.now():
            remaining_seconds = int((group.end_time - datetime.now()).total_seconds())
        
        # 计算剩余人数
        remaining_count = 0
        if group.status == 1:
            if group.max_participants:
                remaining_count = group.max_participants - group.current_participants
            else:
                remaining_count = 999  # 无上限
        
        # 检查用户是否已参与
        is_joined = False
        if user_id:
            participant = db.query(GroupParticipant).filter(
                GroupParticipant.group_id == group.id,
                GroupParticipant.user_id == user_id,
                GroupParticipant.status != 0  # 非取消状态
            ).first()
            if participant:
                is_joined = True
        
        # 计算商户与用户的距离
        merchant_distance = None
        if latitude and longitude and merchant and merchant.latitude and merchant.longitude:
            merchant_distance = calculate_distance(
                latitude, longitude, merchant.latitude, merchant.longitude
            )
        
        group_data = {
            "id": group.id,
            "merchant_id": group.merchant_id,
            "product_id": group.product_id,
            "title": group.title,
            "cover_image": group.cover_image,
            "description": group.description,
            "price": group.price,
            "original_price": group.original_price,
            "min_participants": group.min_participants,
            "max_participants": group.max_participants,
            "current_participants": group.current_participants,
            "status": group.status,
            "start_time": group.start_time,
            "end_time": group.end_time,
            "is_featured": group.is_featured,
            "created_at": group.created_at,
            "merchant": {
                "id": merchant.id,
                "name": merchant.name,
                "logo": merchant.logo,
                "distance": merchant_distance
            } if merchant else None,
            "product": {
                "id": product.id,
                "name": product.name,
                "thumbnail": product.thumbnail
            } if product else None,
            "remaining_seconds": remaining_seconds,
            "remaining_count": remaining_count,
            "is_joined": is_joined
        }
        
        # 如果指定了距离筛选，只返回在范围内的商户
        if distance is not None and merchant_distance is not None:
            if merchant_distance <= distance:
                result.append(group_data)
        else:
            result.append(group_data)
    
    # 如果应用了距离筛选，重新计算总数
    if distance is not None and latitude and longitude:
        total = len(result)
        
        # 按距离排序
        if sort_by == "distance":
            result.sort(
                key=lambda x: x["merchant"]["distance"] if x["merchant"] and "distance" in x["merchant"] and x["merchant"]["distance"] is not None else float('inf'),
                reverse=(sort_order == "desc")
            )
        
        # 分页
        result = result[skip:skip+limit]
    
    return result, total


async def create_group(
    db: Session, 
    group_data: GroupCreate, 
    merchant_id: int
) -> Group:
    """创建团购"""
    # 检查商品是否存在且属于该商户
    product = db.query(Product).filter(
        Product.id == group_data.product_id,
        Product.merchant_id == merchant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在或无权限")
    
    # 检查商品是否已有进行中的团购
    existing_group = db.query(Group).filter(
        Group.product_id == group_data.product_id,
        Group.status == 1,  # 进行中
        Group.end_time > datetime.now()
    ).first()
    
    if existing_group:
        raise HTTPException(status_code=400, detail="该商品已有进行中的团购")
    
    # 设置开始和结束时间
    start_time = datetime.now()
    end_time = start_time + timedelta(days=group_data.duration_days)
    
    # 如果未提供封面图，使用商品缩略图
    cover_image = group_data.cover_image
    if not cover_image:
        cover_image = product.thumbnail
    
    # 创建团购
    group = Group(
        merchant_id=merchant_id,
        product_id=group_data.product_id,
        title=group_data.title,
        cover_image=cover_image,
        description=group_data.description,
        price=group_data.price,
        original_price=group_data.original_price or product.original_price,
        min_participants=group_data.min_participants,
        max_participants=group_data.max_participants,
        current_participants=0,
        status=1,  # 进行中
        start_time=start_time,
        end_time=end_time,
        is_featured=group_data.is_featured,
        sort_order=0
    )
    
    db.add(group)
    db.commit()
    db.refresh(group)
    
    return group


async def update_group(
    db: Session, 
    group_id: int, 
    group_data: GroupUpdate, 
    merchant_id: int
) -> Group:
    """更新团购"""
    # 检查团购是否存在且属于该商户
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.merchant_id == merchant_id
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="团购不存在或无权限")
    
    # 如果团购已结束或已取消，不允许修改
    if group.status in [2, 3]:  # 已成功或已失败
        raise HTTPException(status_code=400, detail="团购已结束，不能修改")
    
    # 更新团购信息
    if group_data.title is not None:
        group.title = group_data.title
    
    if group_data.cover_image is not None:
        group.cover_image = group_data.cover_image
    
    if group_data.description is not None:
        group.description = group_data.description
    
    if group_data.price is not None:
        group.price = group_data.price
    
    if group_data.min_participants is not None:
        # 最小成团人数不能小于当前参与人数
        if group_data.min_participants < group.current_participants:
            group.min_participants = group_data.min_participants
        else:
            raise HTTPException(status_code=400, detail="最小成团人数不能小于当前参与人数")
    
    if group_data.max_participants is not None:
        # 最大成团人数不能小于当前参与人数
        if group_data.max_participants < group.current_participants:
            raise HTTPException(status_code=400, detail="最大成团人数不能小于当前参与人数")
        group.max_participants = group_data.max_participants
    
    if group_data.end_time is not None:
        # 结束时间不能早于当前时间
        if group_data.end_time < datetime.now():
            raise HTTPException(status_code=400, detail="结束时间不能早于当前时间")
        group.end_time = group_data.end_time
    
    if group_data.is_featured is not None:
        group.is_featured = group_data.is_featured
    
    if group_data.sort_order is not None:
        group.sort_order = group_data.sort_order
    
    if group_data.status is not None:
        # 如果要结束团购
        if group_data.status in [2, 3]:  # 已成功或已失败
            # 检查是否达到最小成团人数
            if group.current_participants >= group.min_participants:
                group.status = 2  # 已成功
            else:
                group.status = 3  # 已失败
        else:
            group.status = group_data.status
    
    db.commit()
    db.refresh(group)
    
    return group


async def join_group(db: Session, group_id: int, user_id: int) -> Dict:
    """参与团购"""
    # 检查团购是否存在
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="团购不存在")
    
    # 检查团购是否已结束
    if group.status != 1:  # 不是进行中
        raise HTTPException(status_code=400, detail="团购已结束或未开始")
    
    # 检查团购是否已过期
    if group.end_time < datetime.now():
        # 更新团购状态
        if group.current_participants >= group.min_participants:
            group.status = 2  # 已成功
        else:
            group.status = 3  # 已失败
        db.commit()
        
        raise HTTPException(status_code=400, detail="团购已过期")
    
    # 检查是否达到最大人数限制
    if group.max_participants and group.current_participants >= group.max_participants:
        raise HTTPException(status_code=400, detail="团购已满员")
    
    # 检查用户是否已参与
    existing_participant = db.query(GroupParticipant).filter(
        GroupParticipant.group_id == group_id,
        GroupParticipant.user_id == user_id,
        GroupParticipant.status != 0  # 非取消状态
    ).first()
    
    if existing_participant:
        raise HTTPException(status_code=400, detail="已参与该团购")
    
    # 判断是否为团长
    is_leader = False
    if group.current_participants == 0:
        is_leader = True
    
    # 创建参与记录
    participant = GroupParticipant(
        group_id=group_id,
        user_id=user_id,
        is_leader=is_leader,
        status=1,  # 已参与
        join_time=datetime.now()
    )
    
    db.add(participant)
    
    # 更新团购参与人数
    group.current_participants += 1
    
    # 如果达到最小成团人数，更新状态
    if group.current_participants >= group.min_participants:
        # 状态保持进行中，直到结束时间到达
        pass
    
    db.commit()
    db.refresh(participant)
    
    return {
        "id": participant.id,
        "group_id": participant.group_id,
        "user_id": participant.user_id,
        "is_leader": participant.is_leader,
        "status": participant.status,
        "join_time": participant.join_time,
        "current_participants": group.current_participants,
        "min_participants": group.min_participants,
        "max_participants": group.max_participants
    }


async def cancel_group_participation(db: Session, group_id: int, user_id: int) -> bool:
    """取消参与团购"""
    # 检查团购是否存在
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="团购不存在")
    
    # 检查团购是否已结束
    if group.status != 1:  # 不是进行中
        raise HTTPException(status_code=400, detail="团购已结束或未开始")
    
    # 检查用户是否已参与
    participant = db.query(GroupParticipant).filter(
        GroupParticipant.group_id == group_id,
        GroupParticipant.user_id == user_id,
        GroupParticipant.status != 0  # 非取消状态
    ).first()
    
    if not participant:
        raise HTTPException(status_code=400, detail="未参与该团购")
    
    # 检查是否已有支付订单
    if participant.status == 2:  # 已支付
        raise HTTPException(status_code=400, detail="已支付的参与不能取消")
    
    # 取消参与
    participant.status = 0  # 已取消
    
    # 更新团购参与人数
    group.current_participants -= 1
    
    # 处理团长情况
    if participant.is_leader:
        # 找新团长
        new_leader = db.query(GroupParticipant).filter(
            GroupParticipant.group_id == group_id,
            GroupParticipant.user_id != user_id,
            GroupParticipant.status != 0  # 非取消状态
        ).first()
        
        if new_leader:
            new_leader.is_leader = True
            participant.is_leader = False
    
    db.commit()
    
    return True


async def get_user_joined_groups(
    db: Session, 
    user_id: int,
    status: Optional[int] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[Dict], int]:
    """获取用户参与的团购列表"""
    query = db.query(GroupParticipant).filter(
        GroupParticipant.user_id == user_id,
        GroupParticipant.status != 0  # 非取消状态
    )
    
    # 查询总数
    total = query.count()
    
    # 分页
    participants = query.order_by(GroupParticipant.join_time.desc()).offset(skip).limit(limit).all()
    
    # 处理结果
    result = []
    for participant in participants:
        group = db.query(Group).filter(Group.id == participant.group_id).first()
        if not group:
            continue
        
        # 如果指定了团购状态筛选
        if status is not None and group.status != status:
            continue
        
        product = db.query(Product).filter(Product.id == group.product_id).first()
        merchant = db.query(Merchant).filter(Merchant.id == group.merchant_id).first()
        
        # 计算剩余时间
        remaining_seconds = 0
        if group.status == 1 and group.end_time > datetime.now():
            remaining_seconds = int((group.end_time - datetime.now()).total_seconds())
        
        result.append({
            "id": group.id,
            "title": group.title,
            "cover_image": group.cover_image,
            "price": group.price,
            "original_price": group.original_price,
            "min_participants": group.min_participants,
            "max_participants": group.max_participants,
            "current_participants": group.current_participants,
            "status": group.status,
            "end_time": group.end_time,
            "merchant": {
                "id": merchant.id,
                "name": merchant.name,
                "logo": merchant.logo
            } if merchant else None,
            "product": {
                "id": product.id,
                "name": product.name,
                "thumbnail": product.thumbnail
            } if product else None,
            "participation": {
                "id": participant.id,
                "is_leader": participant.is_leader,
                "status": participant.status,
                "join_time": participant.join_time
            },
            "remaining_seconds": remaining_seconds
        })
    
    # 如果应用了状态筛选，重新计算总数
    if status is not None:
        total = len(result)
    
    return result, total


async def get_merchant_groups(
    db: Session, 
    merchant_id: int,
    status: Optional[int] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[Dict], int]:
    """获取商户的团购列表"""
    query = db.query(Group).filter(Group.merchant_id == merchant_id)
    
    if status is not None:
        query = query.filter(Group.status == status)
    
    # 查询总数
    total = query.count()
    
    # 排序和分页
    groups = query.order_by(Group.created_at.desc()).offset(skip).limit(limit).all()
    
    # 处理结果
    result = []
    for group in groups:
        product = db.query(Product).filter(Product.id == group.product_id).first()
        
        # 计算剩余时间
        remaining_seconds = 0
        if group.status == 1 and group.end_time > datetime.now():
            remaining_seconds = int((group.end_time - datetime.now()).total_seconds())
        
        # 统计已支付订单数
        order_count = db.query(func.count(Order.id)).filter(
            Order.group_id == group.id,
            Order.status.in_([1, 2, 3])  # 已支付、已发货、已完成
        ).scalar() or 0
        
        result.append({
            "id": group.id,
            "title": group.title,
            "cover_image": group.cover_image,
            "price": group.price,
            "original_price": group.original_price,
            "min_participants": group.min_participants,
            "max_participants": group.max_participants,
            "current_participants": group.current_participants,
            "status": group.status,
            "start_time": group.start_time,
            "end_time": group.end_time,
            "is_featured": group.is_featured,
            "created_at": group.created_at,
            "product": {
                "id": product.id,
                "name": product.name,
                "thumbnail": product.thumbnail
            } if product else None,
            "remaining_seconds": remaining_seconds,
            "order_count": order_count
        })
    
    return result, total


async def check_and_update_expired_groups():
    """检查并更新过期团购状态（定时任务）"""
    with SessionLocal() as db:
        # 查找已过期但状态仍为进行中的团购
        expired_groups = db.query(Group).filter(
            Group.status == 1,  # 进行中
            Group.end_time < datetime.now()
        ).all()
        
        for group in expired_groups:
            # 根据是否达到最小成团人数更新状态
            if group.current_participants >= group.min_participants:
                group.status = 2  # 已成功
            else:
                group.status = 3  # 已失败
        
        db.commit()
        
        return len(expired_groups)