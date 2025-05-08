from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException
import requests

from app.core.config import settings
from app.core.utils import calculate_distance
from backend.app.models.merchant import Merchant
from backend.app.models.user import Address


async def search_location(
    latitude: float,
    longitude: float,
    keyword: Optional[str] = None,
    radius: float = 5.0,
    type: Optional[str] = None
) -> List[Dict]:
    """
    搜索附近位置
    使用腾讯地图API
    """
    try:
        url = "https://apis.map.qq.com/ws/place/v1/search"
        params = {
            "key": settings.MAP_KEY,
            "boundary": f"nearby({latitude},{longitude},{int(radius * 1000)})",
            "page_size": 20,
            "page_index": 1,
            "output": "json"
        }
        
        if keyword:
            params["keyword"] = keyword
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if data["status"] == 0:
            results = []
            for item in data["data"]:
                # 计算距离
                item_lat = item["location"]["lat"]
                item_lng = item["location"]["lng"]
                distance = calculate_distance(latitude, longitude, item_lat, item_lng)
                
                results.append({
                    "id": item["id"],
                    "name": item["title"],
                    "address": item["address"],
                    "province": item.get("province", ""),
                    "city": item.get("city", ""),
                    "district": item.get("district", ""),
                    "latitude": item_lat,
                    "longitude": item_lng,
                    "distance": distance,
                    "type": item.get("category", "")
                })
            
            # 按距离排序
            results.sort(key=lambda x: x["distance"])
            
            return results
        else:
            raise HTTPException(status_code=400, detail=f"地图API错误: {data['message']}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"位置搜索失败: {str(e)}")


async def get_address_by_location(latitude: float, longitude: float) -> Dict:
    """
    根据经纬度获取地址
    使用腾讯地图API
    """
    try:
        url = "https://apis.map.qq.com/ws/geocoder/v1/"
        params = {
            "key": settings.MAP_KEY,
            "location": f"{latitude},{longitude}"
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if data["status"] == 0:
            result = data["result"]
            address_component = result["address_component"]
            
            return {
                "address": result["address"],
                "formatted_address": result["formatted_addresses"]["recommend"],
                "province": address_component["province"],
                "city": address_component["city"],
                "district": address_component["district"],
                "street": address_component["street"],
                "street_number": address_component["street_number"],
                "latitude": result["location"]["lat"],
                "longitude": result["location"]["lng"],
                "adcode": address_component["adcode"]
            }
        else:
            raise HTTPException(status_code=400, detail=f"地图API错误: {data['message']}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取地址失败: {str(e)}")


async def calculate_distance_api(
    start_latitude: float,
    start_longitude: float,
    end_latitude: float,
    end_longitude: float
) -> Dict:
    """
    计算两点之间的距离和时间
    使用腾讯地图API
    """
    try:
        url = "https://apis.map.qq.com/ws/distance/v1/"
        params = {
            "key": settings.MAP_KEY,
            "mode": "driving",  # 驾车模式
            "from": f"{start_latitude},{start_longitude}",
            "to": f"{end_latitude},{end_longitude}"
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if data["status"] == 0:
            result = data["result"]["elements"][0]
            
            return {
                "distance": result["distance"] / 1000,  # 转换为公里
                "duration": result["duration"]  # 秒
            }
        else:
            # 如果API调用失败，使用直线距离
            distance = calculate_distance(
                start_latitude, start_longitude,
                end_latitude, end_longitude
            )
            
            return {
                "distance": distance,
                "duration": None
            }
    
    except Exception as e:
        # 如果异常，使用直线距离
        distance = calculate_distance(
            start_latitude, start_longitude,
            end_latitude, end_longitude
        )
        
        return {
            "distance": distance,
            "duration": None
        }


async def get_delivery_fee(
    merchant_id: int,
    user_address_id: int,
    db: requests.Session
) -> float:
    """
    计算配送费
    """
    # 获取商户信息
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    
    # 获取用户地址
    address = db.query(Address).filter(Address.id == user_address_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="地址不存在")
    
    # 检查商户和用户地址是否有经纬度
    if not merchant.latitude or not merchant.longitude or not address.latitude or not address.longitude:
        # 如果没有经纬度，返回默认配送费
        return 5.0
    
    # 计算距离
    distance = calculate_distance(
        merchant.latitude, merchant.longitude,
        address.latitude, address.longitude
    )
    
    # 根据距离计算配送费
    if distance <= 3:
        return 5.0
    elif distance <= 5:
        return 7.0
    elif distance <= 10:
        return 10.0
    else:
        # 超过10公里，每增加1公里增加1元
        return 10.0 + (distance - 10) * 1.0


async def check_in_service_area(
    merchant_id: int,
    latitude: float,
    longitude: float,
    db: requests.Session
) -> bool:
    """
    检查位置是否在商户服务范围内
    """
    # 获取商户信息
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="商户不存在")
    
    # 检查商户是否有经纬度和服务半径
    if not merchant.latitude or not merchant.longitude or not merchant.service_radius:
        return False
    
    # 计算距离
    distance = calculate_distance(
        merchant.latitude, merchant.longitude,
        latitude, longitude
    )
    
    # 检查是否在服务半径内
    return distance <= merchant.service_radius