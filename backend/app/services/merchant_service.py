# backend/app/services/merchant_service.py

from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import math

from fastapi import HTTPException, status
from sqlalchemy import func, desc, asc, and_, or_
from sqlalchemy.orm import Session, joinedload

from app.models.merchant import Merchant, MerchantCategory
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.schemas.merchant import (
    MerchantCreate, MerchantUpdate, CategoryCreate, CategoryUpdate
)
from app.core.utils import calculate_distance
from app.crud import crud_merchant, crud_category


def safe_convert_merchant_to_dict(merchant: Merchant, db: Session = None, latitude: Optional[float] = None, longitude: Optional[float] = None) -> Dict:
    """安全地将Merchant ORM对象转换为字典"""
    
    def safe_int(value, default=0):
        try:
            return int(value) if value is not None else default
        except (ValueError, TypeError):
            return default
    
    def safe_float(value, default=0.0):
        try:
            return float(value) if value is not None else default
        except (ValueError, TypeError):
            return default
    
    def safe_str(value, default=""):
        return str(value) if value is not None else default
    
    def safe_bool(value, default=False):
        try:
            return bool(value) if value is not None else default
        except (ValueError, TypeError):
            return default
    
    def safe_datetime(value):
        if isinstance(value, datetime):
            return value
        return None

    try:
        # 获取商户分类
        categories_data = []
        try:
            if db:
                categories = db.query(Category).join(
                    MerchantCategory,
                    MerchantCategory.category_id == Category.id
                ).filter(
                    MerchantCategory.merchant_id == merchant.id
                ).all()
                
                for category in categories:
                    categories_data.append({
                        "id": category.id,
                        "name": safe_str(category.name),
                        "icon": safe_str(category.icon),
                        "sort_order": safe_int(category.sort_order),
                        "is_active": safe_bool(category.is_active, True),
                        "created_at": safe_datetime(category.created_at),
                        "updated_at": safe_datetime(category.updated_at)
                    })
        except Exception as e:
            print(f"获取商户分类失败: {e}")
            categories_data = []
        
        # 计算商户产品数量
        product_count = 0
        try:
            if db:
                product_count = db.query(func.count(Product.id)).filter(
                    Product.merchant_id == merchant.id,
                    Product.status == 1  # 只统计上架商品
                ).scalar() or 0
        except Exception as e:
            print(f"统计商品数量失败: {e}")
            product_count = 0
        
        # 计算距离
        distance = None
        try:
            if latitude and longitude and merchant.latitude and merchant.longitude:
                distance = calculate_distance(
                    latitude, longitude, merchant.latitude, merchant.longitude
                )
        except Exception as e:
            print(f"计算距离失败: {e}")
            distance = None
        
        # 构建商户字典数据
        merchant_data = {
            "id": safe_int(merchant.id),
            "name": safe_str(merchant.name),
            "logo": safe_str(merchant.logo),
            "cover": safe_str(merchant.cover),
            "description": safe_str(merchant.description),
            "license_number": safe_str(merchant.license_number),
            "license_image": safe_str(merchant.license_image),
            "contact_name": safe_str(merchant.contact_name),
            "contact_phone": safe_str(merchant.contact_phone),
            "province": safe_str(merchant.province),
            "city": safe_str(merchant.city),
            "district": safe_str(merchant.district),
            "address": safe_str(merchant.address),
            "latitude": safe_float(merchant.latitude),
            "longitude": safe_float(merchant.longitude),
            "service_radius": safe_float(merchant.service_radius, 5.0),
            "north_boundary": safe_float(merchant.north_boundary) if merchant.north_boundary else None,
            "south_boundary": safe_float(merchant.south_boundary) if merchant.south_boundary else None,
            "east_boundary": safe_float(merchant.east_boundary) if merchant.east_boundary else None,
            "west_boundary": safe_float(merchant.west_boundary) if merchant.west_boundary else None,
            "business_hours": safe_str(merchant.business_hours),
            "status": safe_int(merchant.status, 0),
            "rating": safe_float(merchant.rating, 5.0),
            "commission_rate": safe_float(merchant.commission_rate, 0.05),
            "balance": safe_float(merchant.balance, 0.0),
            "categories": categories_data,
            "product_count": safe_int(product_count),
            "distance": safe_float(distance) if distance is not None else None,
            "created_at": safe_datetime(merchant.created_at),
            "updated_at": safe_datetime(merchant.updated_at)
        }
        
        return merchant_data
        
    except Exception as e:
        print(f"转换商户ORM对象失败: {e}")
        # 返回一个最基本的字典，避免序列化错误
        return {
            "id": getattr(merchant, 'id', 0),
            "name": getattr(merchant, 'name', '未知商户'),
            "logo": getattr(merchant, 'logo', ''),
            "cover": getattr(merchant, 'cover', ''),
            "description": getattr(merchant, 'description', ''),
            "license_number": getattr(merchant, 'license_number', ''),
            "license_image": getattr(merchant, 'license_image', ''),
            "contact_name": getattr(merchant, 'contact_name', ''),
            "contact_phone": getattr(merchant, 'contact_phone', ''),
            "province": getattr(merchant, 'province', ''),
            "city": getattr(merchant, 'city', ''),
            "district": getattr(merchant, 'district', ''),
            "address": getattr(merchant, 'address', ''),
            "latitude": None,
            "longitude": None,
            "service_radius": 5.0,
            "north_boundary": None,
            "south_boundary": None,
            "east_boundary": None,
            "west_boundary": None,
            "business_hours": '',
            "status": 0,
            "rating": 5.0,
            "commission_rate": 0.05,
            "balance": 0.0,
            "categories": [],
            "product_count": 0,
            "distance": None,
            "created_at": None,
            "updated_at": None
        }


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
    
    print(f"🔍 开始商户搜索，参数: keyword={keyword}, category_id={category_id}")
    
    try:
        query = db.query(Merchant)
        
        # 筛选条件
        if keyword:
            query = query.filter(
                or_(
                    Merchant.name.ilike(f"%{keyword}%"),
                    Merchant.description.ilike(f"%{keyword}%"),
                    Merchant.address.ilike(f"%{keyword}%")
                )
            )
        
        if category_id:
            query = query.join(
                MerchantCategory,
                Merchant.id == MerchantCategory.merchant_id
            ).filter(MerchantCategory.category_id == category_id)
        
        if status is not None:
            query = query.filter(Merchant.status == status)
        else:
            # 默认只显示正常状态的商户
            query = query.filter(Merchant.status == 1)
        
        # 查询总数
        total = query.count()
        print(f"📊 符合条件的商户总数: {total}")
        
        # 排序
        if sort_by:
            direction = desc if sort_order == "desc" else asc
            if sort_by == "rating":
                query = query.order_by(direction(Merchant.rating))
            elif sort_by == "created_at":
                query = query.order_by(direction(Merchant.created_at))
            elif sort_by == "distance" and latitude and longitude:
                # 距离排序需要特殊处理
                pass
        else:
            # 默认按评分和创建时间排序
            query = query.order_by(Merchant.rating.desc(), Merchant.created_at.desc())
        
        # 分页
        merchants = query.offset(skip).limit(limit).all()
        print(f"📦 获取到 {len(merchants)} 个商户ORM对象")
        
        # 转换为字典列表
        result = []
        for i, merchant in enumerate(merchants):
            try:
                print(f"🔄 正在转换第 {i+1} 个商户: ID={getattr(merchant, 'id', 'unknown')}")
                
                merchant_dict = safe_convert_merchant_to_dict(
                    merchant, db, latitude, longitude
                )
                result.append(merchant_dict)
                
                print(f"✅ 商户 {merchant_dict['id']} 转换成功")
                
            except Exception as e:
                print(f"❌ 转换商户 {getattr(merchant, 'id', 'unknown')} 失败: {e}")
                continue
        
        # 如果指定了距离筛选，过滤结果
        if distance is not None and latitude and longitude:
            filtered_result = [
                m for m in result 
                if m['distance'] is not None and m['distance'] <= distance
            ]
            result = filtered_result
            total = len(result)
            
            # 按距离排序
            if sort_by == "distance":
                result.sort(
                    key=lambda x: x['distance'] if x['distance'] is not None else float('inf'),
                    reverse=(sort_order == "desc")
                )
        
        print(f"🎉 成功转换 {len(result)} 个商户为字典格式")
        
        return result, total
        
    except Exception as e:
        print(f"❌ 商户搜索异常: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return [], 0


async def get_merchant_detail(db: Session, merchant_id: int) -> Dict:
    """获取商户详情"""
    try:
        merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        
        if not merchant:
            raise HTTPException(status_code=404, detail="商户不存在")
        
        print(f"🔍 获取商户详情: ID={merchant_id}")
        
        # 使用统一的转换函数
        merchant_data = safe_convert_merchant_to_dict(merchant, db)
        
        print(f"✅ 商户详情获取成功: {merchant_data['name']}")
        return merchant_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 获取商户详情异常: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="获取商户详情时发生系统错误")


async def create_merchant(db: Session, merchant_data: MerchantCreate, user_id: int) -> Dict:
    """创建商户"""
    try:
        # 检查用户是否已有商户
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        if user.merchant_id:
            raise HTTPException(status_code=400, detail="用户已关联商户")
        
        # 创建商户
        merchant_dict = merchant_data.dict(exclude={"category_ids"})
        merchant = crud_merchant.create(db, obj_in=merchant_dict, user_id=user_id)
        
        # 关联分类
        for category_id in merchant_data.category_ids:
            category = db.query(Category).filter(Category.id == category_id).first()
            if category:
                merchant_category = MerchantCategory(
                    merchant_id=merchant.id,
                    category_id=category_id
                )
                db.add(merchant_category)
        
        # 更新用户的merchant_id
        user.merchant_id = merchant.id
        
        db.commit()
        db.refresh(merchant)
        
        # 返回字典格式
        return safe_convert_merchant_to_dict(merchant, db)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 创建商户异常: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"创建商户失败: {str(e)}")


async def update_merchant(
    db: Session, 
    merchant_id: int, 
    merchant_data: MerchantUpdate,
    user_id: Optional[int] = None
) -> Dict:
    """更新商户信息"""
    try:
        # 获取商户
        merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        if not merchant:
            raise HTTPException(status_code=404, detail="商户不存在")
        
        print(f"🔄 更新商户信息: ID={merchant_id}")
        
        # 更新基本信息
        update_data = merchant_data.dict(exclude_unset=True, exclude={"category_ids"})
        
        # 计算服务区域边界
        if any(key in update_data for key in ["latitude", "longitude", "service_radius"]):
            latitude = update_data.get("latitude", merchant.latitude)
            longitude = update_data.get("longitude", merchant.longitude)
            radius = update_data.get("service_radius", merchant.service_radius)
            
            if latitude and longitude and radius:
                try:
                    # 计算边界坐标
                    lat_rad = latitude * math.pi / 180
                    km_per_lng_degree = 111.32 * math.cos(lat_rad)
                    km_per_lat_degree = 111.32
                    
                    update_data.update({
                        "north_boundary": latitude + (radius / km_per_lat_degree),
                        "south_boundary": latitude - (radius / km_per_lat_degree),
                        "east_boundary": longitude + (radius / km_per_lng_degree),
                        "west_boundary": longitude - (radius / km_per_lng_degree)
                    })
                    
                    print(f"✅ 计算服务区域边界成功，半径: {radius}km")
                except Exception as e:
                    print(f"❌ 计算服务区域边界失败: {e}")
        
        # 更新商户基本信息
        updated_merchant = crud_merchant.update(db, db_obj=merchant, obj_in=update_data)
        
        # 更新分类关联
        if merchant_data.category_ids is not None:
            # 删除现有关联
            db.query(MerchantCategory).filter(
                MerchantCategory.merchant_id == merchant_id
            ).delete()
            
            # 添加新关联
            for category_id in merchant_data.category_ids:
                category = db.query(Category).filter(Category.id == category_id).first()
                if category:
                    merchant_category = MerchantCategory(
                        merchant_id=merchant_id,
                        category_id=category_id
                    )
                    db.add(merchant_category)
        
        db.commit()
        db.refresh(updated_merchant)
        
        # 返回字典格式
        return safe_convert_merchant_to_dict(updated_merchant, db)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 更新商户异常: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"更新商户失败: {str(e)}")


async def get_categories(db: Session, is_active: Optional[bool] = None) -> List[Dict]:
    """获取所有分类"""
    try:
        categories = crud_category.get_multi(db, is_active=is_active)
        
        result = []
        for category in categories:
            result.append({
                "id": category.id,
                "name": category.name or "",
                "icon": category.icon or "",
                "sort_order": category.sort_order or 0,
                "is_active": category.is_active if category.is_active is not None else True,
                "created_at": category.created_at,
                "updated_at": category.updated_at
            })
        
        return result
        
    except Exception as e:
        print(f"❌ 获取分类列表异常: {str(e)}")
        return []


async def create_category(db: Session, category_data: CategoryCreate) -> Dict:
    """创建分类"""
    try:
        # 检查分类名称是否已存在
        existing_category = crud_category.get_by_name(db, name=category_data.name)
        if existing_category:
            raise HTTPException(status_code=400, detail="分类名称已存在")
        
        category = crud_category.create(db, obj_in=category_data)
        
        return {
            "id": category.id,
            "name": category.name or "",
            "icon": category.icon or "",
            "sort_order": category.sort_order or 0,
            "is_active": category.is_active if category.is_active is not None else True,
            "created_at": category.created_at,
            "updated_at": category.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 创建分类异常: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"创建分类失败: {str(e)}")


async def update_category(db: Session, category_id: int, category_data: CategoryUpdate) -> Dict:
    """更新分类"""
    try:
        category = crud_category.get(db, id=category_id)
        if not category:
            raise HTTPException(status_code=404, detail="分类不存在")
        
        # 检查分类名称是否已被其他分类使用
        if category_data.name:
            existing_category = crud_category.get_by_name(db, name=category_data.name)
            if existing_category and existing_category.id != category_id:
                raise HTTPException(status_code=400, detail="分类名称已存在")
        
        updated_category = crud_category.update(db, db_obj=category, obj_in=category_data)
        
        return {
            "id": updated_category.id,
            "name": updated_category.name or "",
            "icon": updated_category.icon or "",
            "sort_order": updated_category.sort_order or 0,
            "is_active": updated_category.is_active if updated_category.is_active is not None else True,
            "created_at": updated_category.created_at,
            "updated_at": updated_category.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 更新分类异常: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"更新分类失败: {str(e)}")


async def delete_category(db: Session, category_id: int) -> bool:
    """删除分类"""
    try:
        category = crud_category.get(db, id=category_id)
        if not category:
            raise HTTPException(status_code=404, detail="分类不存在")
        
        # 检查是否有商户使用该分类
        merchant_count = db.query(func.count(MerchantCategory.id)).filter(
            MerchantCategory.category_id == category_id
        ).scalar() or 0
        
        if merchant_count > 0:
            raise HTTPException(status_code=400, detail=f"该分类被 {merchant_count} 个商户使用，无法删除")
        
        # 检查是否有商品使用该分类
        from app.models.category import product_categories
        product_count = db.query(func.count(product_categories.c.product_id)).filter(
            product_categories.c.category_id == category_id
        ).scalar() or 0
        
        if product_count > 0:
            raise HTTPException(status_code=400, detail=f"该分类被 {product_count} 个商品使用，无法删除")
        
        # 删除分类
        result = crud_category.delete(db, id=category_id)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 删除分类异常: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"删除分类失败: {str(e)}")