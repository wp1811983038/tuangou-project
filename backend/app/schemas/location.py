from typing import List, Optional

from pydantic import BaseModel, Field


class Coordinate(BaseModel):
    """坐标模型"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class LocationSearchParams(BaseModel):
    """位置搜索参数"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    keyword: Optional[str] = None
    radius: float = Field(5.0, ge=0.1, le=50)  # km
    type: Optional[str] = None  # 如果使用第三方地图API，可以指定POI类型


class LocationSearchResult(BaseModel):
    """位置搜索结果"""
    id: str
    name: str
    address: str
    province: str
    city: str
    district: str
    latitude: float
    longitude: float
    distance: float  # km
    type: Optional[str] = None


class RegionBase(BaseModel):
    """区域基础信息"""
    code: str
    name: str
    level: int  # 1-省, 2-市, 3-区县
    parent_code: Optional[str] = None


class Region(RegionBase):
    """区域响应模型"""
    id: int
    children: Optional[List["Region"]] = None

    class Config:
        from_attributes = True


class DeliveryAreaBase(BaseModel):
    """配送区域基础信息"""
    name: str
    province: str
    city: str
    district: str
    freight: float = 0.0
    min_amount: float = 0.0  # 满额免邮
    is_active: bool = True


class DeliveryAreaCreate(DeliveryAreaBase):
    """创建配送区域请求模型"""
    merchant_id: int


class DeliveryAreaUpdate(BaseModel):
    """更新配送区域请求模型"""
    name: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    freight: Optional[float] = None
    min_amount: Optional[float] = None
    is_active: Optional[bool] = None


class DeliveryArea(DeliveryAreaBase):
    """配送区域响应模型"""
    id: int
    merchant_id: int

    class Config:
        from_attributes = True


class DistanceCalculationRequest(BaseModel):
    """距离计算请求模型"""
    start_latitude: float = Field(..., ge=-90, le=90)
    start_longitude: float = Field(..., ge=-180, le=180)
    end_latitude: float = Field(..., ge=-90, le=90)
    end_longitude: float = Field(..., ge=-180, le=180)


class DistanceCalculationResponse(BaseModel):
    """距离计算响应模型"""
    distance: float  # km
    duration: Optional[int] = None  # 秒


class GeocodeRequest(BaseModel):
    """地址转经纬度请求模型"""
    address: str = Field(..., description="完整地址")
    # 可选参数，可以指定省市区
    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None

class GeocodeResponse(BaseModel):
    """地址转经纬度响应模型"""
    latitude: float
    longitude: float
    address: str
    formatted_address: str
    province: str
    city: str
    district: str
    adcode: str
    confidence: Optional[int] = None  # 匹配程度，腾讯地图API返回


