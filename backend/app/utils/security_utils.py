import hashlib
import hmac
import base64
import secrets
import string
from typing import Tuple, Optional
import re
from datetime import datetime, timedelta
from jose import jwt, JWTError

def generate_password_hash(password: str) -> str:
    """
    生成密码哈希
    
    Args:
        password: 原始密码
        
    Returns:
        密码哈希值
    """
    # 使用SHA-256和随机盐值生成密码哈希
    salt = secrets.token_hex(8)
    hash_obj = hashlib.sha256(salt.encode() + password.encode())
    return salt + hash_obj.hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    """
    验证密码
    
    Args:
        password: 原始密码
        hashed_password: 密码哈希值
        
    Returns:
        密码是否匹配
    """
    if len(hashed_password) < 16:
        return False
    
    salt = hashed_password[:16]
    stored_hash = hashed_password[16:]
    hash_obj = hashlib.sha256(salt.encode() + password.encode())
    return hash_obj.hexdigest() == stored_hash

def generate_token(data: dict, secret_key: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    生成JWT令牌
    
    Args:
        data: 令牌数据
        secret_key: 密钥
        expires_delta: 过期时间增量
        
    Returns:
        JWT令牌
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, secret_key, algorithm="HS256")

def verify_token(token: str, secret_key: str) -> dict:
    """
    验证JWT令牌
    
    Args:
        token: JWT令牌
        secret_key: 密钥
        
    Returns:
        令牌数据
        
    Raises:
        JWTError: 令牌无效
    """
    return jwt.decode(token, secret_key, algorithms=["HS256"])

def generate_random_password(length: int = 12) -> str:
    """
    生成随机密码
    
    Args:
        length: 密码长度
        
    Returns:
        随机密码
    """
    # 确保密码包含大小写字母、数字和特殊字符
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and any(c in "!@#$%^&*" for c in password)):
            break
    return password

def hash_md5(data: str) -> str:
    """
    计算MD5哈希值
    
    Args:
        data: 数据字符串
        
    Returns:
        MD5哈希值
    """
    return hashlib.md5(data.encode()).hexdigest()

def hash_sha256(data: str) -> str:
    """
    计算SHA-256哈希值
    
    Args:
        data: 数据字符串
        
    Returns:
        SHA-256哈希值
    """
    return hashlib.sha256(data.encode()).hexdigest()

def hmac_sha256(key: str, data: str) -> str:
    """
    计算HMAC-SHA256值
    
    Args:
        key: 密钥
        data: 数据字符串
        
    Returns:
        HMAC-SHA256值
    """
    return hmac.new(key.encode(), data.encode(), hashlib.sha256).hexdigest()

def generate_signature(params: dict, secret_key: str, method: str = "md5") -> str:
    """
    生成签名
    
    Args:
        params: 参数字典
        secret_key: 密钥
        method: 签名方法
        
    Returns:
        签名
    """
    # 按键排序
    sorted_params = sorted(params.items())
    
    # 拼接参数
    query_string = "&".join([f"{k}={v}" for k, v in sorted_params if v])
    
    # 加上密钥
    text = query_string + "&key=" + secret_key
    
    # 计算哈希
    if method == "md5":
        return hash_md5(text).upper()
    elif method == "sha256":
        return hash_sha256(text).upper()
    else:
        raise ValueError(f"不支持的签名方法: {method}")

def is_strong_password(password: str) -> bool:
    """
    检查是否为强密码
    
    Args:
        password: 密码
        
    Returns:
        是否为强密码
    """
    # 至少8个字符，至少包含一个大写字母，一个小写字母，一个数字和一个特殊字符
    if len(password) < 8:
        return False
    
    if not re.search(r'[A-Z]', password):
        return False
    
    if not re.search(r'[a-z]', password):
        return False
    
    if not re.search(r'[0-9]', password):
        return False
    
    if not re.search(r'[!@#$%^&*]', password):
        return False
    
    return True

def encrypt_aes(data: str, key: str) -> str:
    """
    AES加密
    
    Args:
        data: 原始数据
        key: 密钥
        
    Returns:
        加密后的base64字符串
    """
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import pad
    
    # 确保密钥长度为16字节(AES-128)
    key_bytes = hashlib.sha256(key.encode()).digest()[:16]
    
    # 加密
    cipher = AES.new(key_bytes, AES.MODE_ECB)
    padded_data = pad(data.encode(), AES.block_size)
    encrypted_data = cipher.encrypt(padded_data)
    
    # 转为base64字符串
    return base64.b64encode(encrypted_data).decode()

def decrypt_aes(encrypted_data: str, key: str) -> str:
    """
    AES解密
    
    Args:
        encrypted_data: 加密后的base64字符串
        key: 密钥
        
    Returns:
        解密后的原始数据
    """
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import unpad
    
    # 确保密钥长度为16字节(AES-128)
    key_bytes = hashlib.sha256(key.encode()).digest()[:16]
    
    # 解密
    encrypted_bytes = base64.b64decode(encrypted_data)
    cipher = AES.new(key_bytes, AES.MODE_ECB)
    decrypted_data = unpad(cipher.decrypt(encrypted_bytes), AES.block_size)
    
    return decrypted_data.decode()