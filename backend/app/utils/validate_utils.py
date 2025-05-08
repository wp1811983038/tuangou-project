import re
from datetime import datetime
from typing import Any, Optional, Dict, List, Union

def is_empty(value: Any) -> bool:
    """
    检查值是否为空
    
    Args:
        value: 要检查的值
        
    Returns:
        是否为空
    """
    if value is None:
        return True
    
    if isinstance(value, str) and value.strip() == "":
        return True
    
    if isinstance(value, (list, dict, tuple, set)) and len(value) == 0:
        return True
    
    return False

def is_valid_email(email: str) -> bool:
    """
    验证邮箱地址
    
    Args:
        email: 邮箱地址
        
    Returns:
        是否有效
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def is_valid_phone(phone: str) -> bool:
    """
    验证手机号
    
    Args:
        phone: 手机号
        
    Returns:
        是否有效
    """
    pattern = r'^1[3-9]\d{9}$'
    return bool(re.match(pattern, phone))

def is_valid_url(url: str) -> bool:
    """
    验证URL
    
    Args:
        url: URL
        
    Returns:
        是否有效
    """
    pattern = r'^(https?|ftp)://[^\s/$.?#].[^\s]*$'
    return bool(re.match(pattern, url))

def is_valid_id_card(id_card: str) -> bool:
    """
    验证身份证号
    
    Args:
        id_card: 身份证号
        
    Returns:
        是否有效
    """
    # 18位身份证号码
    pattern = r'^\d{17}[\dXx]$'
    if not re.match(pattern, id_card):
        return False
    
    # 验证校验位
    factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    check_codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
    
    id_card_list = list(id_card[:-1])
    id_card_list = [int(i) for i in id_card_list]
    
    sum = 0
    for i in range(17):
        sum += id_card_list[i] * factors[i]
    
    check = check_codes[sum % 11]
    
    return check.upper() == id_card[-1].upper()

def is_valid_password(password: str, min_length: int = 8, require_number: bool = True, require_uppercase: bool = True, require_lowercase: bool = True, require_special: bool = False) -> bool:
    """
    验证密码强度
    
    Args:
        password: 密码
        min_length: 最小长度
        require_number: 是否必须包含数字
        require_uppercase: 是否必须包含大写字母
        require_lowercase: 是否必须包含小写字母
        require_special: 是否必须包含特殊字符
        
    Returns:
        是否有效
    """
    if len(password) < min_length:
        return False
    
    if require_number and not re.search(r'\d', password):
        return False
    
    if require_uppercase and not re.search(r'[A-Z]', password):
        return False
    
    if require_lowercase and not re.search(r'[a-z]', password):
        return False
    
    if require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    
    return True

def is_valid_date(date_str: str, date_format: str = "%Y-%m-%d") -> bool:
    """
    验证日期格式
    
    Args:
        date_str: 日期字符串
        date_format: 日期格式
        
    Returns:
        是否有效
    """
    try:
        datetime.strptime(date_str, date_format)
        return True
    except ValueError:
        return False

def is_valid_ip(ip: str) -> bool:
    """
    验证IP地址
    
    Args:
        ip: IP地址
        
    Returns:
        是否有效
    """
    pattern = r'^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
    return bool(re.match(pattern, ip))

def is_valid_mac(mac: str) -> bool:
    """
    验证MAC地址
    
    Args:
        mac: MAC地址
        
    Returns:
        是否有效
    """
    pattern = r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'
    return bool(re.match(pattern, mac))

def is_valid_chinese_name(name: str) -> bool:
    """
    验证中文姓名
    
    Args:
        name: 姓名
        
    Returns:
        是否有效
    """
    pattern = r'^[\u4e00-\u9fa5]{2,25}$'
    return bool(re.match(pattern, name))

def is_valid_credit_card(card_number: str) -> bool:
    """
    验证信用卡号（Luhn算法）
    
    Args:
        card_number: 信用卡号
        
    Returns:
        是否有效
    """
    if not card_number.isdigit():
        return False
    
    # 移除空格和连接符
    card_number = card_number.replace(' ', '').replace('-', '')
    
    # Luhn算法
    digits = [int(d) for d in card_number]
    odd_digits = digits[-1::-2]
    even_digits = digits[-2::-2]
    checksum = sum(odd_digits)
    for d in even_digits:
        checksum += sum(divmod(d * 2, 10))
    
    return checksum % 10 == 0

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> List[str]:
    """
    验证必填字段
    
    Args:
        data: 数据字典
        required_fields: 必填字段列表
        
    Returns:
        缺失字段列表
    """
    missing_fields = []
    
    for field in required_fields:
        if field not in data or is_empty(data[field]):
            missing_fields.append(field)
    
    return missing_fields

def validate_input_length(value: str, min_length: int = 0, max_length: Optional[int] = None) -> bool:
    """
    验证输入长度
    
    Args:
        value: 输入值
        min_length: 最小长度
        max_length: 最大长度
        
    Returns:
        是否有效
    """
    if not isinstance(value, str):
        return False
    
    length = len(value)
    
    if length < min_length:
        return False
    
    if max_length is not None and length > max_length:
        return False
    
    return True

def validate_numeric_range(value: Union[int, float], min_value: Optional[Union[int, float]] = None, max_value: Optional[Union[int, float]] = None) -> bool:
    """
    验证数值范围
    
    Args:
        value: 数值
        min_value: 最小值
        max_value: 最大值
        
    Returns:
        是否有效
    """
    if not isinstance(value, (int, float)):
        return False
    
    if min_value is not None and value < min_value:
        return False
    
    if max_value is not None and value > max_value:
        return False
    
    return True

def sanitize_html(html_content: str) -> str:
    """
    净化HTML内容
    
    Args:
        html_content: HTML内容
        
    Returns:
        净化后的HTML
    """
    import html
    
    # 转义HTML特殊字符
    return html.escape(html_content)