# app/crud/crud_product_image.py
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.product import ProductImage
from app.schemas.product import ProductImageCreate, ProductImageUpdate

class CRUDProductImage:
    def get(self, db: Session, id: int) -> Optional[ProductImage]:
        return db.query(ProductImage).filter(ProductImage.id == id).first()
    
    def get_multi_by_product(
        self, db: Session, *, product_id: int
    ) -> List[ProductImage]:
        return db.query(ProductImage).filter(
            ProductImage.product_id == product_id
        ).order_by(ProductImage.sort_order).all()
    
    def create(self, db: Session, *, obj_in: ProductImageCreate, product_id: int) -> ProductImage:
        db_obj = ProductImage(**obj_in.dict(), product_id=product_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self, db: Session, *, db_obj: ProductImage, obj_in: ProductImageUpdate
    ) -> ProductImage:
        obj_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, *, id: int) -> bool:
        obj = db.query(ProductImage).filter(ProductImage.id == id).first()
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True
    
    def update_images(
        self, db: Session, *, product_id: int, images: List[ProductImageCreate]
    ) -> List[ProductImage]:
        # 删除旧图片
        db.query(ProductImage).filter(
            ProductImage.product_id == product_id
        ).delete()
        
        # 添加新图片
        db_objs = []
        for image in images:
            db_obj = ProductImage(**image.dict(), product_id=product_id)
            db.add(db_obj)
            db_objs.append(db_obj)
        
        db.commit()
        for obj in db_objs:
            db.refresh(obj)
        
        return db_objs

# 创建实例
product_image = CRUDProductImage()