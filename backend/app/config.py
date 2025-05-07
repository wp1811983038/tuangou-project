from pydantic_settings import BaseSettings 

class Settings(BaseSettings):
    # 数据库设置
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "1811983038"
    MYSQL_DATABASE: str = "tuangou_db"
    
    # 构建数据库URI
    DATABASE_URL: str = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    
    # JWT设置
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7天
    
    # 微信小程序设置
    WECHAT_APPID: str = "your-wechat-appid"
    WECHAT_SECRET: str = "your-wechat-secret"
    
    class Config:
        env_file = ".env"

settings = Settings()