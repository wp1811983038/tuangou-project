from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import timedelta
from app.utils.auth import create_token
from app.utils.password import verify_password
from app.config import settings
from app.database import get_db
from app.models.merchant import Merchant
from pydantic import BaseModel

router = APIRouter()

# 商户登录请求模型
class MerchantLoginRequest(BaseModel):
    phone: str
    password: str

@router.post("/login")
async def merchant_login(request: MerchantLoginRequest, db: Session = Depends(get_db)):
    """
    商户登录
    """
    # 从数据库查询商户信息
    merchant = db.query(Merchant).filter(Merchant.contact_phone == request.phone).first()
    
    # 验证商户是否存在及密码是否正确
    if not merchant or not verify_password(request.password, merchant.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="手机号或密码错误"
        )
    
    # 验证商户状态
    if merchant.status != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="商户账号未审核通过或已被禁用"
        )
    
    # 更新最后登录时间
    merchant.update_time = func.now()
    db.commit()
    
    # 创建token
    token_data = {
        "sub": str(merchant.merchant_id),
        "phone": merchant.contact_phone,
        "role": "merchant"
    }
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_token(token_data, expires)
    
    # 构建商户信息
    merchantInfo = {
        "merchantId": merchant.merchant_id,
        "name": merchant.name,
        "logo": merchant.logo,
        "phone": merchant.contact_phone,
        "contactPerson": merchant.contact_person,
        "address": f"{merchant.province}{merchant.city}{merchant.district}{merchant.address}"
    }
    
    return {
        "code": 0,
        "msg": "登录成功",
        "data": {
            "token": token,
            "merchantInfo": merchantInfo
        }
    }

# 商户注册请求模型
class MerchantRegisterRequest(BaseModel):
    name: str
    contactPerson: str
    phone: str
    password: str
    confirmPassword: str
    businessLicense: str  # 营业执照图片URL

@router.post("/register")
async def merchant_register(request: MerchantRegisterRequest, db: Session = Depends(get_db)):
    """
    商户注册
    """
    # 验证密码
    if request.password != request.confirmPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="两次输入的密码不一致"
        )
    
    # 检查手机号是否已注册
    existing_merchant = db.query(Merchant).filter(Merchant.contact_phone == request.phone).first()
    if existing_merchant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该手机号已注册"
        )
    
    # 创建新商户
    merchant = Merchant(
        name=request.name,
        contact_person=request.contactPerson,
        contact_phone=request.phone,
        password=get_password_hash(request.password),  # 加密密码
        business_license=request.businessLicense,
        status=0  # 待审核状态
    )
    
    db.add(merchant)
    db.commit()
    db.refresh(merchant)
    
    return {
        "code": 0,
        "msg": "注册成功，请等待管理员审核",
        "data": {
            "merchantId": merchant.merchant_id
        }
    }