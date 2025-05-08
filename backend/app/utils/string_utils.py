import re
import random
import string
import hashlib
import unicodedata
from typing import Optional, List

def is_empty(s: Optional[str]) -> bool:
    """
    判断字符串是否为空
    
    Args:
        s: 字符串
        
    Returns:
        是否为空
    """
    return s is None or s.strip() == ""

def truncate(s: str, length: int, suffix: str = "...") -> str:
    """
    截断字符串
    
    Args:
        s: 字符串
        length: 最大长度
        suffix: 后缀
        
    Returns:
        截断后的字符串
    """
    if len(s) <= length:
        return s
    return s[:length] + suffix

def mask_phone(phone: str) -> str:
    """
    手机号脱敏
    
    Args:
        phone: 手机号
        
    Returns:
        脱敏后的手机号，格式如：138****8888
    """
    if not phone or len(phone) != 11:
        return phone
    return phone[:3] + "****" + phone[-4:]

def mask_id_card(id_card: str) -> str:
    """
    身份证号脱敏
    
    Args:
        id_card: 身份证号
        
    Returns:
        脱敏后的身份证号，格式如：110101********1234
    """
    if not id_card or len(id_card) < 10:
        return id_card
    return id_card[:6] + "*" * 8 + id_card[-4:]

def mask_email(email: str) -> str:
    """
    邮箱地址脱敏
    
    Args:
        email: 邮箱地址
        
    Returns:
        脱敏后的邮箱地址，格式如：u****@example.com
    """
    if not email or "@" not in email:
        return email
    
    parts = email.split("@")
    username = parts[0]
    domain = parts[1]
    
    if len(username) <= 1:
        masked_username = username
    else:
        masked_username = username[0] + "*" * (len(username) - 1)
    
    return masked_username + "@" + domain

def generate_random_string(length: int = 8, include_digits: bool = True, include_letters: bool = True) -> str:
    """
    生成随机字符串
    
    Args:
        length: 字符串长度
        include_digits: 是否包含数字
        include_letters: 是否包含字母
        
    Returns:
        随机字符串
    """
    chars = ""
    if include_digits:
        chars += string.digits
    if include_letters:
        chars += string.ascii_letters
    
    if not chars:
        chars = string.ascii_lowercase
    
    return ''.join(random.choice(chars) for _ in range(length))

def to_camel_case(snake_str: str) -> str:
    """
    蛇形命名法转驼峰命名法
    
    Args:
        snake_str: 蛇形命名字符串，如 user_name
        
    Returns:
        驼峰命名字符串，如 userName
    """
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def to_snake_case(camel_str: str) -> str:
    """
    驼峰命名法转蛇形命名法
    
    Args:
        camel_str: 驼峰命名字符串，如 userName
        
    Returns:
        蛇形命名字符串，如 user_name
    """
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', camel_str)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def normalize_string(s: str) -> str:
    """
    标准化字符串，去除首尾空格，将多个空格合并为一个
    
    Args:
        s: 字符串
        
    Returns:
        标准化后的字符串
    """
    if not s:
        return s
    return re.sub(r'\s+', ' ', s.strip())

def remove_html_tags(html: str) -> str:
    """
    移除HTML标签
    
    Args:
        html: HTML字符串
        
    Returns:
        纯文本内容
    """
    if not html:
        return html
    return re.sub(r'<[^>]+>', '', html)

def get_initials(name: str) -> str:
    """
    获取姓名首字母
    
    Args:
        name: 姓名
        
    Returns:
        首字母
    """
    if not name:
        return ""
    
    return ''.join(word[0].upper() for word in name.split() if word)

def is_valid_phone(phone: str) -> bool:
    """
    验证手机号格式
    
    Args:
        phone: 手机号
        
    Returns:
        是否有效
    """
    if not phone:
        return False
    
    # 中国大陆手机号格式
    pattern = r'^1[3-9]\d{9}$'
    return bool(re.match(pattern, phone))

def is_valid_email(email: str) -> bool:
    """
    验证邮箱地址格式
    
    Args:
        email: 邮箱地址
        
    Returns:
        是否有效
    """
    if not email:
        return False
    
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return bool(re.match(pattern, email))

def is_valid_id_card(id_card: str) -> bool:
    """
    验证身份证号格式
    
    Args:
        id_card: 身份证号
        
    Returns:
        是否有效
    """
    if not id_card:
        return False
    
    # 18位身份证号格式
    pattern = r'^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$'
    return bool(re.match(pattern, id_card))

def hash_string(s: str, algorithm: str = "md5") -> str:
    """
    计算字符串哈希值
    
    Args:
        s: 字符串
        algorithm: 哈希算法，支持md5、sha1、sha256
        
    Returns:
        哈希值
    """
    if not s:
        return ""
    
    if algorithm == "md5":
        return hashlib.md5(s.encode()).hexdigest()
    elif algorithm == "sha1":
        return hashlib.sha1(s.encode()).hexdigest()
    elif algorithm == "sha256":
        return hashlib.sha256(s.encode()).hexdigest()
    else:
        raise ValueError(f"不支持的哈希算法: {algorithm}")

def slug(s: str) -> str:
    """
    生成URL友好的slug
    
    Args:
        s: 字符串
        
    Returns:
        slug字符串
    """
    # 将字符串转换为ASCII，忽略无法转换的字符
    value = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')
    # 将所有非字母数字字符替换为连字符
    value = re.sub(r'[^\w\s-]', '', value).strip().lower()
    # 将多个空格或连字符替换为单个连字符
    return re.sub(r'[-\s]+', '-', value)