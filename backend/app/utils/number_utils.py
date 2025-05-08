import math
import random
from decimal import ROUND_DOWN, Decimal, ROUND_HALF_UP
from typing import Union, Optional

def format_price(price: Union[float, Decimal], places: int = 2) -> str:
    """
    格式化价格
    
    Args:
        price: 价格
        places: 小数位数
        
    Returns:
        格式化后的价格字符串
    """
    if isinstance(price, float):
        price = Decimal(str(price))
    
    return str(price.quantize(Decimal('0.' + '0' * places), rounding=ROUND_HALF_UP))

def format_currency(amount: Union[float, Decimal], symbol: str = '¥', places: int = 2) -> str:
    """
    格式化货币
    
    Args:
        amount: 金额
        symbol: 货币符号
        places: 小数位数
        
    Returns:
        格式化后的货币字符串
    """
    formatted = format_price(amount, places)
    return f"{symbol}{formatted}"

def yuan_to_fen(yuan: Union[float, Decimal]) -> int:
    """
    元转换为分
    
    Args:
        yuan: 人民币元
        
    Returns:
        人民币分（整数）
    """
    if isinstance(yuan, float):
        yuan = Decimal(str(yuan))
    
    fen = yuan * 100
    return int(fen.quantize(Decimal('0'), rounding=ROUND_HALF_UP))

def fen_to_yuan(fen: int) -> Decimal:
    """
    分转换为元
    
    Args:
        fen: 人民币分（整数）
        
    Returns:
        人民币元
    """
    return Decimal(fen) / 100

def format_with_unit(value: Union[float, int], unit: str, places: int = 2) -> str:
    """
    数字带单位格式化
    
    Args:
        value: 数值
        unit: 单位
        places: 小数位数
        
    Returns:
        格式化后的字符串
    """
    if isinstance(value, int):
        return f"{value}{unit}"
    else:
        return f"{round(value, places)}{unit}"

def format_file_size(size_bytes: int) -> str:
    """
    格式化文件大小
    
    Args:
        size_bytes: 文件大小（字节）
        
    Returns:
        格式化后的文件大小字符串，如 1.5 MB
    """
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

def calculate_discount_percent(original_price: Union[float, Decimal], current_price: Union[float, Decimal]) -> int:
    """
    计算折扣百分比
    
    Args:
        original_price: 原价
        current_price: 现价
        
    Returns:
        折扣百分比，例如：8表示8折
    """
    if original_price <= 0:
        return 10
    
    if isinstance(original_price, float):
        original_price = Decimal(str(original_price))
    
    if isinstance(current_price, float):
        current_price = Decimal(str(current_price))
    
    discount = (current_price / original_price) * 10
    return int(discount.quantize(Decimal('0'), rounding=ROUND_HALF_UP))

def calculate_discount_amount(original_price: Union[float, Decimal], discount_percent: int) -> Decimal:
    """
    根据折扣计算价格
    
    Args:
        original_price: 原价
        discount_percent: 折扣百分比，例如：8表示8折
        
    Returns:
        折扣后的价格
    """
    if isinstance(original_price, float):
        original_price = Decimal(str(original_price))
    
    discount = Decimal(discount_percent) / 10
    return (original_price * discount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def random_float(min_val: float, max_val: float, places: int = 2) -> float:
    """
    生成指定范围内的随机浮点数
    
    Args:
        min_val: 最小值
        max_val: 最大值
        places: 小数位数
        
    Returns:
        随机浮点数
    """
    val = random.uniform(min_val, max_val)
    return round(val, places)

def format_percentage(value: Union[float, Decimal], places: int = 2) -> str:
    """
    格式化百分比
    
    Args:
        value: 比例值(0-1之间)
        places: 小数位数
        
    Returns:
        格式化后的百分比字符串
    """
    if isinstance(value, float):
        value = Decimal(str(value))
    
    percentage = value * 100
    rounded = percentage.quantize(Decimal('0.' + '0' * places), rounding=ROUND_HALF_UP)
    return f"{rounded}%"

def round_up(value: Union[float, Decimal], places: int = 0) -> Decimal:
    """
    向上取整
    
    Args:
        value: 值
        places: 小数位数
        
    Returns:
        向上取整后的值
    """
    if isinstance(value, float):
        value = Decimal(str(value))
    
    return value.quantize(Decimal('0.' + '0' * places), rounding=ROUND_HALF_UP)

def round_down(value: Union[float, Decimal], places: int = 0) -> Decimal:
    """
    向下取整
    
    Args:
        value: 值
        places: 小数位数
        
    Returns:
        向下取整后的值
    """
    if isinstance(value, float):
        value = Decimal(str(value))
    
    return value.quantize(Decimal('0.' + '0' * places), rounding=ROUND_DOWN)