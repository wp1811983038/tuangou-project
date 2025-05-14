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
    print(f"获取商户ID:{merchant_id}的详细信息")
    
    # 确保会话干净，不使用缓存数据
    db.expire_all()
    
    # 尝试清除可能存在的Redis缓存
    try:
        from app.core.redis import RedisClient
        from app.core.constants import CACHE_KEY_PREFIX
        cache_key = f"{CACHE_KEY_PREFIX.get('merchant', 'merchant:')}{merchant_id}"
        RedisClient.delete(cache_key)
        print(f"已尝试清除Redis缓存: {cache_key}")
    except Exception as e:
        print(f"清除缓存过程中出错(可忽略): {str(e)}")
    
    # 使用关联加载获取商户及其分类信息
    merchant = db.query(Merchant).options(
        joinedload(Merchant.categories).joinedload(MerchantCategory.category)
    ).filter(Merchant.id == merchant_id).first()
    
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    
    # 打印调试信息，特别是服务半径
    print(f"从数据库获取的商户信息 - ID: {merchant.id}, 名称: {merchant.name}")
    print(f"服务半径(原始值): {merchant.service_radius}, 类型: {type(merchant.service_radius)}")
    
    # 获取商品数量
    product_count = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id
    ).scalar() or 0
    
    # 获取分类信息
    categories = []
    for mc in merchant.categories:
        if mc.category:
            category_dict = {
                "id": mc.category.id,
                "name": mc.category.name,
                "icon": mc.category.icon,
                "created_at": mc.category.created_at,
                "updated_at": mc.category.updated_at,
                "sort_order": mc.category.sort_order,
                "is_active": mc.category.is_active
            }
            categories.append(category_dict)
    
    # 严格处理服务半径字段，确保是浮点数类型
    service_radius = None
    if merchant.service_radius is not None:
        try:
            service_radius = float(merchant.service_radius)
        except (ValueError, TypeError):
            # 如果转换失败，使用默认值
            service_radius = 5.0
            print(f"警告: 服务半径转换失败，使用默认值 {service_radius}")
    
    # 构建完整的响应字典
    result_dict = {
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
        # 确保使用处理后的服务半径值
        "service_radius": service_radius
    }
    
    # 打印关键字段，特别是服务半径
    print(f"返回商户详情 - ID: {result_dict['id']}, 名称: {result_dict['name']}")
    print(f"服务半径(响应值): {result_dict['service_radius']}, 类型: {type(result_dict['service_radius'])}")
    
    # 直接检查数据库中的实际值
    try:
        from sqlalchemy import text
        result = db.execute(
            text("SELECT service_radius FROM merchants WHERE id = :id"),
            {"id": merchant_id}
        ).fetchone()
        if result:
            print(f"数据库中的实际服务半径值: {result[0]}")
    except Exception as e:
        print(f"查询数据库实际值时出错: {str(e)}")
    
    return result_dict


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
) -> Merchant:
    """更新商户信息，包括服务半径和边界坐标"""
    merchant = crud_merchant.get(db, id=merchant_id)
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    
    # 添加详细调试日志
    print(f"更新商户ID:{merchant_id}，接收到的数据: {merchant_data.dict()}")
    print(f"接收到的服务半径值: {merchant_data.service_radius}, 类型: {type(merchant_data.service_radius)}")
    
    # 权限检查（非管理员）
    if not is_admin:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.merchant_id != merchant_id:
            raise HTTPException(status_code=403, detail="没有权限更新其他商户的信息")
    
    # 记录更新前的服务半径值
    original_radius = merchant.service_radius
    original_lat = merchant.latitude
    original_lng = merchant.longitude
    print(f"更新前的数据 - 服务半径: {original_radius}, 中心点: ({original_lat}, {original_lng})")
    
    # 获取要更新的坐标和半径值
    new_lat = merchant_data.latitude if merchant_data.latitude is not None else original_lat
    new_lng = merchant_data.longitude if merchant_data.longitude is not None else original_lng
    new_radius = None
    
    if merchant_data.service_radius is not None:
        try:
            new_radius = float(merchant_data.service_radius)
            print(f"新的服务半径值: {new_radius}, 类型: {type(new_radius)}")
        except (ValueError, TypeError) as e:
            print(f"服务半径值转换错误: {e}")
            raise HTTPException(status_code=400, detail=f"服务半径必须是数值: {str(e)}")
    
    # 计算边界坐标的函数
    def calculate_boundaries(latitude, longitude, radius):
        """计算服务半径边界坐标"""
        if not latitude or not longitude or not radius:
            return None
        
        # 地球半径(千米)
        EARTH_RADIUS = 6371
        
        # 转换纬度为弧度
        lat_rad = latitude * math.pi / 180
        
        # 计算1度经度对应的公里数（与纬度有关）
        km_per_lng_degree = 111.32 * math.cos(lat_rad)
        # 计算1度纬度对应的公里数（基本固定）
        km_per_lat_degree = 111.32
        
        # 计算边界
        north = latitude + (radius / km_per_lat_degree)
        south = latitude - (radius / km_per_lat_degree)
        east = longitude + (radius / km_per_lng_degree)
        west = longitude - (radius / km_per_lng_degree)
        
        return {
            'north': north,
            'south': south,
            'east': east,
            'west': west
        }
    
    # 处理服务半径和边界坐标更新
    update_data_dict = merchant_data.dict(exclude_unset=True)
    
    # 确定是否需要更新边界坐标
    should_update_boundary = (
        (merchant_data.latitude is not None and merchant_data.latitude != original_lat) or
        (merchant_data.longitude is not None and merchant_data.longitude != original_lng) or
        (new_radius is not None and new_radius != original_radius)
    )
    
    # 如果需要更新边界坐标
    if should_update_boundary and new_lat and new_lng and (new_radius is not None or original_radius):
        radius_to_use = new_radius if new_radius is not None else original_radius
        print(f"计算边界坐标: 中心点({new_lat}, {new_lng}), 半径:{radius_to_use}公里")
        
        boundaries = calculate_boundaries(new_lat, new_lng, radius_to_use)
        if boundaries:
            print(f"计算的边界值: {boundaries}")
            # 添加边界坐标到更新数据中
            update_data_dict['north_boundary'] = boundaries['north']
            update_data_dict['south_boundary'] = boundaries['south']
            update_data_dict['east_boundary'] = boundaries['east']
            update_data_dict['west_boundary'] = boundaries['west']
            print(f"已将边界坐标添加到更新数据")
    
    # 1. 首先尝试直接更新模型实例
    if new_radius is not None:
        merchant.service_radius = new_radius
        print(f"直接设置merchant.service_radius = {new_radius}")
        # 立即保存更改
        try:
            db.add(merchant)
            db.flush()  # 刷新但不提交事务
        except Exception as e:
            print(f"直接更新服务半径出错: {e}")
    
    # 2. 使用更新后的数据字典创建更新对象
    # 如果服务半径已单独处理，从更新数据中移除
    if new_radius is not None:
        update_data_dict.pop('service_radius', None)
    
    # 创建更新对象
    update_obj = MerchantUpdate(**update_data_dict)
    print(f"最终更新数据对象: {update_obj.dict(exclude_unset=True)}")
    
    # 更新商户信息
    updated_merchant = crud_merchant.update(db, db_obj=merchant, obj_in=update_obj)
    
    # 更新分类关联
    if merchant_data.category_ids is not None:
        try:
            # 删除旧的关联
            db.query(MerchantCategory).filter(
                MerchantCategory.merchant_id == merchant_id
            ).delete()
            
            # 添加新的关联
            for category_id in merchant_data.category_ids:
                category = crud_category.get(db, id=category_id)
                if not category:
                    raise HTTPException(status_code=404, detail=f"分类ID {category_id} 不存在")
                merchant_category = MerchantCategory(
                    merchant_id=merchant_id,
                    category_id=category_id
                )
                db.add(merchant_category)
        except Exception as e:
            print(f"更新分类关联出错: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"更新分类关联失败: {str(e)}")
    
    # 提交所有更改
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"提交更改时出错: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"更新商户失败: {str(e)}")
    
    # 刷新实例以获取最新数据
    db.refresh(updated_merchant)
    print(f"commit后的服务半径: {updated_merchant.service_radius}")
    print(f"commit后的边界坐标: 北:{updated_merchant.north_boundary}, 南:{updated_merchant.south_boundary}, 东:{updated_merchant.east_boundary}, 西:{updated_merchant.west_boundary}")
    
    # 3. 验证服务半径是否正确更新，如果不正确则使用SQL直接更新
    if new_radius is not None and abs(updated_merchant.service_radius - new_radius) > 0.001:
        print(f"警告：服务半径更新失败！期望值: {new_radius}, 实际值: {updated_merchant.service_radius}")
        try:
            # 使用原始SQL强制更新服务半径
            radius_sql = "UPDATE merchants SET service_radius = :radius WHERE id = :id"
            print(f"执行SQL: {radius_sql} 参数: radius={new_radius}, id={merchant_id}")
            db.execute(
                text(radius_sql),
                {"radius": new_radius, "id": merchant_id}
            )
            
            # 如果边界坐标计算了但数据库中不正确，也强制更新
            if should_update_boundary and boundaries:
                boundary_sql = """
                UPDATE merchants 
                SET north_boundary = :north, south_boundary = :south, 
                    east_boundary = :east, west_boundary = :west 
                WHERE id = :id
                """
                print(f"执行SQL更新边界坐标")
                db.execute(
                    text(boundary_sql),
                    {
                        "north": boundaries['north'],
                        "south": boundaries['south'],
                        "east": boundaries['east'],
                        "west": boundaries['west'],
                        "id": merchant_id
                    }
                )
            
            db.commit()
            print(f"通过SQL更新服务半径和边界坐标完成")
            
            # 重新获取商户以确认更新
            updated_merchant = crud_merchant.get(db, id=merchant_id)
            print(f"SQL更新后的服务半径: {updated_merchant.service_radius}")
            print(f"SQL更新后的边界坐标: 北:{updated_merchant.north_boundary}, 南:{updated_merchant.south_boundary}, 东:{updated_merchant.east_boundary}, 西:{updated_merchant.west_boundary}")
        except Exception as e:
            print(f"SQL更新服务半径或边界坐标失败: {str(e)}")
            traceback.print_exc()

        boundary_result = await update_merchant_boundaries(db, merchant_id)
        if boundary_result:
            print("成功更新边界坐标")
        else:
            print("边界坐标更新失败")

        # 重新获取商户以确保拿到最新数据
        return crud_merchant.get(db, id=merchant_id)
    
    # 返回最终更新后的商户
    return updated_merchant



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
    
    # 检查是否有商品使用此分类
    product_count = db.query(func.count(product_categories.c.category_id)).filter(
        product_categories.c.category_id == category_id
    ).scalar() or 0
    
    if product_count > 0:
        raise HTTPException(status_code=400, detail="分类已被商品使用，无法删除")
    
    # 使用 delete 方法而不是 remove 方法
    return crud_category.delete(db, id=category_id)