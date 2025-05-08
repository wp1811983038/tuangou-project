import time
from datetime import datetime, date, timedelta
from typing import Union, Optional, List, Tuple

def now() -> datetime:
    """
    获取当前日期时间
    
    Returns:
        当前日期时间
    """
    return datetime.now()

def today() -> date:
    """
    获取今天日期
    
    Returns:
        今天日期
    """
    return date.today()

def timestamp_to_datetime(timestamp: int) -> datetime:
    """
    时间戳转日期时间
    
    Args:
        timestamp: 时间戳(秒)
        
    Returns:
        日期时间
    """
    return datetime.fromtimestamp(timestamp)

def datetime_to_timestamp(dt: datetime) -> int:
    """
    日期时间转时间戳
    
    Args:
        dt: 日期时间
        
    Returns:
        时间戳(秒)
    """
    return int(dt.timestamp())

def format_datetime(dt: datetime, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    格式化日期时间
    
    Args:
        dt: 日期时间
        fmt: 格式化字符串
        
    Returns:
        格式化后的日期时间字符串
    """
    return dt.strftime(fmt)

def parse_datetime(date_str: str, fmt: str = "%Y-%m-%d %H:%M:%S") -> datetime:
    """
    解析日期时间字符串
    
    Args:
        date_str: 日期时间字符串
        fmt: 格式化字符串
        
    Returns:
        日期时间对象
    """
    return datetime.strptime(date_str, fmt)

def add_days(dt: datetime, days: int) -> datetime:
    """
    日期加减天数
    
    Args:
        dt: 日期时间
        days: 天数，可为负数
        
    Returns:
        计算后的日期时间
    """
    return dt + timedelta(days=days)

def date_range(start_date: date, end_date: date) -> List[date]:
    """
    获取日期范围列表
    
    Args:
        start_date: 开始日期
        end_date: 结束日期
        
    Returns:
        日期列表
    """
    dates = []
    current = start_date
    while current <= end_date:
        dates.append(current)
        current += timedelta(days=1)
    return dates

def get_month_range(year: int, month: int) -> Tuple[date, date]:
    """
    获取指定年月的起止日期
    
    Args:
        year: 年份
        month: 月份
        
    Returns:
        (月初日期, 月末日期)
    """
    start_date = date(year, month, 1)
    
    # 获取下个月的第一天，然后减一天得到当月最后一天
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    return start_date, end_date

def is_same_day(dt1: datetime, dt2: datetime) -> bool:
    """
    判断两个日期是否是同一天
    
    Args:
        dt1: 日期时间1
        dt2: 日期时间2
        
    Returns:
        是否同一天
    """
    return dt1.date() == dt2.date()

def get_relative_time_desc(dt: datetime) -> str:
    """
    获取相对时间描述，如"刚刚"、"1分钟前"等
    
    Args:
        dt: 日期时间
        
    Returns:
        相对时间描述
    """
    now = datetime.now()
    diff = now - dt
    
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "刚刚"
    elif seconds < 3600:
        return f"{int(seconds // 60)}分钟前"
    elif seconds < 86400:
        return f"{int(seconds // 3600)}小时前"
    elif seconds < 604800:  # 7天
        return f"{int(seconds // 86400)}天前"
    else:
        return format_datetime(dt, "%Y-%m-%d")

def get_day_start_end(dt: datetime) -> Tuple[datetime, datetime]:
    """
    获取指定日期的开始和结束时间
    
    Args:
        dt: 日期时间
        
    Returns:
        (开始时间, 结束时间)
    """
    start = datetime.combine(dt.date(), datetime.min.time())
    end = datetime.combine(dt.date(), datetime.max.time())
    return start, end

def is_expired(dt: datetime) -> bool:
    """
    判断日期是否已过期
    
    Args:
        dt: 日期时间
        
    Returns:
        是否已过期
    """
    return dt < datetime.now()

def remaining_seconds(dt: datetime) -> int:
    """
    计算距离指定时间还有多少秒
    
    Args:
        dt: 目标日期时间
        
    Returns:
        剩余秒数，如果已过期则返回0
    """
    now = datetime.now()
    if dt <= now:
        return 0
    return int((dt - now).total_seconds())