from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.constants import CACHE_EXPIRE_TIME, CACHE_KEY_PREFIX
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.redis import RedisClient
from app.crud import crud_user, crud_address
from app.models.user import User, Address, Favorite
from app.models.order import Order
from app.models.review import Review
from app.models.product import Product
from app.schemas.user import UserCreate, UserUpdate, UserAddressCreate, UserAddressUpdate, UserRegister, MerchantRegister
from app.schemas.token import Token
from app.schemas.wechat import WxLoginInfo
from app.services import wechat_service


async def authenticate_user(db: Session, open_id: str) -> Optional[User]:
    """通过微信OpenID认证用户"""
    user = crud_user.get_by_open_id(db, open_id=open_id)
    if not user:
        return None
    if not user.is_active:
        raise HTTPException(status_code=400, detail="用户已被禁用")
    return user


async def authenticate_by_phone(db: Session, phone: str, password: str) -> Optional[User]:
    """通过手机号和密码认证用户"""
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        return None
    if not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        raise HTTPException(status_code=400, detail="用户已被禁用")
    
    # 更新最后登录时间
    user.last_login_at = datetime.now()
    db.commit()
    db.refresh(user)
    
    return user


async def code2session(code: str) -> Dict:
    """微信登录，获取用户openid和session_key"""
    try:
        result = await wechat_service.code2session(code)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"微信登录失败: {str(e)}")


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


async def create_user_with_password(db: Session, user_data: UserRegister) -> User:
    """创建带密码的用户账号"""
    # 检查手机号是否已存在
    existing_user = db.query(User).filter(User.phone == user_data.phone).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="手机号已被注册")
    
    # 创建新用户
    hashed_password = get_password_hash(user_data.password)
    user = User(
        phone=user_data.phone,
        hashed_password=hashed_password,
        nickname=user_data.nickname,
        avatar_url=user_data.avatar_url,
        gender=user_data.gender,
        is_active=True,
        is_admin=False
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


async def create_merchant_with_password(db: Session, merchant_data: MerchantRegister) -> Tuple[User, int]:
    """创建商户账号"""
    # 检查手机号是否已存在
    existing_user = db.query(User).filter(User.phone == merchant_data.phone).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="手机号已被注册")
    
    # 创建商户记录
    from app.models.merchant import Merchant
    merchant = Merchant(
    name=merchant_data.merchant_name,
    contact_name=merchant_data.contact_name,
    contact_phone=merchant_data.contact_phone,
    license_image=merchant_data.license_image,   # 正确的字段映射
    status=0,
)
    db.add(merchant)
    db.flush()  # 获取商户ID
    
    # 创建用户记录
    hashed_password = get_password_hash(merchant_data.password)
    user = User(
        phone=merchant_data.phone,
        hashed_password=hashed_password,
        nickname=merchant_data.nickname,
        avatar_url=merchant_data.avatar_url,
        gender=merchant_data.gender,
        is_active=True,
        is_admin=False,
        merchant_id=merchant.id
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user, merchant.id


async def reset_password(
    db: Session, 
    reset_data: dict, 
    user_id: Optional[int] = None
) -> bool:
    """重置密码"""
    # 如果提供了用户ID，则使用ID查询
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 验证旧密码
        if reset_data.old_password and not verify_password(reset_data.old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="旧密码不正确")
    else:
        # 通过手机号查询用户
        user = db.query(User).filter(User.phone == reset_data.phone).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
    
    # 更新密码
    user.hashed_password = get_password_hash(reset_data.new_password)
    db.commit()
    
    return True


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
    result = crud_address.delete(db, id=address_id)
    
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


async def bind_phone(db: Session, user_id: int, phone: str) -> User:
    """绑定手机号"""
    # 检查手机号是否已被使用
    existing_user = db.query(User).filter(User.phone == phone).first()
    if existing_user and existing_user.id != user_id:
        raise HTTPException(status_code=400, detail="手机号已被其他账号使用")
    
    # 更新用户手机号
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    user.phone = phone
    db.commit()
    db.refresh(user)
    
    # 更新缓存
    cache_key = f"{CACHE_KEY_PREFIX['user']}{user_id}"
    RedisClient.delete(cache_key)
    
    return user


async def unbind_phone(db: Session, user_id: int) -> User:
    """解绑手机号"""
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 检查是否有微信绑定，如果没有微信不允许解绑手机号
    if not user.open_id:
        raise HTTPException(status_code=400, detail="必须绑定微信才能解绑手机号")
    
    user.phone = None
    db.commit()
    db.refresh(user)
    
    # 更新缓存
    cache_key = f"{CACHE_KEY_PREFIX['user']}{user_id}"
    RedisClient.delete(cache_key)
    
    return user