import os
import re
import shutil
import mimetypes
import uuid
from pathlib import Path
from typing import Optional, List, Tuple, BinaryIO

def ensure_dir(dir_path: str) -> None:
    """
    确保目录存在，如果不存在则创建
    
    Args:
        dir_path: 目录路径
    """
    os.makedirs(dir_path, exist_ok=True)

def get_file_extension(filename: str) -> str:
    """
    获取文件扩展名
    
    Args:
        filename: 文件名
        
    Returns:
        扩展名（不含.）
    """
    return os.path.splitext(filename)[1].lstrip('.')

def get_safe_filename(filename: str) -> str:
    """
    获取安全的文件名，移除危险字符
    
    Args:
        filename: 原始文件名
        
    Returns:
        安全的文件名
    """
    # 移除路径分隔符和其他危险字符
    unsafe_chars = r'[\\/:*?"<>|]'
    safe_name = re.sub(unsafe_chars, '_', filename)
    return safe_name

def generate_unique_filename(original_filename: str) -> str:
    """
    生成唯一文件名
    
    Args:
        original_filename: 原始文件名
        
    Returns:
        唯一文件名
    """
    ext = get_file_extension(original_filename)
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    return unique_name

def get_mime_type(filename: str) -> str:
    """
    获取文件MIME类型
    
    Args:
        filename: 文件名
        
    Returns:
        MIME类型
    """
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or 'application/octet-stream'

def is_image_file(filename: str) -> bool:
    """
    判断文件是否为图片
    
    Args:
        filename: 文件名
        
    Returns:
        是否是图片
    """
    mime_type = get_mime_type(filename)
    return mime_type and mime_type.startswith('image/')

def is_allowed_file(filename: str, allowed_extensions: List[str]) -> bool:
    """
    判断文件类型是否允许
    
    Args:
        filename: 文件名
        allowed_extensions: 允许的扩展名列表
        
    Returns:
        是否允许
    """
    return get_file_extension(filename).lower() in [ext.lower() for ext in allowed_extensions]

def get_file_size(file_path: str) -> int:
    """
    获取文件大小
    
    Args:
        file_path: 文件路径
        
    Returns:
        文件大小(字节)
    """
    return os.path.getsize(file_path)

def read_file(file_path: str, mode: str = 'r', encoding: Optional[str] = 'utf-8') -> str:
    """
    读取文件内容
    
    Args:
        file_path: 文件路径
        mode: 读取模式
        encoding: 编码方式
        
    Returns:
        文件内容
    """
    with open(file_path, mode, encoding=encoding) as f:
        return f.read()

def write_file(file_path: str, content: str, mode: str = 'w', encoding: str = 'utf-8') -> None:
    """
    写入文件内容
    
    Args:
        file_path: 文件路径
        content: 文件内容
        mode: 写入模式
        encoding: 编码方式
    """
    ensure_dir(os.path.dirname(file_path))
    with open(file_path, mode, encoding=encoding) as f:
        f.write(content)

def append_file(file_path: str, content: str, encoding: str = 'utf-8') -> None:
    """
    追加文件内容
    
    Args:
        file_path: 文件路径
        content: 追加内容
        encoding: 编码方式
    """
    write_file(file_path, content, 'a', encoding)

def copy_file(src_path: str, dst_path: str) -> None:
    """
    复制文件
    
    Args:
        src_path: 源文件路径
        dst_path: 目标文件路径
    """
    ensure_dir(os.path.dirname(dst_path))
    shutil.copy2(src_path, dst_path)

def move_file(src_path: str, dst_path: str) -> None:
    """
    移动文件
    
    Args:
        src_path: 源文件路径
        dst_path: 目标文件路径
    """
    ensure_dir(os.path.dirname(dst_path))
    shutil.move(src_path, dst_path)

def delete_file(file_path: str) -> bool:
    """
    删除文件
    
    Args:
        file_path: 文件路径
        
    Returns:
        是否删除成功
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception:
        return False

def list_files(dir_path: str, recursive: bool = False, pattern: Optional[str] = None) -> List[str]:
    """
    列出目录中的文件
    
    Args:
        dir_path: 目录路径
        recursive: 是否递归子目录
        pattern: 文件名模式
        
    Returns:
        文件路径列表
    """
    result = []
    if recursive:
        for root, _, files in os.walk(dir_path):
            for file in files:
                if pattern is None or re.match(pattern, file):
                    result.append(os.path.join(root, file))
    else:
        for item in os.listdir(dir_path):
            item_path = os.path.join(dir_path, item)
            if os.path.isfile(item_path) and (pattern is None or re.match(pattern, item)):
                result.append(item_path)
    
    return result

def get_file_info(file_path: str) -> dict:
    """
    获取文件信息
    
    Args:
        file_path: 文件路径
        
    Returns:
        文件信息字典
    """
    stat = os.stat(file_path)
    return {
        'path': file_path,
        'name': os.path.basename(file_path),
        'size': stat.st_size,
        'created_at': datetime.fromtimestamp(stat.st_ctime),
        'modified_at': datetime.fromtimestamp(stat.st_mtime),
        'extension': get_file_extension(file_path),
        'mime_type': get_mime_type(file_path)
    }