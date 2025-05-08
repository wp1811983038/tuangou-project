import time
from typing import Callable

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import logging


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    请求日志中间件 - 记录请求处理时间和响应状态
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # 获取客户端IP
        if "x-forwarded-for" in request.headers:
            client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
        else:
            client_ip = request.client.host
        
        # 记录请求信息
        logging.info(f"开始处理请求: {request.method} {request.url.path} - IP: {client_ip}")
        
        # 处理请求
        response = await call_next(request)
        
        # 计算处理时间
        process_time = time.time() - start_time
        
        # 记录响应信息
        logging.info(
            f"请求处理完成: {request.method} {request.url.path} - "
            f"状态: {response.status_code} - 耗时: {process_time:.4f}秒"
        )
        
        # 添加处理时间到响应头
        response.headers["X-Process-Time"] = str(process_time)
        
        return response


def register_middlewares(app: FastAPI) -> None:
    """
    注册中间件
    
    Args:
        app: FastAPI应用实例
    """
    app.add_middleware(RequestLoggingMiddleware)