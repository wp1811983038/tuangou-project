# app/crud/crud_category.py
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.merchant import Category
from app.schemas.merchant import CategoryCreate, CategoryUpdate

class CRUDCategory:
    def get(self, db: Session, id: int) -> Optional[Category]:
        return db.query(Category).filter(Category.id == id).first()
    
    def get_by_name(self, db: Session, *, name: str) -> Optional[Category]:
        return db.query(Category).filter(Category.name == name).first()
    
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100, is_active: Optional[bool] = None
    ) -> List[Category]:
        query = db.query(Category)
        if is_active is not None:
            query = query.filter(Category.is_active == is_active)
        return query.offset(skip).limit(limit).all()
    
    def create(self, db: Session, *, obj_in: CategoryCreate) -> Category:
        db_obj = Category(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self, db: Session, *, db_obj: Category, obj_in: CategoryUpdate
    ) -> Category:
        obj_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, *, id: int) -> bool:
        obj = db.query(Category).filter(Category.id == id).first()
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True

# 创建实例
category = CRUDCategory()