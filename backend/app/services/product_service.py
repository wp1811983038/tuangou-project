from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from fastapi import HTTPException, status
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session, joinedload

from app.crud import crud_product, crud_product_image, crud_product_specification
from app.models.product import (
    Product, ProductImage, ProductSpecification, product_categories
)
from app.models.merchant import Merchant, Category
from app.models.user import Favorite
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductImageCreate, ProductSpecificationCreate
)
from app.models.group import Group
from app.models.order import OrderItem

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from app.models.product import Product, ProductImage, ProductSpecification
from app.models.order import Order, OrderItem
from app.models.group import Group
from app.schemas.product import ProductCreate, ProductUpdate


async def get_product(db: Session, product_id: int, user_id: Optional[int] = None) -> Dict:
    """获取单个商品详情"""
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="商品不存在")
        
        # 增加浏览量
        product.views += 1
        db.commit()
        
        # 获取商户信息
        merchant = db.query(Merchant).filter(Merchant.id == product.merchant_id).first()
        
        # 获取商品图片
        images = db.query(ProductImage).filter(
            ProductImage.product_id == product_id
        ).order_by(ProductImage.sort_order).all()
        
        # 获取商品规格
        specifications = db.query(ProductSpecification).filter(
            ProductSpecification.product_id == product_id
        ).order_by(ProductSpecification.sort_order).all()
        
        # 获取商品分类并确保包含必要字段
        categories_data = []
        categories = db.query(Category).join(
            product_categories,
            product_categories.c.category_id == Category.id
        ).filter(
            product_categories.c.product_id == product_id
        ).all()
        
        for category in categories:
            categories_data.append({
                "id": category.id,
                "name": category.name,
                "icon": category.icon,
                "created_at": category.created_at or datetime.now(),
                "updated_at": category.updated_at or datetime.now(),
                "sort_order": category.sort_order,
                "is_active": category.is_active
            })
        
        # 检查是否收藏
        is_favorite = False
        if user_id:
            favorite = db.query(Favorite).filter(
                Favorite.user_id == user_id,
                Favorite.product_id == product_id
            ).first()
            if favorite:
                is_favorite = True
        
        # 收藏数量
        favorite_count = db.query(func.count(Favorite.id)).filter(
            Favorite.product_id == product_id
        ).scalar() or 0
        
        # 检查是否有团购
        has_group = False
        
        # 构建响应数据
        images_data = []
        for image in images:
            images_data.append({
                "id": image.id,
                "image_url": image.image_url,
                "sort_order": image.sort_order,
                # 添加缺失的必填字段
                "product_id": product_id,
                "created_at": image.created_at or datetime.now()
            })
        
        specs_data = []
        for spec in specifications:
            specs_data.append({
                "id": spec.id,
                "name": spec.name,
                "value": spec.value,
                "price_adjustment": spec.price_adjustment,
                "stock": spec.stock,
                "sort_order": spec.sort_order,
                # 添加缺失的必填字段
                "product_id": product_id,
                "created_at": spec.created_at or datetime.now(),
                "updated_at": spec.updated_at or datetime.now()
            })
        
        return {
            "id": product.id,
            "merchant_id": product.merchant_id,
            "merchant_name": merchant.name if merchant else None,
            "name": product.name,
            "thumbnail": product.thumbnail,
            "original_price": product.original_price,
            "current_price": product.current_price,
            "group_price": product.group_price,
            "stock": product.stock,
            "unit": product.unit,
            "description": product.description,
            "detail": product.detail,
            "sales": product.sales,
            "views": product.views,
            "status": product.status,
            "sort_order": product.sort_order,
            "is_hot": product.is_hot,
            "is_new": product.is_new,
            "is_recommend": product.is_recommend,
            "has_group": has_group,
            "favorite_count": favorite_count,
            "is_favorite": is_favorite,
            "categories": categories_data,
            "images": images_data,
            "specifications": specs_data,
            "created_at": product.created_at,
            "updated_at": product.updated_at
        }
    except HTTPException as e:
        # 重新抛出HTTP异常
        raise
    except Exception as e:
        # 记录详细错误并返回友好消息
        import traceback
        print(f"获取商品详情出错，商品ID:{product_id}，错误:{str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"获取商品详情时出错:{str(e)}")


async def search_products(
    db: Session,
    keyword: Optional[str] = None,
    category_id: Optional[int] = None,
    merchant_id: Optional[int] = None,
    status: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    is_hot: Optional[bool] = None,
    is_new: Optional[bool] = None,
    is_recommend: Optional[bool] = None,
    has_group: Optional[bool] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[Dict], int]:
    """搜索商品列表"""
    query = db.query(Product)
    
    # 筛选条件
    if keyword:
        query = query.filter(Product.name.ilike(f"%{keyword}%"))
    
    if category_id:
        query = query.join(
            product_categories,
            product_categories.c.product_id == Product.id
        ).filter(
            product_categories.c.category_id == category_id
        )
    
    if merchant_id:
        query = query.filter(Product.merchant_id == merchant_id)
    
    if status is not None:
        query = query.filter(Product.status == status)
    else:
        # 默认只显示上架商品
        query = query.filter(Product.status == 1)
    
    if min_price is not None:
        query = query.filter(Product.current_price >= min_price)
    
    if max_price is not None:
        query = query.filter(Product.current_price <= max_price)
    
    if is_hot is not None:
        query = query.filter(Product.is_hot == is_hot)
    
    if is_new is not None:
        query = query.filter(Product.is_new == is_new)
    
    if is_recommend is not None:
        query = query.filter(Product.is_recommend == is_recommend)
    
    # 处理团购筛选
    if has_group is not None:
        if has_group:
            # 查找有进行中团购的商品
            query = query.join(
                Group,
                (Group.product_id == Product.id) & 
                (Group.status == 1) &  # 进行中
                (Group.end_time > datetime.now())
            )
        else:
            # 查找没有进行中团购的商品
            query = query.outerjoin(
                Group,
                (Group.product_id == Product.id) & 
                (Group.status == 1) &  # 进行中
                (Group.end_time > datetime.now())
            ).filter(Group.id == None)
    
    # 查询总数
    total = query.count()
    
    # 排序
    if sort_by:
        direction = desc if sort_order == "desc" else asc
        if sort_by == "price":
            query = query.order_by(direction(Product.current_price))
        elif sort_by == "sales":
            query = query.order_by(direction(Product.sales))
        elif sort_by == "views":
            query = query.order_by(direction(Product.views))
        elif sort_by == "created_at":
            query = query.order_by(direction(Product.created_at))
    else:
        # 默认按排序值和创建时间排序
        query = query.order_by(Product.sort_order.desc(), Product.created_at.desc())
    
    # 分页
    products = query.offset(skip).limit(limit).all()
    
    # 处理结果
    result = []
    for product in products:
        # 获取商户名称
        merchant = db.query(Merchant).filter(Merchant.id == product.merchant_id).first()
        
        # 获取商品分类
        categories = db.query(Category).join(
            product_categories,
            product_categories.c.category_id == Category.id
        ).filter(
            product_categories.c.product_id == product.id
        ).all()
        
        # 检查是否收藏
        is_favorite = False
        if user_id:
            favorite = db.query(Favorite).filter(
                Favorite.user_id == user_id,
                Favorite.product_id == product.id
            ).first()
            if favorite:
                is_favorite = True
        
        # 检查是否有团购
        has_group = False
        active_group = db.query(Group).filter(
            Group.product_id == product.id,
            Group.status == 1,  # 进行中
            Group.end_time > datetime.now()
        ).first()
        if active_group:
            has_group = True
        
        # 收藏数量
        favorite_count = db.query(func.count(Favorite.id)).filter(
            Favorite.product_id == product.id
        ).scalar() or 0
        
        product_data = {
            "id": product.id,
            "merchant_id": product.merchant_id,
            "merchant_name": merchant.name if merchant else None,
            "name": product.name,
            "thumbnail": product.thumbnail,
            "original_price": product.original_price,
            "current_price": product.current_price,
            "group_price": product.group_price,
            "stock": product.stock,
            "unit": product.unit,
            "description": product.description,
            "sales": product.sales,
            "views": product.views,
            "status": product.status,
            "is_hot": product.is_hot,
            "is_new": product.is_new,
            "is_recommend": product.is_recommend,
            "has_group": has_group,
            "favorite_count": favorite_count,
            "is_favorite": is_favorite,
            "categories": [
                {
                    "id": category.id,
                    "name": category.name,
                    "icon": category.icon
                } for category in categories
            ],
            "created_at": product.created_at,
            "updated_at": product.updated_at
        }
        
        result.append(product_data)
    
    return result, total


async def create_product(db: Session, product_data: ProductCreate, merchant_id: int) -> Product:
    """创建商品"""
    # 检查商户是否存在
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    
    # 创建商品
    product_dict = product_data.dict(exclude={"category_ids", "images", "specifications"})
    product_dict["merchant_id"] = merchant_id
    
    product = crud_product.create(db, obj_in=product_dict, merchant_id=merchant_id)
    
    # 关联分类
    for category_id in product_data.category_ids:
        category = db.query(Category).filter(Category.id == category_id).first()
        if category:
            stmt = product_categories.insert().values(
                product_id=product.id,
                category_id=category_id
            )
            db.execute(stmt)
    
    # 添加图片
    for image_data in product_data.images:
        image = ProductImageCreate(**image_data.dict())
        crud_product_image.create(db, obj_in=image, product_id=product.id)
    
    # 添加规格
    for spec_data in product_data.specifications:
        spec = ProductSpecificationCreate(**spec_data.dict())
        crud_product_specification.create(db, obj_in=spec, product_id=product.id)
    
    db.commit()
    db.refresh(product)
    
    return product


async def update_product(db: Session, product_id: int, product_data: ProductUpdate, merchant_id: int) -> Product:
    """更新商品"""
    # 检查商品是否存在且属于该商户
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == merchant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在或无权限")
    
    # 更新商品基本信息
    product_dict = product_data.dict(exclude={"category_ids"}, exclude_unset=True)
    updated_product = crud_product.update(db, db_obj=product, obj_in=product_dict)
    
    # 更新分类关联
    if product_data.category_ids is not None:
        # 删除现有关联
        db.execute(product_categories.delete().where(
            product_categories.c.product_id == product_id
        ))
        
        # 添加新关联
        for category_id in product_data.category_ids:
            category = db.query(Category).filter(Category.id == category_id).first()
            if category:
                stmt = product_categories.insert().values(
                    product_id=product_id,
                    category_id=category_id
                )
                db.execute(stmt)
    
    db.commit()
    db.refresh(updated_product)
    
    return updated_product


async def update_product_images(
    db: Session, 
    product_id: int,
    merchant_id: int,
    images: List[ProductImageCreate]
) -> List[ProductImage]:
    """更新商品图片"""
    # 检查商品是否存在且属于该商户
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == merchant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在或无权限")
    
    # 删除现有图片
    db.query(ProductImage).filter(ProductImage.product_id == product_id).delete()
    
    # 添加新图片
    new_images = []
    for image_data in images:
        image = crud_product_image.create(db, obj_in=image_data, product_id=product_id)
        new_images.append(image)
    
    db.commit()
    
    return new_images


async def update_product_specifications(
    db: Session, 
    product_id: int,
    merchant_id: int,
    specifications: List[ProductSpecificationCreate]
) -> List[ProductSpecification]:
    """更新商品规格"""
    # 检查商品是否存在且属于该商户
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == merchant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在或无权限")
    
    # 删除现有规格
    db.query(ProductSpecification).filter(ProductSpecification.product_id == product_id).delete()
    
    # 添加新规格
    new_specs = []
    for spec_data in specifications:
        spec = crud_product_specification.create(db, obj_in=spec_data, product_id=product_id)
        new_specs.append(spec)
    
    db.commit()
    
    return new_specs


async def delete_product(db: Session, product_id: int, merchant_id: int) -> bool:
    """删除商品"""
    # 检查商品是否存在且属于该商户
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == merchant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在或无权限")
    
    # 检查商品是否有关联订单
    order_count = db.query(func.count(OrderItem.id)).filter(
        OrderItem.product_id == product_id
    ).scalar() or 0
    
    if order_count > 0:
        # 如果有关联订单，则只能下架不能删除
        product.status = 0  # 下架
        db.commit()
        return False
    
    # 删除商品图片
    db.query(ProductImage).filter(ProductImage.product_id == product_id).delete()
    
    # 删除商品规格
    db.query(ProductSpecification).filter(ProductSpecification.product_id == product_id).delete()
    
    # 删除分类关联
    db.execute(product_categories.delete().where(
        product_categories.c.product_id == product_id
    ))
    
    # 删除商品
    db.delete(product)
    db.commit()
    
    return True


async def get_related_products(
    db: Session, 
    product_id: int, 
    limit: int = 10
) -> List[Dict]:
    """获取相关商品"""
    # 获取当前商品
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    # 获取当前商品的分类
    category_ids = db.query(product_categories.c.category_id).filter(
        product_categories.c.product_id == product_id
    ).all()
    category_ids = [c[0] for c in category_ids]
    
    if not category_ids:
        # 如果没有分类，返回同一商户的其他商品
        related_products = db.query(Product).filter(
            Product.merchant_id == product.merchant_id,
            Product.id != product_id,
            Product.status == 1  # 上架状态
        ).order_by(
            Product.is_recommend.desc(),
            Product.sales.desc()
        ).limit(limit).all()
    else:
        # 查询同分类的其他商品
        related_products = db.query(Product).join(
            product_categories,
            product_categories.c.product_id == Product.id
        ).filter(
            product_categories.c.category_id.in_(category_ids),
            Product.id != product_id,
            Product.status == 1  # 上架状态
        ).order_by(
            Product.is_recommend.desc(),
            Product.sales.desc()
        ).limit(limit).all()
    
    # 处理结果
    result = []
    for related in related_products:
        merchant = db.query(Merchant).filter(Merchant.id == related.merchant_id).first()
        
        result.append({
            "id": related.id,
            "merchant_id": related.merchant_id,
            "merchant_name": merchant.name if merchant else None,
            "name": related.name,
            "thumbnail": related.thumbnail,
            "original_price": related.original_price,
            "current_price": related.current_price,
            "group_price": related.group_price,
            "sales": related.sales,
            "is_hot": related.is_hot,
            "is_new": related.is_new,
            "is_recommend": related.is_recommend,
            # 添加缺失的时间戳字段
            "created_at": related.created_at,
            "updated_at": related.updated_at
        })
    
    return result




async def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
    """根据ID获取商品"""
    return db.query(Product).filter(Product.id == product_id).first()


async def get_products_by_ids(db: Session, product_ids: List[int]) -> List[Product]:
    """根据ID列表获取商品列表"""
    return db.query(Product).filter(Product.id.in_(product_ids)).all()


async def has_pending_orders(db: Session, product_id: int) -> bool:
    """检查商品是否有未完成的订单"""
    # 检查是否有状态为待支付、待发货、待收货的订单
    pending_statuses = [0, 1, 2]  # 根据实际订单状态定义调整
    
    count = db.query(OrderItem).join(Order).filter(
        and_(
            OrderItem.product_id == product_id,
            Order.status.in_(pending_statuses)
        )
    ).count()
    
    return count > 0


async def has_active_groups(db: Session, product_id: int) -> bool:
    """检查商品是否有进行中的团购活动"""
    # 检查是否有状态为进行中的团购
    active_statuses = [0, 1]  # 根据实际团购状态定义调整
    
    count = db.query(Group).filter(
        and_(
            Group.product_id == product_id,
            Group.status.in_(active_statuses)
        )
    ).count()
    
    return count > 0


async def batch_operation(
    db: Session, 
    operation: str, 
    product_ids: List[int], 
    data: Dict[str, Any],
    merchant_id: int
) -> Dict[str, Any]:
    """批量操作商品"""
    success_count = 0
    failed_count = 0
    
    try:
        if operation == "delete":
            # 批量删除
            result = db.query(Product).filter(
                and_(
                    Product.id.in_(product_ids),
                    Product.merchant_id == merchant_id
                )
            ).delete(synchronize_session=False)
            success_count = result
            
        elif operation == "update_status":
            # 批量更新状态
            status = data.get("status", 1)
            result = db.query(Product).filter(
                and_(
                    Product.id.in_(product_ids),
                    Product.merchant_id == merchant_id
                )
            ).update({"status": status}, synchronize_session=False)
            success_count = result
            
        elif operation == "update_tags":
            # 批量更新标签
            update_data = {}
            if "is_hot" in data:
                update_data["is_hot"] = data["is_hot"]
            if "is_new" in data:
                update_data["is_new"] = data["is_new"]
            if "is_recommend" in data:
                update_data["is_recommend"] = data["is_recommend"]
            
            if update_data:
                result = db.query(Product).filter(
                    and_(
                        Product.id.in_(product_ids),
                        Product.merchant_id == merchant_id
                    )
                ).update(update_data, synchronize_session=False)
                success_count = result
                
        elif operation == "update_category":
            # 批量更新分类（这个比较复杂，需要处理多对多关系）
            category_ids = data.get("category_ids", [])
            if category_ids:
                for product_id in product_ids:
                    product = db.query(Product).filter(
                        and_(
                            Product.id == product_id,
                            Product.merchant_id == merchant_id
                        )
                    ).first()
                    if product:
                        # 清除现有分类关系
                        product.categories.clear()
                        # 添加新的分类关系
                        from app.models.category import Category
                        categories = db.query(Category).filter(
                            Category.id.in_(category_ids)
                        ).all()
                        product.categories.extend(categories)
                        success_count += 1
        
        db.commit()
        
        return {
            "success_count": success_count,
            "failed_count": failed_count,
            "total_count": len(product_ids)
        }
        
    except Exception as e:
        db.rollback()
        raise e


async def get_merchant_product_stats(db: Session, merchant_id: int) -> Dict[str, Any]:
    """获取商户商品统计数据"""
    # 基础统计
    total_products = db.query(Product).filter(Product.merchant_id == merchant_id).count()
    
    # 按状态统计
    on_sale = db.query(Product).filter(
        and_(Product.merchant_id == merchant_id, Product.status == 1)
    ).count()
    
    off_sale = db.query(Product).filter(
        and_(Product.merchant_id == merchant_id, Product.status == 0)
    ).count()
    
    # 按标签统计
    hot_products = db.query(Product).filter(
        and_(Product.merchant_id == merchant_id, Product.is_hot == True)
    ).count()
    
    new_products = db.query(Product).filter(
        and_(Product.merchant_id == merchant_id, Product.is_new == True)
    ).count()
    
    recommend_products = db.query(Product).filter(
        and_(Product.merchant_id == merchant_id, Product.is_recommend == True)
    ).count()
    
    # 库存统计
    low_stock_products = db.query(Product).filter(
        and_(Product.merchant_id == merchant_id, Product.stock < 10)
    ).count()
    
    out_of_stock = db.query(Product).filter(
        and_(Product.merchant_id == merchant_id, Product.stock == 0)
    ).count()
    
    # 销售统计
    total_sales = db.query(func.sum(Product.sales)).filter(
        Product.merchant_id == merchant_id
    ).scalar() or 0
    
    total_views = db.query(func.sum(Product.views)).filter(
        Product.merchant_id == merchant_id
    ).scalar() or 0
    
    # 价格统计
    avg_price = db.query(func.avg(Product.current_price)).filter(
        Product.merchant_id == merchant_id
    ).scalar() or 0
    
    max_price = db.query(func.max(Product.current_price)).filter(
        Product.merchant_id == merchant_id
    ).scalar() or 0
    
    min_price = db.query(func.min(Product.current_price)).filter(
        Product.merchant_id == merchant_id
    ).scalar() or 0
    
    return {
        "basic_stats": {
            "total_products": total_products,
            "on_sale": on_sale,
            "off_sale": off_sale,
        },
        "tag_stats": {
            "hot_products": hot_products,
            "new_products": new_products,
            "recommend_products": recommend_products,
        },
        "stock_stats": {
            "low_stock_products": low_stock_products,
            "out_of_stock": out_of_stock,
            "total_stock": db.query(func.sum(Product.stock)).filter(
                Product.merchant_id == merchant_id
            ).scalar() or 0,
        },
        "sales_stats": {
            "total_sales": total_sales,
            "total_views": total_views,
            "avg_conversion_rate": round((total_sales / total_views * 100) if total_views > 0 else 0, 2),
        },
        "price_stats": {
            "avg_price": round(float(avg_price), 2) if avg_price else 0,
            "max_price": float(max_price) if max_price else 0,
            "min_price": float(min_price) if min_price else 0,
        }
    }


# 需要修改现有的search_products方法，添加min_stock参数支持
async def search_products(
    db: Session,
    keyword: Optional[str] = None,
    category_id: Optional[int] = None,
    merchant_id: Optional[int] = None,
    status: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    is_hot: Optional[bool] = None,
    is_new: Optional[bool] = None,
    is_recommend: Optional[bool] = None,
    has_group: Optional[bool] = None,
    min_stock: Optional[int] = None,  # 新增参数
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 10
):
    """搜索商品"""
    query = db.query(Product)
    
    # 基础过滤条件
    if keyword:
        query = query.filter(Product.name.contains(keyword))
    
    if category_id:
        query = query.join(Product.categories).filter(
            Product.categories.any(id=category_id)
        )
    
    if merchant_id:
        query = query.filter(Product.merchant_id == merchant_id)
    
    if status is not None:
        query = query.filter(Product.status == status)
    
    if min_price is not None:
        query = query.filter(Product.current_price >= min_price)
    
    if max_price is not None:
        query = query.filter(Product.current_price <= max_price)
    
    if is_hot is not None:
        query = query.filter(Product.is_hot == is_hot)
    
    if is_new is not None:
        query = query.filter(Product.is_new == is_new)
    
    if is_recommend is not None:
        query = query.filter(Product.is_recommend == is_recommend)
    
    if has_group is not None:
        if has_group:
            # 有团购活动的商品
            query = query.filter(Product.groups.any())
        else:
            # 没有团购活动的商品
            query = query.filter(~Product.groups.any())
    
    # 新增：库存过滤
    if min_stock is not None:
        if min_stock == -1:  # 库存不足 (<=10)
            query = query.filter(Product.stock <= 10)
        elif min_stock == -2:  # 已售罄 (=0)
            query = query.filter(Product.stock == 0)
        else:  # 库存 >= min_stock
            query = query.filter(Product.stock >= min_stock)
    
    # 排序
    if sort_by and sort_order:
        if hasattr(Product, sort_by):
            order_func = desc if sort_order == "desc" else asc
            query = query.order_by(order_func(getattr(Product, sort_by)))
    else:
        query = query.order_by(desc(Product.created_at))
    
    # 获取总数
    total = query.count()
    
    # 分页
    products = query.offset(skip).limit(limit).all()
    
    return products, total