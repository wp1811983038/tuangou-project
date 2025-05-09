from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# 密码上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    创建JWT访问令牌

    Args:
        subject: 令牌主题
        expires_delta: 过期时间增量

    Returns:
        生成的JWT令牌字符串
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码

    Args:
        plain_password: 明文密码
        hashed_password: 哈希密码

    Returns:
        是否验证成功
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    获取密码哈希值

    Args:
        password: 明文密码

    Returns:
        密码哈希字符串
    """
    return pwd_context.hash(password)


def decode_token(token: str) -> Dict:
    """
    解码JWT令牌

    Args:
        token: JWT令牌字符串

    Returns:
        解码后的数据
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


def generate_password_reset_token(email: str) -> str:
    """
    生成密码重置令牌

    Args:
        email: 用户邮箱

    Returns:
        密码重置令牌
    """
    delta = timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.utcnow()
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email, "type": "password_reset"},
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    验证密码重置令牌

    Args:
        token: 密码重置令牌

    Returns:
        令牌中的电子邮件，如果无效则返回None
    """
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert decoded_token["type"] == "password_reset"
        return decoded_token["sub"]
    except (jwt.JWTError, AssertionError):
        return None