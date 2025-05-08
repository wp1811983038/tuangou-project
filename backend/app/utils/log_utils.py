import os
import logging
import traceback
from datetime import datetime
from logging.handlers import TimedRotatingFileHandler, RotatingFileHandler
from typing import Optional, Union, Any

def setup_logger(
    name: str,
    log_file: Optional[str] = None,
    level: int = logging.INFO,
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    date_format: str = "%Y-%m-%d %H:%M:%S",
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 10,
    rotation: str = "midnight"
) -> logging.Logger:
    """
    设置日志记录器
    
    Args:
        name: 日志记录器名称
        log_file: 日志文件路径，为None则只输出到控制台
        level: 日志级别
        log_format: 日志格式
        date_format: 日期格式
        max_bytes: 单个日志文件最大大小
        backup_count: 备份文件数量
        rotation: 轮转方式，可选"size"（按大小）或"midnight"（按时间）
        
    Returns:
        日志记录器
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # 创建格式化器
    formatter = logging.Formatter(log_format, date_format)
    
    # 添加控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # 如果指定了日志文件，添加文件处理器
    if log_file:
        # 确保日志目录存在
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        
        if rotation == "size":
            # 按大小轮转
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=max_bytes,
                backupCount=backup_count,
                encoding="utf-8"
            )
        else:
            # 按时间轮转，默认每天午夜
            file_handler = TimedRotatingFileHandler(
                log_file,
                when=rotation,
                interval=1,
                backupCount=backup_count,
                encoding="utf-8"
            )
        
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

def log_exception(logger: logging.Logger, message: str = "发生异常", exc_info: Any = None) -> None:
    """
    记录异常信息
    
    Args:
        logger: 日志记录器
        message: 日志消息
        exc_info: 异常信息
    """
    if exc_info is None:
        logger.exception(message)
    else:
        logger.error(f"{message}: {exc_info}")
        logger.error(traceback.format_exc())

def log_request(logger: logging.Logger, method: str, path: str, ip: str, params: Optional[dict] = None, data: Optional[dict] = None) -> None:
    """
    记录HTTP请求信息
    
    Args:
        logger: 日志记录器
        method: 请求方法
        path: 请求路径
        ip: 客户端IP
        params: 查询参数
        data: 请求数据
    """
    logger.info(f"收到请求: {method} {path} - IP: {ip}")
    
    if params:
        logger.debug(f"查询参数: {params}")
    
    if data:
        # 敏感信息脱敏
        masked_data = mask_sensitive_data(data)
        logger.debug(f"请求数据: {masked_data}")

def log_response(logger: logging.Logger, method: str, path: str, status_code: int, elapsed: float, response_data: Optional[dict] = None) -> None:
    """
    记录HTTP响应信息
    
    Args:
        logger: 日志记录器
        method: 请求方法
        path: 请求路径
        status_code: 响应状态码
        elapsed: 请求耗时(秒)
        response_data: 响应数据
    """
    logger.info(f"请求完成: {method} {path} - 状态码: {status_code} - 耗时: {elapsed:.4f}秒")
    
    if response_data:
        # 敏感信息脱敏
        masked_data = mask_sensitive_data(response_data)
        logger.debug(f"响应数据: {masked_data}")

def mask_sensitive_data(data: dict) -> dict:
    """
    敏感信息脱敏
    
    Args:
        data: 原始数据
        
    Returns:
        脱敏后的数据
    """
    import copy
    
    # 敏感字段列表
    sensitive_fields = [
        "password", "pwd", "passwd", "phone", "mobile", "id_card", 
        "identity", "card_no", "secret", "token", "access_token", 
        "refresh_token", "key", "api_key", "auth", "credentials"
    ]
    
    # 复制原始数据
    masked_data = copy.deepcopy(data)
    
    def mask_dict(d):
        for key, value in d.items():
            # 检查是否敏感字段
            if isinstance(key, str) and any(field in key.lower() for field in sensitive_fields):
                if isinstance(value, str) and value:
                    # 字符串类型，脱敏处理
                    if len(value) <= 4:
                        d[key] = "***"
                    else:
                        d[key] = value[:2] + "*" * (len(value) - 4) + value[-2:]
            
            # 递归处理嵌套字典
            elif isinstance(value, dict):
                mask_dict(value)
            # 递归处理列表中的字典
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        mask_dict(item)
    
    # 开始脱敏处理
    if isinstance(masked_data, dict):
        mask_dict(masked_data)
    
    return masked_data

def log_error(logger: logging.Logger, message: str, error: Optional[Exception] = None, context: Optional[dict] = None) -> None:
    """
    记录错误信息
    
    Args:
        logger: 日志记录器
        message: 错误消息
        error: 异常对象
        context: 上下文信息
    """
    if error:
        logger.error(f"{message}: {str(error)}")
        logger.error(traceback.format_exc())
    else:
        logger.error(message)
    
    if context:
        logger.error(f"错误上下文: {context}")

def get_logger_name(module_name: str) -> str:
    """
    获取日志记录器名称
    
    Args:
        module_name: 模块名称
        
    Returns:
        日志记录器名称
    """
    return f"app.{module_name}"

def silence_noisy_loggers() -> None:
    """
    降低第三方库的日志级别
    """
    # 常见的嘈杂日志
    noisy_loggers = [
        "urllib3.connectionpool",
        "requests",
        "sqlalchemy.engine",
        "sqlalchemy.pool",
        "PIL",
        "asyncio",
        "aiohttp",
        "chardet",
        "elasticsearch"
    ]
    
    for logger_name in noisy_loggers:
        logging.getLogger(logger_name).setLevel(logging.WARNING)