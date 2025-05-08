from datetime import datetime
from typing import Dict, List, Optional, Union

from pydantic import BaseModel, EmailStr, Field, validator

from app.schemas.common import PaginationParams


class AdminBase(BaseModel):
    """管理员基础信息"""
    username: str
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    role: str = "operator"  # admin-超级管理员, operator-运营
    permissions: Optional[Dict[str, List[str]]] = None


class AdminCreate(AdminBase):
    """创建管理员请求模型"""
    password: str = Field(..., min_length=6, max_length=32)


class AdminUpdate(BaseModel):
    """更新管理员请求模型"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[Dict[str, List[str]]] = None
    is_active: Optional[bool] = None


class AdminInDB(AdminBase):
    """数据库中的管理员模型"""
    id: int
    hashed_password: str
    is_active: bool = True
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Admin(AdminBase):
    """管理员响应模型"""
    id: int
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdminLoginRequest(BaseModel):
    """管理员登录请求模型"""
    username: str
    password: str = Field(..., min_length=6, max_length=32)


class AdminPasswordChangeRequest(BaseModel):
    """管理员密码修改请求模型"""
    old_password: str = Field(..., min_length=6, max_length=32)
    new_password: str = Field(..., min_length=6, max_length=32)
    confirm_password: str = Field(..., min_length=6, max_length=32)

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('两次输入的新密码不匹配')
        return v


class SystemConfigBase(BaseModel):
    """系统配置基础信息"""
    key: str
    value: str
    description: Optional[str] = None


class SystemConfigCreate(SystemConfigBase):
    """创建系统配置请求模型"""
    pass


class SystemConfigUpdate(BaseModel):
    """更新系统配置请求模型"""
    value: str
    description: Optional[str] = None


class SystemConfig(SystemConfigBase):
    """系统配置响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SystemConfigBatchUpdateRequest(BaseModel):
    """批量更新系统配置请求模型"""
    configs: Dict[str, str]


class BannerBase(BaseModel):
    """轮播图基础信息"""
    title: str
    image_url: str
    link_type: str  # product-商品, group-团购, url-网址
    link_id: Optional[int] = None
    link_url: Optional[str] = None
    position: str = "home"  # home-首页, category-分类页
    sort_order: int = 0
    is_active: bool = True
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class BannerCreate(BannerBase):
    """创建轮播图请求模型"""
    @validator('link_url')
    def validate_link_url(cls, v, values):
        if values.get('link_type') == 'url' and not v:
            raise ValueError('链接类型为网址时，链接URL不能为空')
        return v

    @validator('link_id')
    def validate_link_id(cls, v, values):
        if values.get('link_type') in ['product', 'group'] and not v:
            raise ValueError('链接类型为商品或团购时，链接ID不能为空')
        return v


class BannerUpdate(BaseModel):
    """更新轮播图请求模型"""
    title: Optional[str] = None
    image_url: Optional[str] = None
    link_type: Optional[str] = None
    link_id: Optional[int] = None
    link_url: Optional[str] = None
    position: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class Banner(BannerBase):
    """轮播图响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BannerQueryParams(PaginationParams):
    """轮播图查询参数"""
    position: Optional[str] = None
    is_active: Optional[bool] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None


class NoticeBase(BaseModel):
    """公告基础信息"""
    title: str
    content: str
    type: str = "system"  # system-系统公告, activity-活动公告
    is_popup: bool = False
    is_top: bool = False
    is_active: bool = True
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class NoticeCreate(NoticeBase):
    """创建公告请求模型"""
    pass


class NoticeUpdate(BaseModel):
    """更新公告请求模型"""
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    is_popup: Optional[bool] = None
    is_top: Optional[bool] = None
    is_active: Optional[bool] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class Notice(NoticeBase):
    """公告响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NoticeQueryParams(PaginationParams):
    """公告查询参数"""
    type: Optional[str] = None
    is_active: Optional[bool] = None
    is_popup: Optional[bool] = None
    is_top: Optional[bool] = None
    keyword: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None


class StatDashboard(BaseModel):
    """仪表盘统计数据"""
    user_count: int = 0
    merchant_count: int = 0
    order_count: int = 0
    order_amount: float = 0
    today_user_count: int = 0
    today_merchant_count: int = 0
    today_order_count: int = 0
    today_order_amount: float = 0
    order_stats: Dict[str, int] = {}
    sales_trend: List[Dict[str, Union[str, int, float]]] = []