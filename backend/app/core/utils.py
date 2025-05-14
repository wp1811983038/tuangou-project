import json
import os
import random
import string
import time
import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Union

import requests
from fastapi import UploadFile

from app.core.config import settings
from app.core.constants import StorageType


class JSONEncoder(json.JSONEncoder):
    """
    自定义JSON编码器，处理日期和时间类型
    """
    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.strftime("%Y-%m-%d %H:%M:%S")
        elif isinstance(obj, date):
            return obj.strftime("%Y-%m-%d")
        return super().default(obj)


def generate_random_string(length: int = 8) -> str:
    """
    生成随机字符串
    
    Args:
        length: 字符串长度
        
    Returns:
        随机字符串
    """
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def generate_order_no() -> str:
    """
    生成订单编号
    
    Returns:
        订单编号
    """
    # 格式: 年月日时分秒 + 6位随机数
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = ''.join(random.choices(string.digits, k=6))
    return f"{timestamp}{random_str}"


def generate_uuid() -> str:
    """
    生成UUID
    
    Returns:
        UUID字符串
    """
    return str(uuid.uuid4())


def save_upload_file(upload_file: UploadFile, folder: str = "uploads") -> str:
    """
    保存上传文件
    
    Args:
        upload_file: 上传文件对象
        folder: 保存目录
        
    Returns:
        文件路径
    """
    # 确保目录存在
    os.makedirs(folder, exist_ok=True)
    
    # 生成文件名
    timestamp = int(time.time())
    random_str = generate_random_string(6)
    extension = os.path.splitext(upload_file.filename)[1] if upload_file.filename else ""
    filename = f"{timestamp}_{random_str}{extension}"
    
    # 保存文件路径
    file_path = os.path.join(folder, filename)
    
    # 保存文件
    with open(file_path, "wb") as f:
        f.write(upload_file.file.read())
    
    return file_path


async def store_file(
    upload_file: UploadFile, 
    folder: str = "",
    storage_type: Optional[StorageType] = None
) -> str:
    """
    存储文件，支持多种存储方式
    
    Args:
        upload_file: 上传文件
        folder: 存储目录
        storage_type: 存储类型
        
    Returns:
        文件URL
    """
    if storage_type is None:
        storage_type = StorageType(settings.STORAGE_TYPE)
    
    # 确保文件名安全
    timestamp = int(time.time())
    random_str = generate_random_string(6)
    extension = os.path.splitext(upload_file.filename)[1] if upload_file.filename else ""
    filename = f"{timestamp}_{random_str}{extension}"
    
    if folder:
        filepath = f"{folder}/{filename}"
    else:
        filepath = filename
    
    # 读取文件内容
    file_content = await upload_file.read()
    
    # 根据存储类型选择不同的存储方法
    if storage_type == StorageType.LOCAL:
        # 本地存储
        save_dir = os.path.join(settings.STORAGE_LOCAL_DIR, folder)
        os.makedirs(save_dir, exist_ok=True)
        file_path = os.path.join(save_dir, filename)
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return f"/static/{filepath}"
    
    elif storage_type == StorageType.OSS:
        # 阿里云OSS存储
        # 这里需要实现OSS存储的代码
        raise NotImplementedError("OSS存储尚未实现")
    
    elif storage_type == StorageType.COS:
        # 腾讯云COS存储
        # 这里需要实现COS存储的代码
        raise NotImplementedError("COS存储尚未实现")
    
    else:
        raise ValueError(f"不支持的存储类型: {storage_type}")


def format_dict_to_json(data: Dict[str, Any]) -> str:
    """
    格式化字典为JSON字符串
    
    Args:
        data: 字典数据
        
    Returns:
        JSON字符串
    """
    return json.dumps(data, ensure_ascii=False, cls=JSONEncoder)


def send_wechat_message(
    open_id: str, 
    template_id: str, 
    data: Dict[str, Dict[str, str]], 
    page: Optional[str] = None
) -> Dict[str, Any]:
    """
    发送微信模板消息
    
    Args:
        open_id: 用户OpenID
        template_id: 模板ID
        data: 模板数据
        page: 点击后跳转页面
        
    Returns:
        微信API响应
    """
    # 获取access_token的代码
    # 这里需要实现从缓存获取或重新请求微信API
    access_token = "YOUR_ACCESS_TOKEN"
    
    url = f"https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={access_token}"
    
    payload = {
        "touser": open_id,
        "template_id": template_id,
        "data": data
    }
    
    if page:
        payload["page"] = page
    
    response = requests.post(url, json=payload)
    return response.json()


def calculate_distance(
    lat1: float, 
    lng1: float, 
    lat2: float, 
    lng2: float
) -> float:
    """
    计算两点之间的距离(km)
    
    Args:
        lat1: 第一点纬度
        lng1: 第一点经度
        lat2: 第二点纬度
        lng2: 第二点经度
        
    Returns:
        距离(km)
    """
    import math
    
    # 将经纬度转换为弧度
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)
    
    # 地球半径(km)
    radius = 6371
    
    # Haversine公式
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad
    a = math.sin(dlat/2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng/2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = radius * c
    
    return distance


def calculate_boundaries(latitude: float, longitude: float, radius: float) -> dict:
    """计算服务半径边界坐标"""
    if not latitude or not longitude or not radius:
        return None
        
    # 地球半径(千米)
    EARTH_RADIUS = 6371
    
    # 转换纬度为弧度
    lat_rad = latitude * math.pi / 180
    
    # 计算1度经度对应的公里数（与纬度有关）
    km_per_lng_degree = 111.32 * math.cos(lat_rad)
    # 计算1度纬度对应的公里数（基本固定）
    km_per_lat_degree = 111.32
    
    # 计算边界
    north = latitude + (radius / km_per_lat_degree)
    south = latitude - (radius / km_per_lat_degree)
    east = longitude + (radius / km_per_lng_degree)
    west = longitude - (radius / km_per_lng_degree)
    
    return {
        'north': north,
        'south': south,
        'east': east,
        'west': west
    }