from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from fastapi import HTTPException, status
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session, joinedload

from app.crud import crud_merchant, crud_category
from app.models.merchant import Merchant, MerchantCategory, Category
from app.models.product import Product
from app.schemas.merchant import MerchantCreate, MerchantUpdate, CategoryCreate, CategoryUpdate
from app.core.utils import calculate_distance
from app.models.user import User


async def get_merchant(db: Session, merchant_id: int) -> Merchant:
    """获取单个商户详情"""
    merchant = crud_merchant.get(db, id=merchant_id)
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    return merchant


async def get_merchant_detail(db: Session, merchant_id: int) -> Dict:
    """获取商户详细信息"""
    merchant = db.query(Merchant).options(
        joinedload(Merchant.categories).joinedload(MerchantCategory.category)
    ).filter(Merchant.id == merchant_id).first()
    
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    
    # 获取商品数量
    product_count = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id
    ).scalar() or 0
    
    # 获取分类信息 - 确保包含时间戳字段
    categories = []
    for mc in merchant.categories:
        if mc.category:
            categories.append({
                "id": mc.category.id,
                "name": mc.category.name,
                "icon": mc.category.icon,
                # 添加必要的时间戳字段
                "created_at": mc.category.created_at,
                "updated_at": mc.category.updated_at,
                # 如果还有其他必要字段，也可以在这里添加
                "sort_order": mc.category.sort_order,
                "is_active": mc.category.is_active
            })
    
    return {
        "id": merchant.id,
        "name": merchant.name,
        "logo": merchant.logo,
        "cover": merchant.cover,
        "description": merchant.description,
        "license_number": merchant.license_number,
        "contact_name": merchant.contact_name,
        "contact_phone": merchant.contact_phone,
        "province": merchant.province,
        "city": merchant.city,
        "district": merchant.district,
        "address": merchant.address,
        "latitude": merchant.latitude,
        "longitude": merchant.longitude,
        "business_hours": merchant.business_hours,
        "status": merchant.status,
        "rating": merchant.rating,
        "commission_rate": merchant.commission_rate,
        "balance": merchant.balance,
        "product_count": product_count,
        "categories": categories,
        "created_at": merchant.created_at,
        "updated_at": merchant.updated_at
    }


async def create_merchant(db: Session, merchant_data: MerchantCreate, user_id: int) -> Merchant:
    """创建商户"""
    # 检查用户是否已有商户
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    if user.merchant_id:
        raise HTTPException(status_code=400, detail="用户已关联商户")
    
    # 创建商户
    merchant = crud_merchant.create(db, obj_in=merchant_data)
    
    # 关联分类
    if merchant_data.category_ids:
        for category_id in merchant_data.category_ids:
            category = crud_category.get(db, id=category_id)
            if category:
                merchant_category = MerchantCategory(
                    merchant_id=merchant.id,
                    category_id=category_id
                )
                db.add(merchant_category)
        db.commit()
    
    # 关联用户
    user.merchant_id = merchant.id
    db.commit()
    
    return merchant


async def update_merchant(
    db: Session, 
    merchant_id: int, 
    merchant_data: MerchantUpdate, 
    user_id: int = None,
    is_admin: bool = False  # 添加管理员标志参数
) -> Merchant:
    """更新商户信息"""
    merchant = crud_merchant.get(db, id=merchant_id)
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    
    # 添加管理员检查：如果是管理员调用，则跳过权限检查
    if not is_admin:  # 非管理员才检查权限
        # 检查用户是否有权限更新此商户（只有商户自己可以更新）
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.merchant_id != merchant_id:
            raise HTTPException(status_code=403, detail="没有权限更新其他商户的信息")
    
    # 更新商户基本信息
    updated_merchant = crud_merchant.update(db, db_obj=merchant, obj_in=merchant_data)
    
    # 更新分类关联
    if merchant_data.category_ids is not None:
        # 删除旧的关联
        db.query(MerchantCategory).filter(
            MerchantCategory.merchant_id == merchant_id
        ).delete()
        
        # 添加新的关联
        for category_id in merchant_data.category_ids:
            category = crud_category.get(db, id=category_id)
            if category:
                merchant_category = MerchantCategory(
                    merchant_id=merchant_id,
                    category_id=category_id
                )
                db.add(merchant_category)
        db.commit()
    
    return updated_merchant


async def search_merchants(
    db: Session,
    keyword: Optional[str] = None,
    category_id: Optional[int] = None,
    status: Optional[int] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    distance: Optional[float] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[Dict], int]:
    """搜索商户列表"""
    query = db.query(Merchant)
    
    # 筛选条件
    if keyword:
        query = query.filter(Merchant.name.ilike(f"%{keyword}%"))
    
    if category_id:
        query = query.join(
            MerchantCategory, MerchantCategory.merchant_id == Merchant.id
        ).filter(
            MerchantCategory.category_id == category_id
        )
    
    if status is not None:
        query = query.filter(Merchant.status == status)
    else:
        # 默认只显示正常状态的商户
        query = query.filter(Merchant.status == 1)
    
    # 查询总数
    total = query.count()
    
    # 排序
    if sort_by:
        direction = desc if sort_order == "desc" else asc
        if sort_by == "rating":
            query = query.order_by(direction(Merchant.rating))
        elif sort_by == "created_at":
            query = query.order_by(direction(Merchant.created_at))
        elif sort_by == "product_count":
            # 按商品数量排序
            query = query.outerjoin(
                Product, Product.merchant_id == Merchant.id
            ).group_by(Merchant.id).order_by(
                direction(func.count(Product.id))
            )
    else:
        # 默认按创建时间倒序
        query = query.order_by(Merchant.created_at.desc())
    
    # 分页
    merchants = query.offset(skip).limit(limit).all()
    
    # 处理结果
    result = []
    for merchant in merchants:
        # 获取商品数量
        product_count = db.query(func.count(Product.id)).filter(
            Product.merchant_id == merchant.id
        ).scalar() or 0
        
        # 获取分类
        categories = []
        merchant_categories = db.query(MerchantCategory).filter(
            MerchantCategory.merchant_id == merchant.id
        ).all()
        for mc in merchant_categories:
            category = crud_category.get(db, id=mc.category_id)
            if category:
                categories.append({
                    "id": category.id,
                    "name": category.name,
                    "icon": category.icon
                })
        
        # 计算距离
        merchant_distance = None
        if latitude and longitude and merchant.latitude and merchant.longitude:
            merchant_distance = calculate_distance(
                latitude, longitude, merchant.latitude, merchant.longitude
            )
        
        merchant_data = {
            "id": merchant.id,
            "name": merchant.name,
            "logo": merchant.logo,
            "cover": merchant.cover,
            "description": merchant.description,
            "province": merchant.province,
            "city": merchant.city,
            "district": merchant.district,
            "address": merchant.address,
            "latitude": merchant.latitude,
            "longitude": merchant.longitude,
            "business_hours": merchant.business_hours,
            "status": merchant.status,
            "rating": merchant.rating,
            "product_count": product_count,
            "categories": categories,
            "distance": merchant_distance,
            "created_at": merchant.created_at
        }
        
        # 如果指定了距离筛选，只返回在范围内的商户
        if distance is not None and merchant_distance is not None:
            if merchant_distance <= distance:
                result.append(merchant_data)
        else:
            result.append(merchant_data)
    
    # 如果应用了距离筛选，重新计算总数
    if distance is not None and latitude and longitude:
        total = len(result)
        
        # 按距离排序
        if sort_by == "distance":
            result.sort(
                key=lambda x: x["distance"] if x["distance"] is not None else float('inf'),
                reverse=(sort_order == "desc")
            )
        
        # 分页
        result = result[skip:skip+limit]
    
    return result, total


async def get_categories(db: Session, is_active: Optional[bool] = None) -> List[Category]:
    """获取分类列表"""
    query = db.query(Category)
    
    if is_active is not None:
        query = query.filter(Category.is_active == is_active)
    
    return query.order_by(Category.sort_order).all()


async def create_category(db: Session, category_data: CategoryCreate) -> Category:
    """创建分类"""
    return crud_category.create(db, obj_in=category_data)


async def update_category(db: Session, category_id: int, category_data: CategoryUpdate) -> Category:
    """更新分类"""
    category = crud_category.get(db, id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    
    return crud_category.update(db, db_obj=category, obj_in=category_data)

from app.models.product import product_categories

async def delete_category(db: Session, category_id: int) -> bool:
    """删除分类"""
    category = crud_category.get(db, id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    
    # 检查是否有商户使用此分类
    merchant_count = db.query(func.count(MerchantCategory.id)).filter(
        MerchantCategory.category_id == category_id
    ).scalar() or 0
    
    if merchant_count > 0:
        raise HTTPException(status_code=400, detail="分类已被商户使用，无法删除")
    
    # 检查是否有商品使用此分类 - 修正引用错误
    product_count = db.query(func.count(product_categories.c.category_id)).filter(
        product_categories.c.category_id == category_id
    ).scalar() or 0
    
    if product_count > 0:
        raise HTTPException(status_code=400, detail="分类已被商品使用，无法删除")
    
    return crud_category.remove(db, id=category_id)