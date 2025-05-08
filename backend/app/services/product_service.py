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


async def get_product(db: Session, product_id: int, user_id: Optional[int] = None) -> Dict:
    """获取单个商品详情"""
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
    
    # 获取商品分类
    categories = db.query(Category).join(
        product_categories,
        product_categories.c.category_id == Category.id
    ).filter(
        product_categories.c.product_id == product_id
    ).all()
    
    # 检查是否收藏
    is_favorite = False
    if user_id:
        favorite = db.query(Favorite).filter(
            Favorite.user_id == user_id,
            Favorite.product_id == product_id
        ).first()
        if favorite:
            is_favorite = True
    
    # 检查是否有团购
    has_group = False
    active_group = db.query(Group).filter(
        Group.product_id == product_id,
        Group.status == 1,  # 进行中
        Group.end_time > datetime.now()
    ).first()
    if active_group:
        has_group = True
    
    # 收藏数量
    favorite_count = db.query(func.count(Favorite.id)).filter(
        Favorite.product_id == product_id
    ).scalar() or 0
    
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
        "categories": [
            {
                "id": category.id,
                "name": category.name,
                "icon": category.icon
            } for category in categories
        ],
        "images": [
            {
                "id": image.id,
                "image_url": image.image_url,
                "sort_order": image.sort_order
            } for image in images
        ],
        "specifications": [
            {
                "id": spec.id,
                "name": spec.name,
                "value": spec.value,
                "price_adjustment": spec.price_adjustment,
                "stock": spec.stock,
                "sort_order": spec.sort_order
            } for spec in specifications
        ],
        "created_at": product.created_at,
        "updated_at": product.updated_at
    }


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
    
    product = crud_product.create(db, obj_in=product_dict)
    
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
            "is_recommend": related.is_recommend
        })
    
    return result