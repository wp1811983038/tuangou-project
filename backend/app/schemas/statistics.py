from datetime import date, datetime
from typing import Dict, List, Optional, Union

from pydantic import BaseModel, Field


class TimeRange(BaseModel):
    """时间范围"""
    start_date: datetime
    end_date: datetime


class StatisticsQueryParams(BaseModel):
    """统计查询参数"""
    start_date: date
    end_date: date
    time_unit: str = "day"  # day, week, month
    merchant_id: Optional[int] = None
    category_id: Optional[int] = None


class SalesStat(BaseModel):
    """销售额统计"""
    date: str
    sales_amount: float = 0
    order_count: int = 0
    avg_order_amount: float = 0


class MerchantStat(BaseModel):
    """商户统计"""
    merchant_id: int
    merchant_name: str
    sales_amount: float = 0
    order_count: int = 0
    product_count: int = 0
    customer_count: int = 0


class ProductStat(BaseModel):
    """商品统计"""
    product_id: int
    product_name: str
    sales_amount: float = 0
    sales_count: int = 0
    view_count: int = 0
    review_count: int = 0
    avg_rating: float = 0


class GroupStat(BaseModel):
    """团购统计"""
    group_id: int
    group_title: str
    participant_count: int = 0
    success_rate: float = 0
    sales_amount: float = 0
    sales_count: int = 0


class UserStat(BaseModel):
    """用户统计"""
    date: str
    new_user_count: int = 0
    active_user_count: int = 0
    total_user_count: int = 0


class StatisticsDashboard(BaseModel):
    """统计仪表盘"""
    total_users: int = 0
    total_merchants: int = 0
    total_orders: int = 0
    total_sales: float = 0
    today_users: int = 0
    today_merchants: int = 0
    today_orders: int = 0
    today_sales: float = 0
    sales_trend: List[SalesStat] = []
    top_merchants: List[MerchantStat] = []
    top_products: List[ProductStat] = []
    user_trend: List[UserStat] = []


class MerchantDashboard(BaseModel):
    """商户仪表盘"""
    total_sales: float = 0
    total_orders: int = 0
    total_products: int = 0
    total_customers: int = 0
    today_sales: float = 0
    today_orders: int = 0
    today_views: int = 0
    sales_trend: List[SalesStat] = []
    top_products: List[ProductStat] = []
    top_groups: List[GroupStat] = []
    order_status_counts: Dict[str, int] = {}