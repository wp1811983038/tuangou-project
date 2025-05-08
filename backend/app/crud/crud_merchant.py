# app/crud/crud_merchant.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.merchant import Merchant, Category, MerchantCategory
from app.schemas.merchant import MerchantCreate, MerchantUpdate

class CRUDMerchant:
    def get(self, db: Session, id: int) -> Optional[Merchant]:
        return db.query(Merchant).filter(Merchant.id == id).first()
    
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[Merchant]:
        return db.query(Merchant).offset(skip).limit(limit).all()
    
    def create(self, db: Session, *, obj_in: MerchantCreate, user_id: int) -> Merchant:
        obj_in_data = obj_in.dict(exclude={"category_ids"})
        db_obj = Merchant(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # 处理分类关联
        category_ids = obj_in.category_ids or []
        for category_id in category_ids:
            merchant_category = MerchantCategory(
                merchant_id=db_obj.id,
                category_id=category_id
            )
            db.add(merchant_category)
        
        db.commit()
        return db_obj
    
    def update(
        self, db: Session, *, db_obj: Merchant, obj_in: MerchantUpdate
    ) -> Merchant:
        obj_data = obj_in.dict(exclude_unset=True, exclude={"category_ids"})
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])
        
        # 处理分类关联
        if obj_in.category_ids is not None:
            # 删除旧关联
            db.query(MerchantCategory).filter(
                MerchantCategory.merchant_id == db_obj.id
            ).delete()
            
            # 添加新关联
            for category_id in obj_in.category_ids:
                merchant_category = MerchantCategory(
                    merchant_id=db_obj.id,
                    category_id=category_id
                )
                db.add(merchant_category)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, *, id: int) -> bool:
        obj = db.query(Merchant).filter(Merchant.id == id).first()
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True

# 创建实例
merchant = CRUDMerchant()