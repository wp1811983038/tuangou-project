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
    merchant_id: Optional[int] = None,  # 新增商户ID参数
    allowed_extensions: Optional[List[str]] = None,
    max_size: Optional[int] = None,
    storage_type: Optional[StorageType] = None
) -> dict:
    """上传单个文件，支持按商户分隔存储"""
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
    original_filename = file.filename
    
    # 安全处理文件名
    safe_filename = f"{timestamp}_{random_str}_{original_filename}"
    
    # 存储路径 - 使用商户ID创建子目录
    if merchant_id:
        # 商户专属文件夹
        merchant_folder = f"merchant_{merchant_id}"
        if folder:
            filepath = os.path.join(folder, merchant_folder, safe_filename)
        else:
            filepath = os.path.join(merchant_folder, safe_filename)
    else:
        # 无商户ID时使用公共文件夹
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
    merchant_id: Optional[int] = None,  # 新增商户ID参数
    allowed_extensions: Optional[List[str]] = None,
    max_size: Optional[int] = None,
    storage_type: Optional[StorageType] = None
) -> List[dict]:
    """批量上传文件，支持按商户分隔存储"""
    if not files:
        raise HTTPException(status_code=400, detail="没有文件")
    
    results = []
    for file in files:
        result = await upload_file(
            file=file,
            folder=folder,
            merchant_id=merchant_id,  # 传递商户ID
            allowed_extensions=allowed_extensions,
            max_size=max_size,
            storage_type=storage_type
        )
        results.append(result)
    
    return results


async def store_file_local(file: UploadFile, filepath: str) -> dict:
    """本地存储文件，支持商户子目录结构"""
    # 确保目录存在（包括商户子目录）
    full_dir_path = os.path.dirname(os.path.join(settings.STORAGE_LOCAL_DIR, filepath))
    os.makedirs(full_dir_path, exist_ok=True)
    
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


async def get_image_upload_config() -> dict:
    """获取图片上传专用配置"""
    config = await get_upload_config()
    config["upload_dir"] = "images"
    config["allowed_extensions"] = ["jpg", "jpeg", "png", "gif", "webp"]
    return config


async def delete_file(file_path: str) -> bool:
    """删除文件
    
    Args:
        file_path: 文件路径，如"/static/uploads/images/merchant_1/1234567890_abcdef_logo.jpg"
        
    Returns:
        bool: 是否删除成功
    """
    # 从静态URL路径转换为实际文件路径
    if file_path.startswith("/static/"):
        file_path = file_path[8:]  # 移除"/static/"前缀
    
    full_path = os.path.join(settings.STORAGE_LOCAL_DIR, file_path)
    
    # 检查文件是否存在
    if not os.path.exists(full_path):
        return False
    
    try:
        # 删除文件
        os.remove(full_path)
        return True
    except Exception as e:
        print(f"删除文件失败: {str(e)}")
        return False


async def get_file_info(file_path: str) -> Optional[dict]:
    """获取文件信息
    
    Args:
        file_path: 文件路径，如"/static/uploads/images/merchant_1/1234567890_abcdef_logo.jpg"
        
    Returns:
        dict: 文件信息，包含大小、类型等
    """
    # 从静态URL路径转换为实际文件路径
    if file_path.startswith("/static/"):
        file_path = file_path[8:]  # 移除"/static/"前缀
    
    full_path = os.path.join(settings.STORAGE_LOCAL_DIR, file_path)
    
    # 检查文件是否存在
    if not os.path.exists(full_path):
        return None
    
    try:
        # 获取文件信息
        filename = os.path.basename(file_path)
        size = os.path.getsize(full_path)
        mime_type, _ = mimetypes.guess_type(filename)
        
        return {
            "url": f"/static/{file_path}",
            "filename": filename,
            "size": size,
            "mime_type": mime_type or "application/octet-stream",
            "last_modified": datetime.fromtimestamp(os.path.getmtime(full_path))
        }
    except Exception as e:
        print(f"获取文件信息失败: {str(e)}")
        return None