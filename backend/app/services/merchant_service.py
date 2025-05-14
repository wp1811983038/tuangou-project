from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from fastapi import HTTPException, status
from sqlalchemy import func, desc, asc, text
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
    # 获取商户信息，包含分类关联
    merchant = db.query(Merchant).options(
        joinedload(Merchant.categories).joinedload(MerchantCategory.category)
    ).filter(Merchant.id == merchant_id).first()
    
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    
    # 记录调试信息
    print(f"从数据库获取的商户信息 - ID: {merchant.id}, 名称: {merchant.name}")
    print(f"服务半径(原始值): {merchant.service_radius}, 类型: {type(merchant.service_radius)}")
    
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
    
    # 构建响应数据，添加边界坐标字段
    merchant_data = {
        "id": merchant.id,
        "name": merchant.name,
        "logo": merchant.logo,
        "cover": merchant.cover,
        "description": merchant.description,
        "license_number": merchant.license_number,
        "license_image": merchant.license_image,
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
        "updated_at": merchant.updated_at,
        
        # 添加服务半径字段
        "service_radius": merchant.service_radius,
        
        # 添加边界坐标字段
        "north_boundary": merchant.north_boundary,
        "south_boundary": merchant.south_boundary,
        "east_boundary": merchant.east_boundary,
        "west_boundary": merchant.west_boundary
    }
    
    # 如果所有边界坐标都有值，添加结构化的边界信息
    if merchant.north_boundary and merchant.south_boundary and merchant.east_boundary and merchant.west_boundary:
        merchant_data["boundaries"] = {
            "north": merchant.north_boundary,
            "south": merchant.south_boundary,
            "east": merchant.east_boundary,
            "west": merchant.west_boundary
        }
        
        # 计算并添加近似覆盖面积（仅用于展示，不存储）
        if merchant.service_radius:
            coverage_area = 3.14159 * (merchant.service_radius ** 2)
            merchant_data["boundaries"]["coverage_area_km2"] = round(coverage_area, 2)
    
    # 记录调试信息
    print(f"返回商户详情 - ID: {merchant.id}, 名称: {merchant.name}")
    print(f"服务半径(响应值): {merchant_data['service_radius']}, 类型: {type(merchant_data['service_radius'])}")
    
    if merchant.north_boundary:
        print(f"边界坐标: 北({merchant.north_boundary}), 南({merchant.south_boundary}), 东({merchant.east_boundary}), 西({merchant.west_boundary})")
    
    print(f"数据库中的实际服务半径值: {merchant.service_radius}")
    
    return merchant_data


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


import math
import traceback
from typing import Optional, Dict, Any
from sqlalchemy import text

async def update_merchant(
    db: Session, 
    merchant_id: int, 
    merchant_data: MerchantUpdate, 
    user_id: int = None,
    is_admin: bool = False
) -> Dict:  # 注意返回类型改为字典
    """更新商户信息"""
    import math
    from app.services.location_service import calculate_boundary_points
    
    merchant = crud_merchant.get(db, id=merchant_id)
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    
    # 添加调试日志
    print(f"更新商户ID:{merchant_id}，接收到的数据: {merchant_data.dict()}")
    print(f"接收到的服务半径值: {merchant_data.service_radius}")
    
    # 添加管理员检查：如果是管理员调用，则跳过权限检查
    if not is_admin:  # 非管理员才检查权限
        # 检查用户是否有权限更新此商户（只有商户自己可以更新）
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.merchant_id != merchant_id:
            raise HTTPException(status_code=403, detail="没有权限更新其他商户的信息")
    
    # 记录更新前的服务半径值，用于验证
    original_radius = merchant.service_radius
    print(f"更新前的服务半径值: {original_radius}")
    
    # 处理更新数据
    if isinstance(merchant_data, dict):
        update_data = merchant_data
    else:
        update_data = merchant_data.dict(exclude_unset=True)
    
    # 特别处理服务半径字段 - 直接更新模型实例
    new_radius = None
    boundary_data = None
    
    if 'service_radius' in update_data and update_data['service_radius'] is not None:
        print(f"将服务半径从 {merchant.service_radius} 更新为 {update_data['service_radius']}")
        new_radius = float(update_data['service_radius'])
        merchant.service_radius = new_radius
    
    # 更新商户基本信息
    updated_merchant = crud_merchant.update(db, db_obj=merchant, obj_in=merchant_data)
    
    # 验证服务半径是否正确更新
    print(f"更新后的服务半径: {updated_merchant.service_radius}")
    if 'service_radius' in update_data and update_data['service_radius'] is not None and updated_merchant.service_radius != update_data['service_radius']:
        print(f"警告：服务半径更新失败！期望值: {update_data['service_radius']}, 实际值: {updated_merchant.service_radius}")
        # 强制更新服务半径 - 使用原始SQL
        try:
            db.execute(
                text("UPDATE merchants SET service_radius = :radius WHERE id = :id"),
                {"radius": float(update_data['service_radius']), "id": merchant_id}
            )
            db.commit()
            print(f"通过原始SQL更新服务半径成功")
            # 重新获取商户以确认更新
            updated_merchant = crud_merchant.get(db, id=merchant_id)
            print(f"最终服务半径值: {updated_merchant.service_radius}")
            
            # 更新 new_radius 值
            new_radius = float(update_data['service_radius'])
        except Exception as e:
            print(f"SQL更新服务半径失败: {str(e)}")
    
    # 更新分类关联
    if merchant_data.category_ids is not None:
        # 删除旧的关联
        db.query(MerchantCategory).filter(
            MerchantCategory.merchant_id == merchant_id
        ).delete()
        
        # 添加新的关联，并验证分类ID是否存在
        for category_id in merchant_data.category_ids:
            category = crud_category.get(db, id=category_id)
            if not category:
                raise HTTPException(status_code=404, detail=f"分类ID {category_id} 不存在")
            merchant_category = MerchantCategory(
                merchant_id=merchant_id,
                category_id=category_id
            )
            db.add(merchant_category)
        db.commit()
    
    # 计算服务区域边界坐标
    merchant_with_details = await get_merchant_detail(db=db, merchant_id=merchant_id)
    
    # 如果更新了服务半径或位置信息，计算新的边界
    if (updated_merchant.latitude and updated_merchant.longitude and 
        ('service_radius' in update_data or 'latitude' in update_data or 'longitude' in update_data)):
        
        boundary_data = calculate_boundary_points(
            updated_merchant.latitude,
            updated_merchant.longitude,
            updated_merchant.service_radius
        )
        
        print("\n===== 服务区域边界坐标 =====")
        print(f"服务区中心点: ({updated_merchant.latitude}, {updated_merchant.longitude})")
        print(f"服务半径: {updated_merchant.service_radius} 公里")
        
        if boundary_data and boundary_data["valid"]:
            print(f"北边界: {boundary_data['boundaries']['north']}°")
            print(f"南边界: {boundary_data['boundaries']['south']}°")
            print(f"东边界: {boundary_data['boundaries']['east']}°")
            print(f"西边界: {boundary_data['boundaries']['west']}°")
            print(f"覆盖面积: 约 {boundary_data['coverage_area_km2']} 平方公里")
        else:
            print(f"边界计算错误: {boundary_data.get('error', '未知错误')}")
        print("===== 边界坐标计算完成 =====\n")
    
    # 将商户详情和边界数据合并返回
    merchant_with_details["service_boundary"] = boundary_data
    
    return merchant_with_details



import math
from sqlalchemy import text

async def update_merchant_boundaries(db: Session, merchant_id: int) -> bool:
    """专门用于更新商户服务范围边界坐标的独立函数"""
    try:
        # 获取商户信息
        merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        if not merchant:
            print(f"商户ID:{merchant_id}不存在")
            return False
            
        if not merchant.latitude or not merchant.longitude or not merchant.service_radius:
            print(f"商户ID:{merchant_id}缺少计算边界所需的经纬度或服务半径")
            return False
        
        # 确保数据类型正确
        latitude = float(merchant.latitude)
        longitude = float(merchant.longitude)
        radius = float(merchant.service_radius)
        
        print(f"【边界更新】开始计算商户ID:{merchant_id}的边界 - 中心点:({latitude}, {longitude}), 半径:{radius}km")
        
        # 计算边界坐标
        lat_rad = latitude * math.pi / 180
        km_per_lng_degree = 111.32 * math.cos(lat_rad)
        km_per_lat_degree = 111.32
        
        north = latitude + (radius / km_per_lat_degree)
        south = latitude - (radius / km_per_lat_degree)
        east = longitude + (radius / km_per_lng_degree)
        west = longitude - (radius / km_per_lng_degree)
        
        print(f"【边界更新】计算结果 - 北:{north:.6f}, 南:{south:.6f}, 东:{east:.6f}, 西:{west:.6f}")
        
        # 直接执行SQL更新，避免ORM问题
        sql = """
        UPDATE merchants 
        SET north_boundary = :north, 
            south_boundary = :south, 
            east_boundary = :east, 
            west_boundary = :west 
        WHERE id = :id
        """
        
        result = db.execute(
            text(sql),
            {
                "north": north,
                "south": south,
                "east": east,
                "west": west,
                "id": merchant_id
            }
        )
        
        db.commit()
        
        print(f"【边界更新】更新完成, 影响行数: {result.rowcount}")
        return True
    except Exception as e:
        db.rollback()
        print(f"【边界更新】更新边界坐标时出错: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


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
            "created_at": merchant.created_at,
            # 添加以下字段
            "contact_name": merchant.contact_name,
            "contact_phone": merchant.contact_phone,
            "service_radius": merchant.service_radius,
            "north_boundary": merchant.north_boundary,
            "south_boundary": merchant.south_boundary,
            "east_boundary": merchant.east_boundary,
            "west_boundary": merchant.west_boundary,
            "commission_rate": merchant.commission_rate,
            "license_number": merchant.license_number,
            "license_image": merchant.license_image
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
    
    # 检查是否有商品使用此分类
    product_count = db.query(func.count(product_categories.c.category_id)).filter(
        product_categories.c.category_id == category_id
    ).scalar() or 0
    
    if product_count > 0:
        raise HTTPException(status_code=400, detail="分类已被商品使用，无法删除")
    
    # 使用 delete 方法而不是 remove 方法
    return crud_category.delete(db, id=category_id)