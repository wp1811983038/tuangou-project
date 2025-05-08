from typing import List, Optional

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """上传响应模型"""
    url: str
    filename: str
    size: int
    mime_type: str


class BatchUploadResponse(BaseModel):
    """批量上传响应模型"""
    files: List[UploadResponse]
    total: int


class UploadConfig(BaseModel):
    """上传配置模型"""
    allowed_extensions: List[str] = ["jpg", "jpeg", "png", "gif", "webp"]
    max_size: int = 5 * 1024 * 1024  # 5MB
    upload_dir: str = "uploads"
    storage_type: str = "local"  # local, oss, cos
    domain: Optional[str] = None