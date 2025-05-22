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
        
        # 定义安全的数据处理函数，避免None值和类型错误
        def safe_int(value, default=0):
            """安全转换为整数"""
            try:
                return int(value) if value is not None else default
            except (ValueError, TypeError):
                return default
        
        def safe_float(value, default=0.0):
            """安全转换为浮点数"""
            try:
                return float(value) if value is not None else default
            except (ValueError, TypeError):
                return default
        
        def safe_str(value, default=""):
            """安全转换为字符串"""
            return str(value) if value is not None else default
        
        def safe_bool(value, default=False):
            """安全转换为布尔值"""
            try:
                return bool(value) if value is not None else default
            except (ValueError, TypeError):
                return default
        
        def safe_datetime(value):
            """安全处理日期时间"""
            if isinstance(value, datetime):
                return value
            return None
        
        # 安全增加浏览量
        try:
            current_views = safe_int(product.views)
            product.views = current_views + 1
            db.commit()
        except Exception as e:
            print(f"更新浏览量失败: {e}")
            db.rollback()
        
        # 安全获取商户信息
        merchant = None
        merchant_name = ""
        try:
            merchant = db.query(Merchant).filter(Merchant.id == product.merchant_id).first()
            if merchant:
                merchant_name = safe_str(merchant.name)
        except Exception as e:
            print(f"获取商户信息失败: {e}")
        
        # 安全获取商品图片
        images_data = []
        try:
            images = db.query(ProductImage).filter(
                ProductImage.product_id == product_id
            ).order_by(ProductImage.sort_order).all()
            
            for image in images:
                images_data.append({
                    "id": image.id,
                    "image_url": safe_str(image.image_url),
                    "sort_order": safe_int(image.sort_order),
                    "product_id": product_id,
                    "created_at": safe_datetime(image.created_at)
                })
        except Exception as e:
            print(f"获取商品图片失败: {e}")
            images_data = []
        
        # 安全获取商品规格
        specs_data = []
        try:
            specifications = db.query(ProductSpecification).filter(
                ProductSpecification.product_id == product_id
            ).order_by(ProductSpecification.sort_order).all()
            
            for spec in specifications:
                specs_data.append({
                    "id": spec.id,
                    "name": safe_str(spec.name),
                    "value": safe_str(spec.value),
                    "price_adjustment": safe_float(spec.price_adjustment),
                    "stock": safe_int(spec.stock),
                    "sort_order": safe_int(spec.sort_order),
                    "product_id": product_id,
                    "created_at": safe_datetime(spec.created_at),
                    "updated_at": safe_datetime(spec.updated_at)
                })
        except Exception as e:
            print(f"获取商品规格失败: {e}")
            specs_data = []
        
        # 安全获取商品分类
        categories_data = []
        try:
            categories = db.query(Category).join(
                product_categories,
                product_categories.c.category_id == Category.id
            ).filter(
                product_categories.c.product_id == product_id
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
            print(f"获取商品分类失败: {e}")
            categories_data = []
        
        # 安全检查收藏状态
        is_favorite = False
        favorite_count = 0
        try:
            if user_id:
                favorite = db.query(Favorite).filter(
                    Favorite.user_id == user_id,
                    Favorite.product_id == product_id
                ).first()
                is_favorite = bool(favorite)
            
            favorite_count = db.query(func.count(Favorite.id)).filter(
                Favorite.product_id == product_id
            ).scalar() or 0
            favorite_count = safe_int(favorite_count)
        except Exception as e:
            print(f"检查收藏状态失败: {e}")
            is_favorite = False
            favorite_count = 0
        
        # 安全检查团购状态
        has_group = False
        try:
            active_group = db.query(Group).filter(
                Group.product_id == product_id,
                Group.status == 1,  # 进行中
                Group.end_time > datetime.now()
            ).first()
            has_group = bool(active_group)
        except Exception as e:
            print(f"检查团购状态失败: {e}")
            has_group = False
        
        # 构建安全的响应数据，确保所有字段都有合适的默认值
        product_data = {
            "id": product.id,
            "merchant_id": product.merchant_id,
            "merchant_name": merchant_name,
            "name": safe_str(product.name),
            "thumbnail": safe_str(product.thumbnail),
            "original_price": safe_float(product.original_price),
            "current_price": safe_float(product.current_price),
            "group_price": safe_float(product.group_price) if product.group_price is not None else None,
            "stock": safe_int(product.stock),
            "unit": safe_str(product.unit, "件"),
            "description": safe_str(product.description),
            "detail": safe_str(product.detail),
            "sales": safe_int(product.sales),
            "views": safe_int(product.views),
            "status": safe_int(product.status, 1),
            "sort_order": safe_int(product.sort_order),
            "is_hot": safe_bool(product.is_hot),
            "is_new": safe_bool(product.is_new, True),
            "is_recommend": safe_bool(product.is_recommend),
            "has_group": has_group,
            "favorite_count": favorite_count,
            "is_favorite": is_favorite,
            "categories": categories_data,
            "images": images_data,
            "specifications": specs_data,
            "created_at": safe_datetime(product.created_at),
            "updated_at": safe_datetime(product.updated_at)
        }
        
        # 添加调试信息，帮助定位问题
        print(f"成功构建商品数据，商品ID: {product_id}")
        print(f"数据字段数量: {len(product_data)}")
        print(f"分类数量: {len(categories_data)}")
        print(f"图片数量: {len(images_data)}")
        print(f"规格数量: {len(specs_data)}")
        
        return product_data
        
    except HTTPException as e:
        # 重新抛出HTTP异常
        print(f"HTTP异常: {e.detail}")
        raise
    except Exception as e:
        # 记录详细错误并返回友好消息
        import traceback
        error_msg = f"获取商品详情出错，商品ID:{product_id}，错误:{str(e)}"
        print(error_msg)
        print("详细错误信息:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="获取商品详情时发生系统错误")

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
    min_stock: Optional[int] = None,  # 添加 min_stock 参数
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[Dict], int]:
    """搜索商品列表"""
    query = db.query(Product)
    
    # 安全数据处理函数
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
    
    # 筛选条件
    if keyword:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{keyword}%"),
                Product.description.ilike(f"%{keyword}%")
            )
        )
    
    if category_id:
        query = query.join(
            product_categories,
            Product.id == product_categories.c.product_id
        ).filter(product_categories.c.category_id == category_id)
    
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
    
    # 库存筛选
    if min_stock is not None:
        if min_stock == -1:  # 库存不足 (<=10)
            query = query.filter(Product.stock <= 10)
        elif min_stock == -2:  # 已售罄 (=0)
            query = query.filter(Product.stock == 0)
        else:  # 库存 >= min_stock
            query = query.filter(Product.stock >= min_stock)
    
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
    
    # 处理结果 - 关键：转换为字典列表而不是返回 ORM 对象
    result = []
    for product in products:
        try:
            # 获取商户名称
            merchant = None
            try:
                merchant = db.query(Merchant).filter(Merchant.id == product.merchant_id).first()
            except Exception as e:
                print(f"获取商户信息失败: {e}")
            
            # 获取商品分类
            categories_data = []
            try:
                categories = db.query(Category).join(
                    product_categories,
                    product_categories.c.category_id == Category.id
                ).filter(
                    product_categories.c.product_id == product.id
                ).all()
                
                for category in categories:
                    categories_data.append({
                        "id": category.id,
                        "name": safe_str(category.name),
                        "icon": safe_str(category.icon)
                    })
            except Exception as e:
                print(f"获取商品分类失败: {e}")
                categories_data = []
            
            # 检查是否收藏
            is_favorite = False
            favorite_count = 0
            try:
                if user_id:
                    favorite = db.query(Favorite).filter(
                        Favorite.user_id == user_id,
                        Favorite.product_id == product.id
                    ).first()
                    is_favorite = bool(favorite)
                
                favorite_count = db.query(func.count(Favorite.id)).filter(
                    Favorite.product_id == product.id
                ).scalar() or 0
            except Exception as e:
                print(f"检查收藏状态失败: {e}")
                is_favorite = False
                favorite_count = 0
            
            # 检查是否有团购
            has_group = False
            try:
                active_group = db.query(Group).filter(
                    Group.product_id == product.id,
                    Group.status == 1,  # 进行中
                    Group.end_time > datetime.now()
                ).first()
                has_group = bool(active_group)
            except Exception as e:
                print(f"检查团购状态失败: {e}")
                has_group = False
            
            # 构建字典数据 - 这是关键，确保返回字典而不是ORM对象
            product_data = {
                "id": product.id,
                "merchant_id": product.merchant_id,
                "merchant_name": merchant.name if merchant else "",
                "name": safe_str(product.name),
                "thumbnail": safe_str(product.thumbnail),
                "original_price": safe_float(product.original_price),
                "current_price": safe_float(product.current_price),
                "group_price": safe_float(product.group_price) if product.group_price is not None else None,
                "stock": safe_int(product.stock),
                "unit": safe_str(product.unit, "件"),
                "description": safe_str(product.description),
                "sales": safe_int(product.sales),
                "views": safe_int(product.views),
                "status": safe_int(product.status, 1),
                "is_hot": safe_bool(product.is_hot),
                "is_new": safe_bool(product.is_new, True),
                "is_recommend": safe_bool(product.is_recommend),
                "has_group": has_group,
                "favorite_count": safe_int(favorite_count),
                "is_favorite": is_favorite,
                "categories": categories_data,
                "created_at": safe_datetime(product.created_at),
                "updated_at": safe_datetime(product.updated_at)
            }
            
            result.append(product_data)  # 添加字典而不是ORM对象
            
        except Exception as e:
            print(f"处理商品 {product.id} 时出错: {e}")
            continue  # 跳过出错的商品，继续处理其他商品
    
    print(f"成功处理 {len(result)} 个商品，总共 {total} 个")
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