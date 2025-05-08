# app/crud/crud_user.py
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.user import User, Address, Favorite
from app.schemas.user import UserCreate, UserUpdate

class CRUDUser:
    def get(self, db: Session, id: int) -> Optional[User]:
        return db.query(User).filter(User.id == id).first()
    
    def get_by_open_id(self, db: Session, open_id: str) -> Optional[User]:
        return db.query(User).filter(User.open_id == open_id).first()
    
    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        db_obj = User(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(self, db: Session, *, db_obj: User, obj_in: UserUpdate) -> User:
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

# 创建单例实例
user = CRUDUser()