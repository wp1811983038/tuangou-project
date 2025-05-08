from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.merchant import Merchant
from app.utils.auth import get_current_admin
from app.utils.password import get_password_hash
from app.schemas.merchant import (
    MerchantCreate, 
    MerchantUpdate, 
    MerchantResponse, 
    MerchantListResponse,
    MerchantStatusUpdate
)

router = APIRouter()

@router.get("/merchants", response_model=MerchantListResponse)
async def get_merchants(
    skip: int = 0,
    limit: int = 20,
    status: Optional[int] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    获取商户列表，支持分页、状态筛选和关键词搜索
    """
    query = db.query(Merchant)
    
    # 状态筛选
    if status is not None:
        query = query.filter(Merchant.status == status)
    
    # 关键词搜索
    if keyword:
        query = query.filter(
            (Merchant.name.like(f"%{keyword}%")) |
            (Merchant.contact_person.like(f"%{keyword}%")) |
            (Merchant.contact_phone.like(f"%{keyword}%"))
        )
    
    # 获取总数
    total = query.count()
    
    # 分页
    merchants = query.order_by(Merchant.create_time.desc()).offset(skip).limit(limit).all()
    
    return {
        "code": 0,
        "msg": "成功",
        "data": {
            "total": total,
            "items": merchants
        }
    }

@router.get("/merchants/{merchant_id}", response_model=MerchantResponse)
async def get_merchant_detail(
    merchant_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    获取商户详情
    """
    merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商户不存在"
        )
    
    return {
        "code": 0,
        "msg": "成功",
        "data": merchant
    }

@router.post("/merchants", response_model=MerchantResponse)
async def create_merchant(
    merchant_data: MerchantCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    添加新商户
    """
    # 检查手机号是否已注册
    existing_merchant = db.query(Merchant).filter(Merchant.contact_phone == merchant_data.contact_phone).first()
    if existing_merchant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该手机号已被注册"
        )
    
    # 创建新商户
    merchant = Merchant(
        name=merchant_data.name,
        logo=merchant_data.logo,
        introduction=merchant_data.introduction,
        business_license=merchant_data.business_license,
        food_license=merchant_data.food_license,
        contact_person=merchant_data.contact_person,
        contact_phone=merchant_data.contact_phone,
        password=get_password_hash(merchant_data.password),
        province=merchant_data.province,
        city=merchant_data.city,
        district=merchant_data.district,
        address=merchant_data.address,
        latitude=merchant_data.latitude,
        longitude=merchant_data.longitude,
        service_radius=merchant_data.service_radius,
        status=merchant_data.status
    )
    
    db.add(merchant)
    db.commit()
    db.refresh(merchant)
    
    return {
        "code": 0,
        "msg": "商户创建成功",
        "data": merchant
    }

@router.put("/merchants/{merchant_id}", response_model=MerchantResponse)
async def update_merchant(
    merchant_id: int,
    merchant_data: MerchantUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    更新商户信息
    """
    merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商户不存在"
        )
    
    # 检查手机号是否已被其他商户使用
    if merchant_data.contact_phone and merchant_data.contact_phone != merchant.contact_phone:
        existing_merchant = db.query(Merchant).filter(
            Merchant.contact_phone == merchant_data.contact_phone,
            Merchant.merchant_id != merchant_id
        ).first()
        if existing_merchant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该手机号已被其他商户使用"
            )
    
    # 更新字段
    update_data = merchant_data.dict(exclude_unset=True)
    
    # 如果包含密码更新，需要加密
    if "password" in update_data and update_data["password"]:
        update_data["password"] = get_password_hash(update_data["password"])
    
    for key, value in update_data.items():
        setattr(merchant, key, value)
    
    db.commit()
    db.refresh(merchant)
    
    return {
        "code": 0,
        "msg": "商户信息更新成功",
        "data": merchant
    }

@router.patch("/merchants/{merchant_id}/status", response_model=MerchantResponse)
async def update_merchant_status(
    merchant_id: int,
    status_data: MerchantStatusUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    更新商户状态（审核通过/拒绝/禁用/启用）
    """
    merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商户不存在"
        )
    
    # 更新状态
    merchant.status = status_data.status
    db.commit()
    db.refresh(merchant)
    
    status_text = {
        -1: "已禁用",
        0: "待审核",
        1: "已启用"
    }.get(status_data.status, "状态已更新")
    
    return {
        "code": 0,
        "msg": f"商户{status_text}",
        "data": merchant
    }

@router.delete("/merchants/{merchant_id}")
async def delete_merchant(
    merchant_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    删除商户
    """
    merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商户不存在"
        )
    
    db.delete(merchant)
    db.commit()
    
    return {
        "code": 0,
        "msg": "商户删除成功",
        "data": None
    }