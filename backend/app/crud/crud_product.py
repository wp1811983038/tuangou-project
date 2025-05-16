# app/crud/crud_product.py
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Dict, Any, Union

from app.models.product import Product, product_categories
from app.schemas.product import ProductCreate, ProductUpdate

class CRUDProduct:
    def get(self, db: Session, id: int) -> Optional[Product]:
        return db.query(Product).filter(Product.id == id).first()
    
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[Product]:
        return db.query(Product).offset(skip).limit(limit).all()
    
    def create(self, db: Session, *, obj_in: Union[ProductCreate, Dict[str, Any]], merchant_id: int) -> Product:
    # 检查是否是字典类型
        if isinstance(obj_in, dict):
            obj_in_data = obj_in.copy()  # 复制字典以避免修改原始数据
            # 移除已存在的merchant_id，防止重复
            obj_in_data.pop('merchant_id', None)
        else:
            obj_in_data = obj_in.dict(exclude={"category_ids", "images", "specifications", "merchant_id"})
        
        # 创建商品，添加merchant_id
        db_obj = Product(**obj_in_data, merchant_id=merchant_id)
        db.add(db_obj)
        db.flush()  # 获取商品ID
        
        # 处理分类关联
        category_ids = obj_in.get("category_ids", []) if isinstance(obj_in, dict) else obj_in.category_ids or []
        for category_id in category_ids:
            stmt = product_categories.insert().values(
                product_id=db_obj.id,
                category_id=category_id
            )
            db.execute(stmt)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(self, db: Session, *, db_obj: Product, obj_in: Union[ProductUpdate, Dict[str, Any]]) -> Product:
        """更新商品"""
        # 处理字典输入
        if isinstance(obj_in, dict):
            obj_data = obj_in.copy()
            category_ids = obj_data.pop("category_ids", None)
        else:
            obj_data = obj_in.dict(exclude_unset=True, exclude={"category_ids"})
            category_ids = obj_in.category_ids if hasattr(obj_in, "category_ids") else None
        
        # 更新普通字段
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])
        
        # 如果提供了分类ID，更新分类关联
        if category_ids is not None:
            # 删除现有关联
            db.execute(product_categories.delete().where(
                product_categories.c.product_id == db_obj.id
            ))
            
            # 添加新关联
            for category_id in category_ids:
                stmt = product_categories.insert().values(
                    product_id=db_obj.id,
                    category_id=category_id
                )
                db.execute(stmt)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, *, id: int) -> bool:
        obj = db.query(Product).filter(Product.id == id).first()
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True
    
    def search(
        self, 
        db: Session, 
        *, 
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
        skip: int = 0, 
        limit: int = 100
    ) -> Tuple[List[Product], int]:
        query = db.query(Product)
        
        # 应用筛选条件
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
        
        # 计算总数
        total = query.count()
        
        # 应用分页
        products = query.offset(skip).limit(limit).all()
        
        return products, total

# 创建实例
product = CRUDProduct()