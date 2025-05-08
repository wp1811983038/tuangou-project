import logging
import os
import time
from pathlib import Path
from logging.handlers import TimedRotatingFileHandler

from app.core.config import settings


def configure_logging() -> None:
    """
    配置日志系统
    """
    # 创建日志目录
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # 日志文件路径
    log_file_path = logs_dir / f"app_{time.strftime('%Y%m%d')}.log"
    
    # 配置根日志记录器
    log_formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    )
    
    # 配置控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    
    # 配置文件处理器(每天轮换)
    file_handler = TimedRotatingFileHandler(
        filename=log_file_path,
        when="midnight",
        interval=1,
        backupCount=30,  # 保留30天
        encoding="utf-8",
    )
    file_handler.setFormatter(log_formatter)
    
    # 获取根日志记录器并配置
    root_logger = logging.getLogger()
    
    # 清除现有处理器
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # 添加新处理器
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    # 设置日志级别
    if settings.DEBUG:
        root_logger.setLevel(logging.DEBUG)
    else:
        root_logger.setLevel(logging.INFO)
    
    # 减少一些第三方库的日志级别
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    logging.info("日志系统已配置")