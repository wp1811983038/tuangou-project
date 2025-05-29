from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.services import merchant_service
from app.models.admin import Admin
from app.models.category import Category

router = APIRouter()


@router.get("/", response_model=schemas.common.PaginatedResponse)
async def search_merchants(
    keyword: Optional[str] = Query(None, max_length=100),
    category_id: Optional[int] = Query(None, ge=1),
    status: Optional[int] = Query(None, ge=0),
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    distance: Optional[float] = Query(None, ge=0),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None, regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索商户列表
    """
    merchants, total = await merchant_service.search_merchants(
        db=db,
        keyword=keyword,
        category_id=category_id,
        status=status,
        latitude=latitude,
        longitude=longitude,
        distance=distance,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )
    
    return {
        "data": {
            "items": merchants,
            "total": total,
            "page": pagination["page"],
            "page_size": pagination["page_size"],
            "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
        }
    }


from sqlalchemy import func, text  # 添加这个导入

@router.get("/my", response_model=schemas.merchant.MerchantDetail)
async def get_my_merchant(
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """获取当前商户资料"""
    # 检查用户是否有关联的商户ID
    if not current_user.merchant_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="用户未关联商户账号"
        )
    
    # 使用ORM查询获取商户基础信息
    merchant = db.query(Merchant).filter(Merchant.id == current_user.merchant_id).first()
    
    # 记录调试信息
    print(f"查询商户信息: 用户ID={current_user.id}, 商户ID={current_user.merchant_id}")
    
    # 检查商户是否存在
    if not merchant:
        # 记录异常情况，方便排查
        print(f"警告: 用户ID={current_user.id}关联了不存在的商户ID={current_user.merchant_id}")
        
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="关联的商户信息不存在，请联系系统管理员"
        )
    
    # 检查商户状态
    if merchant.status != 1:  # 1表示正常状态
        status_messages = {
            0: "商户正在审核中，暂时无法访问",
            2: "商户已被禁用，请联系平台管理员"
        }
        
        message = status_messages.get(merchant.status, "商户状态异常，无法访问")
        print(f"商户状态检查失败: 商户ID={merchant.id}, 状态={merchant.status}, 消息={message}")
        
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message
        )
    
    # 获取商户详情（包括分类等相关信息）
    merchant_detail = await merchant_service.get_merchant_detail(
        db=db,
        merchant_id=current_user.merchant_id
    )
    
    # 成功处理，使用字典语法访问属性
    try:
        print(f"成功获取商户信息: ID={merchant_detail.get('id', '未知')}, 名称={merchant_detail.get('name', '未知')}")
    except Exception as e:
        # 容错处理，避免打印语句导致整个请求失败
        print(f"打印商户信息时出错: {str(e)}")
    
    # 如果响应模型需要Pydantic模型对象，可以在这里进行转换
    # merchant_detail = schemas.merchant.MerchantDetail(**merchant_detail)
    
    return merchant_detail

    

@router.get("/{merchant_id}", response_model=schemas.merchant.MerchantDetail)
async def get_merchant(
    merchant_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商户详情
    """
    merchant = await merchant_service.get_merchant_detail(
        db=db,
        merchant_id=merchant_id
    )
    return merchant


@router.post("/", response_model=schemas.merchant.Merchant)
async def create_merchant(
    merchant_data: schemas.merchant.MerchantCreate,
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建商户
    """
    merchant = await merchant_service.create_merchant(
        db=db,
        merchant_data=merchant_data,
        user_id=current_user.id
    )
    return merchant


# backend/app/api/api_v1/endpoints/merchants.py




#商户端更新
@router.put("/my", response_model=schemas.merchant.Merchant)
async def update_current_merchant(
    merchant_data: schemas.merchant.MerchantUpdate,
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新当前登录商户的信息
    """
    return await merchant_service.update_merchant(
        db=db,
        merchant_id=current_user.merchant_id,
        merchant_data=merchant_data,
        user_id=current_user.id
    )


#管理端更新
@router.put("/{merchant_id}", response_model=schemas.merchant.Merchant)
async def update_merchant(
    merchant_data: schemas.merchant.MerchantUpdate,
    merchant_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新商户信息（管理员可更新任意商户，商户只能更新自己）
    """
    # 检查用户是否有权限更新此商户
    if not current_user.is_admin and (not current_user.merchant_id or current_user.merchant_id != merchant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="没有权限更新其他商户的信息"
        )
    
    return await merchant_service.update_merchant(
        db=db,
        merchant_id=merchant_id,
        merchant_data=merchant_data
    )



# 添加导入
# 添加必要的导入
from app.models.merchant import Merchant, MerchantCategory, Category
from app.crud import crud_merchant

# 添加管理员专用路由
@router.put("/admin/{merchant_id}", response_model=schemas.merchant.MerchantDetail)
async def admin_update_merchant(
    merchant_data: schemas.merchant.MerchantUpdate,
    merchant_id: int = Path(..., ge=1),
    admin: Admin = Depends(deps.get_current_admin),
    db: Session = Depends(deps.get_db)
) -> Any:
    """管理员更新商户信息（需要管理员权限）"""
    import math
    
    print(f"管理员更新商户API调用，商户ID: {merchant_id}")
    print(f"请求体原始数据: {merchant_data}")
    print(f"服务半径值: {merchant_data.service_radius}")
    
    # 获取商户
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    
    # 获取原始值用于比较
    old_radius = merchant.service_radius
    old_latitude = merchant.latitude
    old_longitude = merchant.longitude
    
    # 更新基本信息
    for key, value in merchant_data.dict(exclude_unset=True, exclude={"category_ids"}).items():
        setattr(merchant, key, value)
    
    # 更新分类关联
    if merchant_data.category_ids is not None:
        # 删除旧关联
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
    
    # 计算边界坐标并保存到数据库
    if (merchant_data.service_radius is not None or 
        merchant_data.latitude is not None or 
        merchant_data.longitude is not None):
        
        latitude = merchant.latitude
        longitude = merchant.longitude
        radius = merchant.service_radius
        
        if latitude and longitude and radius:
            try:
                # 转换纬度为弧度
                lat_rad = latitude * math.pi / 180
                
                # 计算1度经纬度对应的公里数
                km_per_lng_degree = 111.32 * math.cos(lat_rad)
                km_per_lat_degree = 111.32
                
                # 计算边界
                north = latitude + (radius / km_per_lat_degree)
                south = latitude - (radius / km_per_lat_degree)
                east = longitude + (radius / km_per_lng_degree)
                west = longitude - (radius / km_per_lng_degree)
                coverage = math.pi * (radius ** 2)  # 仅用于日志显示
                
                # 保存边界坐标到数据库
                merchant.north_boundary = north
                merchant.south_boundary = south
                merchant.east_boundary = east
                merchant.west_boundary = west
                
                print("\n")
                print("*" * 50)
                print("服务区域边界坐标计算结果:")
                print(f"商户ID: {merchant_id}")
                print(f"中心点: 纬度={latitude}, 经度={longitude}")
                print(f"服务半径: {radius} 公里")
                print(f"北边界纬度: {north:.6f}°")
                print(f"南边界纬度: {south:.6f}°") 
                print(f"东边界经度: {east:.6f}°")
                print(f"西边界经度: {west:.6f}°")
                print(f"覆盖面积: 约 {coverage:.2f} 平方公里 (仅显示，未存储)")
                print("已保存边界坐标到数据库")
                
                # 打印变化信息
                if merchant_data.service_radius is not None and old_radius != merchant_data.service_radius:
                    print(f"服务半径变化: {old_radius} -> {merchant_data.service_radius}")
                if merchant_data.latitude is not None and old_latitude != merchant_data.latitude:
                    print(f"纬度变化: {old_latitude} -> {merchant_data.latitude}")
                if merchant_data.longitude is not None and old_longitude != merchant_data.longitude:
                    print(f"经度变化: {old_longitude} -> {merchant_data.longitude}")
                
                print("*" * 50)
                print("\n")
                
            except Exception as e:
                print(f"计算边界坐标时出错: {str(e)}")
    
    # 提交更改到数据库
    db.add(merchant)
    db.commit()
    db.refresh(merchant)
    
    # 使用get_merchant_detail函数获取完整格式的商户信息
    return await merchant_service.get_merchant_detail(
        db=db,
        merchant_id=merchant_id
    )


@router.get("/{merchant_id}/categories", response_model=List[schemas.merchant.Category])
async def get_merchant_product_categories(
    merchant_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取指定商户的商品分类
    只返回该商户有商品的分类
    """
    try:
        # 查询该商户所有商品涉及的分类
        from app.models.category import product_categories
        from app.models.product import Product
        
        # 获取商户的所有商品分类，并统计每个分类的商品数量
        categories_query = db.query(
            Category.id,
            Category.name,
            Category.icon,
            Category.sort_order,
            Category.is_active,
            Category.created_at,
            Category.updated_at,
            func.count(Product.id).label('product_count')
        ).join(
            product_categories,
            Category.id == product_categories.c.category_id
        ).join(
            Product,
            product_categories.c.product_id == Product.id
        ).filter(
            Product.merchant_id == merchant_id,
            Product.status == 1,  # 只统计上架商品
            Category.is_active == True
        ).group_by(
            Category.id,
            Category.name,
            Category.icon,
            Category.sort_order,
            Category.is_active,
            Category.created_at,
            Category.updated_at
        ).order_by(
            Category.sort_order.asc(),
            Category.id.asc()
        )
        
        categories = categories_query.all()
        
        # 转换为字典格式
        result = []
        for category_data in categories:
            result.append({
                "id": category_data.id,
                "name": category_data.name or "",
                "icon": category_data.icon or "",
                "sort_order": category_data.sort_order or 0,
                "is_active": category_data.is_active if category_data.is_active is not None else True,
                "product_count": category_data.product_count or 0,
                "merchant_count": 1,  # 当前商户
                "created_at": category_data.created_at,
                "updated_at": category_data.updated_at
            })
        
        print(f"商户 {merchant_id} 的商品分类数量: {len(result)}")
        return result
        
    except Exception as e:
        print(f"获取商户商品分类失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"获取商户商品分类失败: {str(e)}"
        )



@router.put("/{merchant_id}", response_model=schemas.merchant.Merchant, dependencies=[Depends(deps.get_current_admin)])
async def update_merchant_by_admin(
    merchant_data: schemas.merchant.MerchantUpdate,
    merchant_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新商户信息（需要管理员权限）
    """
    # 直接获取商户并更新，跳过权限检查
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
        
    # 更新基本信息
    updated_merchant = crud_merchant.update(db, db_obj=merchant, obj_in=merchant_data)
    
    # 完成后获取完整详情以返回正确格式
    return await merchant_service.get_merchant_detail(db=db, merchant_id=merchant_id)

@router.get("/categories/all", response_model=List[schemas.merchant.Category])
async def get_all_categories(
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取所有可用分类
    """
    try:
        from app.services import merchant_service
        categories = await merchant_service.get_categories(db=db, is_active=True)
        
        print(f"返回分类列表，数量: {len(categories)}")
        
        return categories
    except Exception as e:
        print(f"获取分类列表失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取分类列表失败: {str(e)}"
        )


@router.post("/categories", response_model=schemas.merchant.Category, dependencies=[Depends(deps.get_current_admin)])
async def create_category(
    category_data: schemas.merchant.CategoryCreate,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建分类（需要管理员权限）
    """
    return await merchant_service.create_category(
        db=db,
        category_data=category_data
    )


@router.put("/categories/{category_id}", response_model=schemas.merchant.Category, dependencies=[Depends(deps.get_current_admin)])
async def update_category(
    category_data: schemas.merchant.CategoryUpdate,
    category_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新分类（需要管理员权限）
    """
    return await merchant_service.update_category(
        db=db,
        category_id=category_id,
        category_data=category_data
    )


@router.delete("/categories/{category_id}", response_model=schemas.common.BooleanResponse, dependencies=[Depends(deps.get_current_admin)])
async def delete_category(
    category_id: int = Path(..., ge=1),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    删除分类（需要管理员权限）
    """
    result = await merchant_service.delete_category(
        db=db,
        category_id=category_id
    )
    return {"data": result}



