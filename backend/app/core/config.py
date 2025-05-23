# app/core/config.py
import os
import secrets
from typing import Any, Dict, List, Optional, Union

from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 项目信息
    PROJECT_NAME: str = "社区团购系统"
    PROJECT_DESCRIPTION: str = "一个功能完善的社区团购小程序后端服务"
    PROJECT_VERSION: str = "1.0.0"
    
    # API配置
    API_V1_STR: str = "/api"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 天
    ALGORITHM: str = "HS256"  # JWT 令牌签名算法
    
    # 服务器配置
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    DEBUG: bool = True
    WORKERS: int = 1  # 在开发环境设为1，生产环境可设置更高
    
    # 数据库配置
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "tuangou_db")
    SQLALCHEMY_DATABASE_URI: Optional[str] = None
    
    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        conn_str = f"mysql+pymysql://{values.get('DB_USER')}:{values.get('DB_PASSWORD')}@{values.get('DB_HOST')}:{values.get('DB_PORT')}/{values.get('DB_NAME')}"
        print(f"数据库连接字符串: {conn_str}")
        return conn_str
    
    # Redis配置
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD", "")
    
    # 跨域配置
    CORS_ORIGINS: List[str] = ["http://localhost:3000","*"] 
    # CORS_ORIGINS: List[str] = ["*"] 
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # 微信小程序配置
    WX_APPID: str = os.getenv("WX_APPID", "")
    WX_SECRET: str = os.getenv("WX_SECRET", "")
    
    # 微信支付配置
    WX_MCH_ID: str = os.getenv("WX_MCH_ID", "")
    WX_API_KEY: str = os.getenv("WX_API_KEY", "")
    WX_NOTIFY_URL: str = os.getenv("WX_NOTIFY_URL", "")
    
    # 地图API配置
    MAP_API_KEY: str = os.getenv("MAP_API_KEY", "")
    MAP_KEY: str = MAP_API_KEY 
    
    # 文件上传配置
    UPLOAD_DIR: str = "static/uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "gif", "webp"]
    STORAGE_TYPE: str = "local"  # local, oss, cos
    STORAGE_LOCAL_DIR: str = "static"
    
    # 管理员初始账号密码
    FIRST_ADMIN_PASSWORD: str = os.getenv("FIRST_ADMIN_PASSWORD", "admin123")
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"

# 初始化设置实例
settings = Settings()

# 打印关键配置以便调试
print("================ 配置信息 ================")
print(f"项目名称: {settings.PROJECT_NAME}")
print(f"调试模式: {settings.DEBUG}")
print(f"数据库主机: {settings.DB_HOST}")
print(f"数据库端口: {settings.DB_PORT}")
print(f"数据库用户: {settings.DB_USER}")
print(f"数据库密码: {'*' * len(settings.DB_PASSWORD) if settings.DB_PASSWORD else '未设置'}")
print(f"数据库名称: {settings.DB_NAME}")
print(f"数据库连接URI: {settings.SQLALCHEMY_DATABASE_URI}")
print(f"Redis主机: {settings.REDIS_HOST}")
print(f"CORS来源: {settings.CORS_ORIGINS}")
print("=========================================")