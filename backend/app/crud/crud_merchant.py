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
        
        # 打印调试信息
        print(f"更新前商户数据: {obj_data}")
        
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        print(f"更新字段数据: {update_data}")
        
        # 先处理普通字段，但排除service_radius
        for field in obj_data:
            if field in update_data and field != 'service_radius':
                setattr(db_obj, field, update_data[field])
        
        # 最后单独处理service_radius，确保它不会被覆盖
        if 'service_radius' in update_data and update_data['service_radius'] is not None:
            try:
                # 强制转换为float类型
                radius_value = float(update_data['service_radius'])
                print(f"设置服务半径: {radius_value}, 类型: {type(radius_value)}")
                db_obj.service_radius = radius_value
            except (ValueError, TypeError) as e:
                print(f"服务半径转换错误: {e}")
        
        db.add(db_obj)
        db.commit()
        
        # 提交后立即检查
        db.refresh(db_obj)
        print(f"更新后的服务半径: {db_obj.service_radius}")
        
        # 如果更新失败，使用原始SQL语句强制更新
        if 'service_radius' in update_data and db_obj.service_radius != float(update_data['service_radius']):
            try:
                from sqlalchemy import text
                print(f"服务半径更新失败，尝试使用SQL直接更新...")
                db.execute(
                    text("UPDATE merchants SET service_radius = :radius WHERE id = :id"),
                    {"radius": float(update_data['service_radius']), "id": db_obj.id}
                )
                db.commit()
                db.refresh(db_obj)
                print(f"SQL更新后的服务半径: {db_obj.service_radius}")
            except Exception as e:
                print(f"SQL更新服务半径失败: {str(e)}")
        
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