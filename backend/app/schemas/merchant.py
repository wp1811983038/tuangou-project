from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# 商户创建模型
class MerchantCreate(BaseModel):
    name: str
    logo: Optional[str] = None
    introduction: Optional[str] = None
    business_license: Optional[str] = None
    food_license: Optional[str] = None
    contact_person: str
    contact_phone: str
    password: str
    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    service_radius: Optional[float] = None
    status: int = 1  # 默认为正常状态

# 商户更新模型
class MerchantUpdate(BaseModel):
    name: Optional[str] = None
    logo: Optional[str] = None
    introduction: Optional[str] = None
    business_license: Optional[str] = None
    food_license: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    password: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    service_radius: Optional[float] = None
    status: Optional[int] = None

# 商户状态更新模型
class MerchantStatusUpdate(BaseModel):
    status: int  # -1: 禁用, 0: 待审核, 1: 正常

# 商户信息返回模型
class MerchantInfo(BaseModel):
    merchant_id: int
    name: str
    logo: Optional[str] = None
    introduction: Optional[str] = None
    business_license: Optional[str] = None
    food_license: Optional[str] = None
    contact_person: str
    contact_phone: str
    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    service_radius: Optional[float] = None
    status: int
    create_time: datetime
    update_time: datetime
    
    class Config:
        orm_mode = True

# 商户列表响应模型
class MerchantListData(BaseModel):
    total: int
    items: List[MerchantInfo]

class MerchantListResponse(BaseModel):
    code: int
    msg: str
    data: MerchantListData

# 单个商户响应模型
class MerchantResponse(BaseModel):
    code: int
    msg: str
    data: MerchantInfo