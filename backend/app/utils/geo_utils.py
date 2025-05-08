import math
from typing import Tuple, Dict, Any, List, Optional

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    计算两点之间的距离(km)
    使用Haversine公式
    
    Args:
        lat1: 第一点纬度
        lng1: 第一点经度
        lat2: 第二点纬度
        lng2: 第二点经度
        
    Returns:
        距离(km)
    """
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

def calculate_distance_list(coords: List[Tuple[float, float]]) -> float:
    """
    计算一系列坐标点的总距离
    
    Args:
        coords: 坐标点列表，每个元素为(lat, lng)
        
    Returns:
        总距离(km)
    """
    if len(coords) < 2:
        return 0
    
    total_distance = 0
    for i in range(len(coords) - 1):
        lat1, lng1 = coords[i]
        lat2, lng2 = coords[i + 1]
        total_distance += calculate_distance(lat1, lng1, lat2, lng2)
    
    return total_distance

def is_point_in_circle(point_lat: float, point_lng: float, center_lat: float, center_lng: float, radius_km: float) -> bool:
    """
    判断点是否在圆内
    
    Args:
        point_lat: 点纬度
        point_lng: 点经度
        center_lat: 圆心纬度
        center_lng: 圆心经度
        radius_km: 半径(km)
        
    Returns:
        是否在圆内
    """
    distance = calculate_distance(point_lat, point_lng, center_lat, center_lng)
    return distance <= radius_km

def geocode(address: str, api_key: str) -> Tuple[float, float]:
    """
    地理编码，将地址转换为经纬度
    
    Args:
        address: 地址
        api_key: API密钥
        
    Returns:
        (纬度, 经度)
        
    Raises:
        Exception: 地理编码失败
    """
    import requests
    
    url = "https://apis.map.qq.com/ws/geocoder/v1/"
    params = {
        "address": address,
        "key": api_key
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if data["status"] == 0:
        location = data["result"]["location"]
        return location["lat"], location["lng"]
    else:
        raise Exception(f"地理编码失败: {data['message']}")

def reverse_geocode(lat: float, lng: float, api_key: str) -> Dict[str, Any]:
    """
    反向地理编码，将经纬度转换为地址
    
    Args:
        lat: 纬度
        lng: 经度
        api_key: API密钥
        
    Returns:
        地址信息
    """
    import requests
    
    url = "https://apis.map.qq.com/ws/geocoder/v1/"
    params = {
        "location": f"{lat},{lng}",
        "key": api_key
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
            "street_number": address_component["street_number"]
        }
    else:
        raise Exception(f"反向地理编码失败: {data['message']}")

def calculate_center_point(coords: List[Tuple[float, float]]) -> Tuple[float, float]:
    """
    计算一组坐标的中心点
    
    Args:
        coords: 坐标点列表，每个元素为(lat, lng)
        
    Returns:
        中心点坐标(lat, lng)
    """
    if not coords:
        return (0, 0)
    
    # 简单平均值方法，适用于小范围区域
    lat_sum = sum(lat for lat, _ in coords)
    lng_sum = sum(lng for _, lng in coords)
    
    return (lat_sum / len(coords), lng_sum / len(coords))

def get_bounds(coords: List[Tuple[float, float]]) -> Tuple[Tuple[float, float], Tuple[float, float]]:
    """
    获取一组坐标的边界
    
    Args:
        coords: 坐标点列表，每个元素为(lat, lng)
        
    Returns:
        ((min_lat, min_lng), (max_lat, max_lng))
    """
    if not coords:
        return ((0, 0), (0, 0))
    
    lats = [lat for lat, _ in coords]
    lngs = [lng for _, lng in coords]
    
    return ((min(lats), min(lngs)), (max(lats), max(lngs)))

def search_nearby_poi(lat: float, lng: float, keyword: Optional[str] = None, radius: int = 1000, api_key: str = None) -> List[Dict[str, Any]]:
    """
    搜索附近兴趣点(POI)
    
    Args:
        lat: 纬度
        lng: 经度
        keyword: 关键词
        radius: 搜索半径(米)
        api_key: API密钥
        
    Returns:
        POI列表
    """
    import requests
    
    url = "https://apis.map.qq.com/ws/place/v1/search"
    params = {
        "boundary": f"nearby({lat},{lng},{radius})",
        "key": api_key
    }
    
    if keyword:
        params["keyword"] = keyword
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if data["status"] == 0:
        pois = []
        for poi in data["data"]:
            location = poi["location"]
            distance = calculate_distance(lat, lng, location["lat"], location["lng"]) * 1000  # 转换为米
            
            pois.append({
                "id": poi["id"],
                "name": poi["title"],
                "address": poi.get("address", ""),
                "category": poi.get("category", ""),
                "lat": location["lat"],
                "lng": location["lng"],
                "distance": distance
            })
        
        return pois
    else:
        raise Exception(f"搜索POI失败: {data['message']}")

def format_distance(distance_km: float) -> str:
    """
    格式化距离
    
    Args:
        distance_km: 距离(km)
        
    Returns:
        格式化后的距离字符串
    """
    if distance_km < 0.1:
        return f"{int(distance_km * 1000)}米"
    elif distance_km < 1:
        return f"{distance_km * 1000:.0f}米"
    else:
        return f"{distance_km:.1f}公里"

def calculate_delivery_fee(distance_km: float, base_fee: float = 5.0, free_distance_km: float = 3.0, fee_per_km: float = 1.0) -> float:
    """
    计算配送费
    
    Args:
        distance_km: 距离(km)
        base_fee: 基础配送费
        free_distance_km: 免费配送距离(km)
        fee_per_km: 每公里费用
        
    Returns:
        配送费
    """
    if distance_km <= free_distance_km:
        return base_fee
    
    extra_distance = distance_km - free_distance_km
    extra_fee = math.ceil(extra_distance) * fee_per_km
    
    return base_fee + extra_fee