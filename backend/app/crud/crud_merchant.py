# app/crud/crud_merchant.py
from typing import List, Optional, Dict, Any, Union
from fastapi.encoders import jsonable_encoder
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
    
    def update(self, db: Session, *, db_obj: Merchant, obj_in: Union[MerchantUpdate, Dict[str, Any]]) -> Merchant:
        """更新商户"""
        obj_data = jsonable_encoder(db_obj)
        
        # 打印调试信息，查看更新前数据
        print(f"更新前商户数据: {obj_data}")
        
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        # 打印要更新的字段
        print(f"更新字段数据: {update_data}")
        
        # 特别处理服务半径字段
        if 'service_radius' in update_data and update_data['service_radius'] is not None:
            db_obj.service_radius = float(update_data['service_radius'])
            print(f"服务半径已设置为: {db_obj.service_radius}")
        
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        
        # 特别处理服务半径字段
        if 'service_radius' in update_data and update_data['service_radius'] is not None:
            db_obj.service_radius = float(update_data['service_radius'])
            print(f"服务半径已设置为: {db_obj.service_radius}")
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # 打印更新后的数据
        print(f"更新后商户数据: {jsonable_encoder(db_obj)}")
        
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