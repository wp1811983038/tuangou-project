from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.constants import CACHE_EXPIRE_TIME, CACHE_KEY_PREFIX
from app.core.security import create_access_token, verify_password
from app.core.redis import RedisClient
from app.crud import crud_user, crud_address
from app.models.user import User, Address
from app.schemas.user import UserCreate, UserUpdate, UserAddressCreate, UserAddressUpdate
from app.schemas.token import Token


async def authenticate_user(db: Session, open_id: str) -> Optional[User]:
    """通过微信OpenID认证用户"""
    user = crud_user.get_by_open_id(db, open_id=open_id)
    if not user:
        return None
    if not user.is_active:
        raise HTTPException(status_code=400, detail="用户已被禁用")
    return user


async def login_or_create_user(
    db: Session, 
    open_id: str, 
    union_id: Optional[str] = None,
    user_info: Optional[Dict] = None
) -> Tuple[User, bool, Token]:
    """微信用户登录或注册"""
    user = crud_user.get_by_open_id(db, open_id=open_id)
    is_new_user = False
    
    if not user:
        # 创建新用户
        user_data = UserCreate(
            open_id=open_id,
            union_id=union_id,
            nickname=user_info.get("nickName") if user_info else None,
            avatar_url=user_info.get("avatarUrl") if user_info else None,
            gender=user_info.get("gender") if user_info else 0
        )
        user = crud_user.create(db, obj_in=user_data)
        is_new_user = True
    elif user_info and (not user.nickname or not user.avatar_url):
        # 更新用户信息
        user_update = UserUpdate(
            nickname=user_info.get("nickName"),
            avatar_url=user_info.get("avatarUrl"),
            gender=user_info.get("gender", 0)
        )
        user = crud_user.update(db, db_obj=user, obj_in=user_update)
    
    # 更新最后登录时间
    user.last_login_at = datetime.now()
    db.commit()
    db.refresh(user)
    
    # 生成令牌
    access_token_expires = timedelta(minutes=60 * 24 * 7)  # 7天
    token = Token(
        access_token=create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        ),
        token_type="bearer",
        expires_in=60 * 60 * 24 * 7  # 7天(秒)
    )
    
    # 缓存用户信息
    cache_key = f"{CACHE_KEY_PREFIX['user']}{user.id}"
    RedisClient.set(cache_key, {
        "id": user.id,
        "open_id": user.open_id,
        "nickname": user.nickname,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "merchant_id": user.merchant_id
    }, CACHE_EXPIRE_TIME["user"])
    
    return user, is_new_user, token


async def get_user_profile(db: Session, user_id: int) -> Dict:
    """获取用户详细资料"""
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 统计订单数量
    order_count = db.query(func.count("*")).select_from(Order).filter(Order.user_id == user_id).scalar() or 0
    
    # 统计评价数量
    review_count = db.query(func.count("*")).select_from(Review).filter(Review.user_id == user_id).scalar() or 0
    
    # 统计收藏数量
    favorite_count = db.query(func.count("*")).select_from(Favorite).filter(Favorite.user_id == user_id).scalar() or 0
    
    return {
        "id": user.id,
        "nickname": user.nickname,
        "avatar_url": user.avatar_url,
        "gender": user.gender,
        "phone": user.phone,
        "is_admin": user.is_admin,
        "has_merchant": bool(user.merchant_id),
        "merchant_id": user.merchant_id,
        "created_at": user.created_at,
        "order_count": order_count,
        "review_count": review_count,
        "favorite_count": favorite_count
    }


async def update_user_profile(db: Session, user_id: int, user_data: UserUpdate) -> User:
    """更新用户资料"""
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    updated_user = crud_user.update(db, db_obj=user, obj_in=user_data)
    
    # 更新缓存
    cache_key = f"{CACHE_KEY_PREFIX['user']}{user_id}"
    RedisClient.delete(cache_key)
    
    return updated_user


async def get_user_addresses(db: Session, user_id: int) -> List[Address]:
    """获取用户地址列表"""
    return crud_address.get_multi_by_user(db, user_id=user_id)


async def get_user_address(db: Session, user_id: int, address_id: int) -> Address:
    """获取用户单个地址"""
    address = crud_address.get(db, id=address_id)
    if not address or address.user_id != user_id:
        raise HTTPException(status_code=404, detail="地址不存在")
    return address


async def create_user_address(db: Session, user_id: int, address_data: UserAddressCreate) -> Address:
    """创建用户地址"""
    # 检查是否设置为默认地址
    if address_data.is_default:
        # 将其他默认地址取消默认
        db.query(Address).filter(
            Address.user_id == user_id,
            Address.is_default == True
        ).update({"is_default": False})
    
    # 如果是第一个地址，自动设为默认
    address_count = db.query(func.count("*")).select_from(Address).filter(Address.user_id == user_id).scalar() or 0
    if address_count == 0:
        address_data.is_default = True
    
    return crud_address.create(db, obj_in=address_data, user_id=user_id)


async def update_user_address(
    db: Session, 
    user_id: int, 
    address_id: int, 
    address_data: UserAddressUpdate
) -> Address:
    """更新用户地址"""
    address = crud_address.get(db, id=address_id)
    if not address or address.user_id != user_id:
        raise HTTPException(status_code=404, detail="地址不存在")
    
    # 检查是否设置为默认地址
    if address_data.is_default:
        # 将其他默认地址取消默认
        db.query(Address).filter(
            Address.user_id == user_id,
            Address.is_default == True,
            Address.id != address_id
        ).update({"is_default": False})
    
    return crud_address.update(db, db_obj=address, obj_in=address_data)


async def delete_user_address(db: Session, user_id: int, address_id: int) -> bool:
    """删除用户地址"""
    address = crud_address.get(db, id=address_id)
    if not address or address.user_id != user_id:
        raise HTTPException(status_code=404, detail="地址不存在")
    
    was_default = address.is_default
    result = crud_address.remove(db, id=address_id)
    
    # 如果删除的是默认地址，设置一个新的默认地址
    if was_default:
        # 查找用户的另一个地址并设为默认
        another_address = db.query(Address).filter(
            Address.user_id == user_id
        ).first()
        if another_address:
            another_address.is_default = True
            db.commit()
    
    return result


async def set_default_address(db: Session, user_id: int, address_id: int) -> Address:
    """设置默认地址"""
    address = crud_address.get(db, id=address_id)
    if not address or address.user_id != user_id:
        raise HTTPException(status_code=404, detail="地址不存在")
    
    # 将其他默认地址取消默认
    db.query(Address).filter(
        Address.user_id == user_id,
        Address.is_default == True
    ).update({"is_default": False})
    
    # 设置当前地址为默认
    address.is_default = True
    db.commit()
    db.refresh(address)
    
    return address


async def toggle_favorite(db: Session, user_id: int, product_id: int) -> bool:
    """收藏或取消收藏商品"""
    from app.models.user import Favorite
    
    # 检查商品是否存在
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    # 检查是否已收藏
    favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == product_id
    ).first()
    
    if favorite:
        # 已收藏，取消收藏
        db.delete(favorite)
        db.commit()
        return False
    else:
        # 未收藏，添加收藏
        new_favorite = Favorite(
            user_id=user_id,
            product_id=product_id
        )
        db.add(new_favorite)
        db.commit()
        return True


async def get_user_favorites(db: Session, user_id: int, skip: int = 0, limit: int = 20) -> List[Dict]:
    """获取用户收藏的商品列表"""
    from app.models.user import Favorite
    from app.models.product import Product
    
    favorites = db.query(
        Favorite, Product
    ).join(
        Product, Favorite.product_id == Product.id
    ).filter(
        Favorite.user_id == user_id
    ).offset(skip).limit(limit).all()
    
    result = []
    for favorite, product in favorites:
        result.append({
            "id": favorite.id,
            "product_id": product.id,
            "name": product.name,
            "thumbnail": product.thumbnail,
            "current_price": product.current_price,
            "original_price": product.original_price,
            "group_price": product.group_price,
            "created_at": favorite.created_at
        })
    
    return result