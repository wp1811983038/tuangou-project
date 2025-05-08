# app/core/events.py
import logging
from typing import Callable

from fastapi import FastAPI
from sqlalchemy.orm import Session
from sqlalchemy import text  # 添加这行导入

from app.db.session import SessionLocal
from app.core.config import settings
from app.core.logging import configure_logging


def create_start_app_handler(app: FastAPI) -> Callable:
    """
    创建应用启动处理函数
    
    Args:
        app: FastAPI应用实例
        
    Returns:
        启动处理函数
    """
    async def start_app() -> None:
        # 配置日志系统
        configure_logging()
        
        # 测试数据库连接
        db = SessionLocal()
        try:
            # 修改这行：使用text()函数包装SQL语句
            db.execute(text("SELECT 1"))
            logging.info("数据库连接成功")
        except Exception as e:
            logging.error(f"数据库连接失败: {e}")
            raise e
        finally:
            db.close()
        
        logging.info(f"应用启动成功，调试模式: {settings.DEBUG}")
    
    return start_app

def create_stop_app_handler(app: FastAPI) -> Callable:
    """
    创建应用停止处理函数
    
    Args:
        app: FastAPI应用实例
        
    Returns:
        停止处理函数
    """
    async def stop_app() -> None:
        logging.info("应用已停止")
    
    return stop_app


def register_app_events(app: FastAPI) -> None:
    """
    注册应用事件处理器
    
    Args:
        app: FastAPI应用实例
    """
    app.add_event_handler("startup", create_start_app_handler(app))
    app.add_event_handler("shutdown", create_stop_app_handler(app))