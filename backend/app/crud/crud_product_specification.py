# app/crud/crud_product_specification.py
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.product import ProductSpecification
from app.schemas.product import ProductSpecificationCreate, ProductSpecificationUpdate

class CRUDProductSpecification:
    def get(self, db: Session, id: int) -> Optional[ProductSpecification]:
        return db.query(ProductSpecification).filter(ProductSpecification.id == id).first()
    
    def get_multi_by_product(
        self, db: Session, *, product_id: int
    ) -> List[ProductSpecification]:
        return db.query(ProductSpecification).filter(
            ProductSpecification.product_id == product_id
        ).order_by(ProductSpecification.sort_order).all()
    
    def create(
        self, db: Session, *, obj_in: ProductSpecificationCreate, product_id: int
    ) -> ProductSpecification:
        db_obj = ProductSpecification(**obj_in.dict(), product_id=product_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self, db: Session, *, db_obj: ProductSpecification, obj_in: ProductSpecificationUpdate
    ) -> ProductSpecification:
        obj_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, *, id: int) -> bool:
        obj = db.query(ProductSpecification).filter(ProductSpecification.id == id).first()
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True
    
    def update_specifications(
        self, db: Session, *, product_id: int, specifications: List[ProductSpecificationCreate]
    ) -> List[ProductSpecification]:
        # 删除旧规格
        db.query(ProductSpecification).filter(
            ProductSpecification.product_id == product_id
        ).delete()
        
        # 添加新规格
        db_objs = []
        for spec in specifications:
            db_obj = ProductSpecification(**spec.dict(), product_id=product_id)
            db.add(db_obj)
            db_objs.append(db_obj)
        
        db.commit()
        for obj in db_objs:
            db.refresh(obj)
        
        return db_objs

# 创建实例
product_specification = CRUDProductSpecification()