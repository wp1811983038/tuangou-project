from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple, Any

from fastapi import HTTPException, status
from sqlalchemy import func, desc, asc, text
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.group import Group
from app.models.order import Order
from app.models.review import Review


async def get_admin_dashboard(db: Session) -> Dict:
    """获取管理员仪表盘数据"""
    # 用户总数
    total_users = db.query(func.count(User.id)).scalar() or 0
    
    # 商户总数
    total_merchants = db.query(func.count(Merchant.id)).scalar() or 0
    
    # 订单总数
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    
    # 销售总额
    total_sales = db.query(func.sum(Order.actual_amount)).filter(
        Order.status.in_([1, 2, 3])  # 已支付、已发货、已完成
    ).scalar() or 0
    
    # 今日数据
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    # 今日新增用户
    today_users = db.query(func.count(User.id)).filter(
        User.created_at.between(today_start, today_end)
    ).scalar() or 0
    
    # 今日新增商户
    today_merchants = db.query(func.count(Merchant.id)).filter(
        Merchant.created_at.between(today_start, today_end)
    ).scalar() or 0
    
    # 今日订单数
    today_orders = db.query(func.count(Order.id)).filter(
        Order.created_at.between(today_start, today_end)
    ).scalar() or 0
    
    # 今日销售额
    today_sales = db.query(func.sum(Order.actual_amount)).filter(
        Order.status.in_([1, 2, 3]),  # 已支付、已发货、已完成
        Order.created_at.between(today_start, today_end)
    ).scalar() or 0
    
    # 销售趋势（最近7天）
    sales_trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        day_orders = db.query(func.count(Order.id)).filter(
            Order.created_at.between(day_start, day_end)
        ).scalar() or 0
        
        day_sales = db.query(func.sum(Order.actual_amount)).filter(
            Order.status.in_([1, 2, 3]),  # 已支付、已发货、已完成
            Order.created_at.between(day_start, day_end)
        ).scalar() or 0
        
        sales_trend.append({
            "date": day.strftime("%Y-%m-%d"),
            "orders": day_orders,
            "sales": float(day_sales)
        })
    
    # 热门商户
    top_merchants = db.query(
        Merchant.id,
        Merchant.name,
        func.count(Order.id).label("order_count"),
        func.sum(Order.actual_amount).label("sales_amount")
    ).join(
        Order, Order.merchant_id == Merchant.id
    ).filter(
        Order.status.in_([1, 2, 3])  # 已支付、已发货、已完成
    ).group_by(
        Merchant.id
    ).order_by(
        func.sum(Order.actual_amount).desc()
    ).limit(5).all()
    
    # 热门商品
    top_products = db.query(
        Product.id,
        Product.name,
        Product.thumbnail,
        func.count(OrderItem.id).label("sales_count"),
        func.sum(OrderItem.subtotal).label("sales_amount")
    ).join(
        OrderItem, OrderItem.product_id == Product.id
    ).join(
        Order, Order.id == OrderItem.order_id
    ).filter(
        Order.status.in_([1, 2, 3])  # 已支付、已发货、已完成
    ).group_by(
        Product.id
    ).order_by(
        func.sum(OrderItem.subtotal).desc()
    ).limit(5).all()
    
    # 用户趋势（最近7天）
    user_trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        # 新增用户
        new_users = db.query(func.count(User.id)).filter(
            User.created_at.between(day_start, day_end)
        ).scalar() or 0
        
        # 活跃用户（下单用户）
        active_users = db.query(func.count(func.distinct(Order.user_id))).filter(
            Order.created_at.between(day_start, day_end)
        ).scalar() or 0
        
        # 累计用户
        total_users_day = db.query(func.count(User.id)).filter(
            User.created_at <= day_end
        ).scalar() or 0
        
        user_trend.append({
            "date": day.strftime("%Y-%m-%d"),
            "new_user_count": new_users,
            "active_user_count": active_users,
            "total_user_count": total_users_day
        })
    
    return {
        "total_users": total_users,
        "total_merchants": total_merchants,
        "total_orders": total_orders,
        "total_sales": float(total_sales),
        "today_users": today_users,
        "today_merchants": today_merchants,
        "today_orders": today_orders,
        "today_sales": float(today_sales),
        "sales_trend": sales_trend,
        "top_merchants": [
            {
                "merchant_id": m.id,
                "merchant_name": m.name,
                "order_count": m.order_count,
                "sales_amount": float(m.sales_amount or 0)
            } for m in top_merchants
        ],
        "top_products": [
            {
                "product_id": p.id,
                "product_name": p.name,
                "product_image": p.thumbnail,
                "sales_count": p.sales_count,
                "sales_amount": float(p.sales_amount or 0)
            } for p in top_products
        ],
        "user_trend": user_trend
    }


async def get_merchant_dashboard(db: Session, merchant_id: int) -> Dict:
    """获取商户仪表盘数据"""
    # 检查商户是否存在
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    
    # 销售总额
    total_sales = db.query(func.sum(Order.actual_amount)).filter(
        Order.merchant_id == merchant_id,
        Order.status.in_([1, 2, 3])  # 已支付、已发货、已完成
    ).scalar() or 0
    
    # 订单总数
    total_orders = db.query(func.count(Order.id)).filter(
        Order.merchant_id == merchant_id
    ).scalar() or 0
    
    # 商品总数
    total_products = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id
    ).scalar() or 0
    
    # 客户总数
    total_customers = db.query(func.count(func.distinct(Order.user_id))).filter(
        Order.merchant_id == merchant_id
    ).scalar() or 0
    
    # 今日数据
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    # 今日销售额
    today_sales = db.query(func.sum(Order.actual_amount)).filter(
        Order.merchant_id == merchant_id,
        Order.status.in_([1, 2, 3]),  # 已支付、已发货、已完成
        Order.created_at.between(today_start, today_end)
    ).scalar() or 0
    
    # 今日订单数
    today_orders = db.query(func.count(Order.id)).filter(
        Order.merchant_id == merchant_id,
        Order.created_at.between(today_start, today_end)
    ).scalar() or 0
    
    # 今日商品浏览量
    today_views = db.query(func.sum(Product.views)).filter(
        Product.merchant_id == merchant_id
    ).scalar() or 0
    
    # 销售趋势（最近7天）
    sales_trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        day_orders = db.query(func.count(Order.id)).filter(
            Order.merchant_id == merchant_id,
            Order.created_at.between(day_start, day_end)
        ).scalar() or 0
        
        day_sales = db.query(func.sum(Order.actual_amount)).filter(
            Order.merchant_id == merchant_id,
            Order.status.in_([1, 2, 3]),  # 已支付、已发货、已完成
            Order.created_at.between(day_start, day_end)
        ).scalar() or 0
        
        sales_trend.append({
            "date": day.strftime("%Y-%m-%d"),
            "orders": day_orders,
            "sales": float(day_sales)
        })
    
    # 热门商品
    top_products = db.query(
        Product.id,
        Product.name,
        Product.thumbnail,
        func.count(OrderItem.id).label("sales_count"),
        func.sum(OrderItem.subtotal).label("sales_amount")
    ).join(
        OrderItem, OrderItem.product_id == Product.id
    ).join(
        Order, Order.id == OrderItem.order_id
    ).filter(
        Product.merchant_id == merchant_id,
        Order.status.in_([1, 2, 3])  # 已支付、已发货、已完成
    ).group_by(
        Product.id
    ).order_by(
        func.sum(OrderItem.subtotal).desc()
    ).limit(5).all()
    
    # 热门团购
    top_groups = db.query(
        Group.id,
        Group.title,
        func.count(Order.id).label("order_count"),
        func.sum(Order.actual_amount).label("sales_amount")
    ).join(
        Order, Order.group_id == Group.id
    ).filter(
        Group.merchant_id == merchant_id,
        Order.status.in_([1, 2, 3])  # 已支付、已发货、已完成
    ).group_by(
        Group.id
    ).order_by(
        func.sum(Order.actual_amount).desc()
    ).limit(5).all()
    
    # 订单状态统计
    order_status_counts = {}
    for status in range(6):  # 0-5
        count = db.query(func.count(Order.id)).filter(
            Order.merchant_id == merchant_id,
            Order.status == status
        ).scalar() or 0
        order_status_counts[str(status)] = count
    
    return {
        "total_sales": float(total_sales),
        "total_orders": total_orders,
        "total_products": total_products,
        "total_customers": total_customers,
        "today_sales": float(today_sales),
        "today_orders": today_orders,
        "today_views": today_views,
        "sales_trend": sales_trend,
        "top_products": [
            {
                "id": p.id,
                "name": p.name,
                "thumbnail": p.thumbnail,
                "sales_count": p.sales_count,
                "sales_amount": float(p.sales_amount or 0)
            } for p in top_products
        ],
        "top_groups": [
            {
                "id": g.id,
                "title": g.title,
                "order_count": g.order_count,
                "sales_amount": float(g.sales_amount or 0)
            } for g in top_groups
        ],
        "order_status_counts": order_status_counts
    }


async def get_sales_stats(
    db: Session,
    start_date: date,
    end_date: date,
    merchant_id: Optional[int] = None,
    time_unit: str = "day"
) -> List[Dict]:
    """获取销售统计数据"""
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="结束日期不能早于开始日期")
    
    # 根据时间单位选择日期格式
    if time_unit == "day":
        date_format = "%Y-%m-%d"
        interval = "day"
    elif time_unit == "week":
        date_format = "%Y-%u"  # ISO周，%u是周几(1-7)
        interval = "week"
    elif time_unit == "month":
        date_format = "%Y-%m"
        interval = "month"
    else:
        raise HTTPException(status_code=400, detail="不支持的时间单位")
    
    # 将日期转换为datetime
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    # 构建查询
    query = db.query(
        func.date_format(Order.created_at, date_format).label("date"),
        func.count(Order.id).label("order_count"),
        func.sum(Order.actual_amount).label("sales_amount")
    ).filter(
        Order.status.in_([1, 2, 3]),  # 已支付、已发货、已完成
        Order.created_at.between(start_datetime, end_datetime)
    )
    
    if merchant_id:
        query = query.filter(Order.merchant_id == merchant_id)
    
    # 按日期分组
    query = query.group_by(func.date_format(Order.created_at, date_format))
    
    # 按日期排序
    query = query.order_by(func.date_format(Order.created_at, date_format))
    
    # 执行查询
    results = query.all()
    
    # 处理结果
    stats = []
    for result in results:
        avg_order_amount = result.sales_amount / result.order_count if result.order_count > 0 else 0
        
        stats.append({
            "date": result.date,
            "order_count": result.order_count,
            "sales_amount": float(result.sales_amount or 0),
            "avg_order_amount": float(avg_order_amount)
        })
    
    return stats


async def get_merchant_stats(
    db: Session,
    start_date: date,
    end_date: date,
    category_id: Optional[int] = None,
    limit: int = 10
) -> List[Dict]:
    """获取商户统计数据"""
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="结束日期不能早于开始日期")
    
    # 将日期转换为datetime
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    # 构建查询
    query = db.query(
        Merchant.id,
        Merchant.name,
        func.count(Order.id).label("order_count"),
        func.sum(Order.actual_amount).label("sales_amount"),
        func.count(func.distinct(Order.user_id)).label("customer_count"),
        func.count(func.distinct(Product.id)).label("product_count")
    ).join(
        Order, Order.merchant_id == Merchant.id
    ).outerjoin(
        Product, Product.merchant_id == Merchant.id
    ).filter(
        Order.status.in_([1, 2, 3]),  # 已支付、已发货、已完成
        Order.created_at.between(start_datetime, end_datetime)
    )
    
    if category_id:
        query = query.join(
            MerchantCategory, MerchantCategory.merchant_id == Merchant.id
        ).filter(
            MerchantCategory.category_id == category_id
        )
    
    # 分组和排序
    query = query.group_by(Merchant.id).order_by(func.sum(Order.actual_amount).desc()).limit(limit)
    
    # 执行查询
    results = query.all()
    
    # 处理结果
    stats = []
    for result in results:
        stats.append({
            "merchant_id": result.id,
            "merchant_name": result.name,
            "order_count": result.order_count,
            "sales_amount": float(result.sales_amount or 0),
            "customer_count": result.customer_count,
            "product_count": result.product_count
        })
    
    return stats


async def get_product_stats(
    db: Session,
    start_date: date,
    end_date: date,
    merchant_id: Optional[int] = None,
    category_id: Optional[int] = None,
    limit: int = 10
) -> List[Dict]:
    """获取商品统计数据"""
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="结束日期不能早于开始日期")
    
    # 将日期转换为datetime
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    # 构建查询
    query = db.query(
        Product.id,
        Product.name,
        Product.thumbnail,
        func.sum(OrderItem.quantity).label("sales_count"),
        func.sum(OrderItem.subtotal).label("sales_amount"),
        func.count(func.distinct(Order.id)).label("order_count"),
        Product.views.label("view_count"),
        func.avg(Review.rating).label("avg_rating")
    ).join(
        OrderItem, OrderItem.product_id == Product.id
    ).join(
        Order, Order.id == OrderItem.order_id
    ).outerjoin(
        Review, Review.product_id == Product.id
    ).filter(
        Order.status.in_([1, 2, 3]),  # 已支付、已发货、已完成
        Order.created_at.between(start_datetime, end_datetime)
    )
    
    if merchant_id:
        query = query.filter(Product.merchant_id == merchant_id)
    
    if category_id:
        query = query.join(
            product_categories,
            product_categories.c.product_id == Product.id
        ).filter(
            product_categories.c.category_id == category_id
        )
    
    # 分组和排序
    query = query.group_by(Product.id).order_by(func.sum(OrderItem.subtotal).desc()).limit(limit)
    
    # 执行查询
    results = query.all()
    
    # 处理结果
    stats = []
    for result in results:
        stats.append({
            "product_id": result.id,
            "product_name": result.name,
            "product_image": result.thumbnail,
            "sales_count": int(result.sales_count or 0),
            "sales_amount": float(result.sales_amount or 0),
            "order_count": result.order_count,
            "view_count": result.view_count,
            "avg_rating": float(result.avg_rating or 5.0)
        })
    
    return stats


async def get_group_stats(
    db: Session,
    start_date: date,
    end_date: date,
    merchant_id: Optional[int] = None,
    limit: int = 10
) -> List[Dict]:
    """获取团购统计数据"""
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="结束日期不能早于开始日期")
    
    # 将日期转换为datetime
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    # 构建查询
    query = db.query(
        Group.id,
        Group.title,
        Group.cover_image,
        Group.min_participants,
        Group.max_participants,
        Group.current_participants,
        Group.status,
        func.count(Order.id).label("order_count"),
        func.sum(Order.actual_amount).label("sales_amount")
    ).join(
        Order, Order.group_id == Group.id
    ).filter(
        Order.status.in_([1, 2, 3]),  # 已支付、已发货、已完成
        Order.created_at.between(start_datetime, end_datetime)
    )
    
    if merchant_id:
        query = query.filter(Group.merchant_id == merchant_id)
    
    # 分组和排序
    query = query.group_by(Group.id).order_by(func.sum(Order.actual_amount).desc()).limit(limit)
    
    # 执行查询
    results = query.all()
    
    # 处理结果
    stats = []
    for result in results:
        # 计算成功率
        success_rate = 0
        if result.status == 2:  # 已成功
            success_rate = 100
        elif result.status == 3:  # 已失败
            success_rate = 0
        elif result.status == 1:  # 进行中
            if result.min_participants <= result.current_participants:
                success_rate = 100
            else:
                success_rate = (result.current_participants / result.min_participants) * 100
        
        stats.append({
            "group_id": result.id,
            "group_title": result.title,
            "cover_image": result.cover_image,
            "participant_count": result.current_participants,
            "min_participants": result.min_participants,
            "status": result.status,
            "success_rate": float(success_rate),
            "order_count": result.order_count,
            "sales_amount": float(result.sales_amount or 0)
        })
    
    return stats


async def get_user_stats(
    db: Session,
    start_date: date,
    end_date: date,
    time_unit: str = "day"
) -> List[Dict]:
    """获取用户统计数据"""
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="结束日期不能早于开始日期")
    
    # 根据时间单位选择日期格式
    if time_unit == "day":
        date_format = "%Y-%m-%d"
    elif time_unit == "week":
        date_format = "%Y-%u"  # ISO周，%u是周几(1-7)
    elif time_unit == "month":
        date_format = "%Y-%m"
    else:
        raise HTTPException(status_code=400, detail="不支持的时间单位")
    
    # 生成日期序列
    date_series = []
    current_date = start_date
    while current_date <= end_date:
        if time_unit == "day":
            date_str = current_date.strftime(date_format)
            current_date += timedelta(days=1)
        elif time_unit == "week":
            # ISO周，第一天是周一
            date_str = current_date.strftime(date_format)
            current_date += timedelta(days=7)
        elif time_unit == "month":
            date_str = current_date.strftime(date_format)
            # 计算下个月的第一天
            if current_date.month == 12:
                current_date = date(current_date.year + 1, 1, 1)
            else:
                current_date = date(current_date.year, current_date.month + 1, 1)
        
        date_series.append(date_str)
    
    # 查询新增用户
    new_user_query = db.query(
        func.date_format(User.created_at, date_format).label("date"),
        func.count(User.id).label("new_user_count")
    ).filter(
        User.created_at.between(
            datetime.combine(start_date, datetime.min.time()),
            datetime.combine(end_date, datetime.max.time())
        )
    ).group_by(
        func.date_format(User.created_at, date_format)
    ).all()
    
    new_user_dict = {item.date: item.new_user_count for item in new_user_query}
    
    # 查询活跃用户（下单用户）
    active_user_query = db.query(
        func.date_format(Order.created_at, date_format).label("date"),
        func.count(func.distinct(Order.user_id)).label("active_user_count")
    ).filter(
        Order.created_at.between(
            datetime.combine(start_date, datetime.min.time()),
            datetime.combine(end_date, datetime.max.time())
        )
    ).group_by(
        func.date_format(Order.created_at, date_format)
    ).all()
    
    active_user_dict = {item.date: item.active_user_count for item in active_user_query}
    
    # 计算每个日期的累计用户数
    result = []
    total_users = db.query(func.count(User.id)).filter(
        User.created_at < datetime.combine(start_date, datetime.min.time())
    ).scalar() or 0
    
    for date_str in date_series:
        new_users = new_user_dict.get(date_str, 0)
        total_users += new_users
        
        result.append({
            "date": date_str,
            "new_user_count": new_users,
            "active_user_count": active_user_dict.get(date_str, 0),
            "total_user_count": total_users
        })
    
    return result