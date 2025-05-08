# app/crud/crud_address.py
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.user import Address
from app.schemas.user import UserAddressCreate, UserAddressUpdate

class CRUDAddress:
    def get(self, db: Session, id: int) -> Optional[Address]:
        return db.query(Address).filter(Address.id == id).first()
    
    def get_multi_by_user(self, db: Session, *, user_id: int) -> List[Address]:
        return db.query(Address).filter(Address.user_id == user_id).all()
    
    def create(self, db: Session, *, obj_in: UserAddressCreate, user_id: int) -> Address:
        db_obj = Address(**obj_in.dict(), user_id=user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(self, db: Session, *, db_obj: Address, obj_in: UserAddressUpdate) -> Address:
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, *, id: int) -> bool:
        obj = db.query(Address).filter(Address.id == id).first()
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True

# 创建单例实例
address = CRUDAddress()