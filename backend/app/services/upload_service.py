import os
import uuid
import mimetypes
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, UploadFile
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.core.config import settings
from app.core.constants import StorageType


async def upload_file(
    file: UploadFile,
    folder: str = "uploads",
    allowed_extensions: Optional[List[str]] = None,
    max_size: Optional[int] = None,
    storage_type: Optional[StorageType] = None
) -> dict:
    """上传单个文件"""
    if not file:
        raise HTTPException(status_code=400, detail="没有文件")
    
    # 检查文件类型
    if allowed_extensions:
        ext = os.path.splitext(file.filename)[1].lower().lstrip('.')
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件类型，允许的类型: {', '.join(allowed_extensions)}"
            )
    
    # 检查文件大小
    if max_size:
        # UploadFile 对象可以是 FastAPI 或 Starlette 的
        if isinstance(file, StarletteUploadFile):
            # Starlette 的 UploadFile
            file_size = 0
            file.file.seek(0, os.SEEK_END)
            file_size = file.file.tell()
            file.file.seek(0)
        else:
            # FastAPI 的 UploadFile
            file_size = await file.size()
        
        if file_size > max_size:
            max_size_mb = max_size / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"文件太大，最大允许: {max_size_mb:.2f}MB"
            )
    
    # 确定存储类型
    if storage_type is None:
        storage_type = StorageType(settings.STORAGE_TYPE)
    
    # 生成文件名
    timestamp = int(datetime.now().timestamp())
    random_str = uuid.uuid4().hex[:8]
    filename = file.filename
    
    # 安全处理文件名
    safe_filename = f"{timestamp}_{random_str}_{filename}"
    
    # 存储路径
    if folder:
        filepath = os.path.join(folder, safe_filename)
    else:
        filepath = safe_filename
    
    # 根据存储类型处理
    if storage_type == StorageType.LOCAL:
        # 本地存储
        return await store_file_local(file, filepath)
    elif storage_type == StorageType.OSS:
        # 阿里云 OSS
        return await store_file_oss(file, filepath)
    elif storage_type == StorageType.COS:
        # 腾讯云 COS
        return await store_file_cos(file, filepath)
    else:
        raise HTTPException(status_code=500, detail=f"不支持的存储类型: {storage_type}")


async def upload_files(
    files: List[UploadFile],
    folder: str = "uploads",
    allowed_extensions: Optional[List[str]] = None,
    max_size: Optional[int] = None,
    storage_type: Optional[StorageType] = None
) -> List[dict]:
    """批量上传文件"""
    if not files:
        raise HTTPException(status_code=400, detail="没有文件")
    
    results = []
    for file in files:
        result = await upload_file(
            file=file,
            folder=folder,
            allowed_extensions=allowed_extensions,
            max_size=max_size,
            storage_type=storage_type
        )
        results.append(result)
    
    return results


async def store_file_local(file: UploadFile, filepath: str) -> dict:
    """本地存储文件"""
    # 确保目录存在
    os.makedirs(os.path.dirname(os.path.join(settings.STORAGE_LOCAL_DIR, filepath)), exist_ok=True)
    
    # 保存文件
    file_path = os.path.join(settings.STORAGE_LOCAL_DIR, filepath)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # 猜测 MIME 类型
    mime_type, _ = mimetypes.guess_type(file.filename)
    
    return {
        "url": f"/static/{filepath}",
        "filename": os.path.basename(filepath),
        "size": os.path.getsize(file_path),
        "mime_type": mime_type or "application/octet-stream"
    }


async def store_file_oss(file: UploadFile, filepath: str) -> dict:
    """阿里云 OSS 存储文件"""
    # 这里需要实现 OSS 存储的代码
    raise HTTPException(status_code=500, detail="OSS 存储尚未实现")


async def store_file_cos(file: UploadFile, filepath: str) -> dict:
    """腾讯云 COS 存储文件"""
    # 这里需要实现 COS 存储的代码
    raise HTTPException(status_code=500, detail="COS 存储尚未实现")


async def get_upload_config() -> dict:
    """获取上传配置"""
    return {
        "allowed_extensions": ["jpg", "jpeg", "png", "gif", "webp"],
        "max_size": 5 * 1024 * 1024,  # 5MB
        "upload_dir": "uploads",
        "storage_type": settings.STORAGE_TYPE,
        "domain": None
    }