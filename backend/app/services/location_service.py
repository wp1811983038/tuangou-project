import math
from typing import Dict, List, Optional, Tuple, Union

from fastapi import HTTPException
import requests

from app.core.config import settings
from app.core.utils import calculate_distance
from app.models.merchant import Merchant
from app.models.user import Address
from app.core.redis import RedisClient
from app.core.constants import CACHE_EXPIRE_TIME, CACHE_KEY_PREFIX


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


async def geocode_address(
    address: str,
    province: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
    use_cache: bool = True
) -> Dict:
    """
    将地址转换为经纬度坐标
    使用腾讯地图API
    """
    try:
        # 构建完整地址
        full_address = ""
        if province:
            full_address += province
        if city:
            full_address += city
        if district:
            full_address += district
        full_address += address
        
        # 检查地址是否为空
        if not full_address.strip():
            raise HTTPException(
                status_code=400,
                detail="地址不能为空"
            )
        
        # 检查缓存
        if use_cache:
            try:
                cache_key = f"geocode:{full_address}"
                print(f"调试 - 缓存键: {cache_key}")
                cached_result = RedisClient.get(cache_key)
                if cached_result:
                    print("调试 - 使用缓存结果")
                    return cached_result
            except Exception as cache_err:
                print(f"调试 - 缓存错误: {str(cache_err)}")
            
        url = "https://apis.map.qq.com/ws/geocoder/v1/"
        params = {
            "key": settings.MAP_KEY,
            "address": full_address
        }
        
        print(f"调试 - 准备请求 URL: {url}")
        print(f"调试 - 带参数的 URL: {url}?address={full_address}&key=***")
        
        # 添加超时设置
        try:
            print("调试 - 发送请求...")
            response = requests.get(url, params=params, timeout=5)
            print(f"调试 - 响应状态码: {response.status_code}")
            
            if response.status_code != 200:
                print(f"调试 - 错误响应: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"地图服务响应错误: {response.status_code}"
                )
                
            data = response.json()
            print(f"调试 - API状态码: {data.get('status')}")
            print(f"调试 - API消息: {data.get('message', '无消息')}")
            
        except requests.Timeout:
            print("调试 - 请求超时")
            raise HTTPException(
                status_code=504,
                detail="地图服务请求超时"
            )
        except requests.RequestException as req_err:
            print(f"调试 - 请求异常: {str(req_err)}")
            raise HTTPException(
                status_code=500,
                detail=f"地图服务请求异常: {str(req_err)}"
            )
            
        if data["status"] == 0:
            # 处理找不到结果的情况
            if not data.get("result"):
                print("调试 - API返回成功但没有结果")
                raise HTTPException(
                    status_code=404,
                    detail="找不到该地址对应的地理位置"
                )
                
            result = data["result"]
            print("调试 - 成功获取结果")
            
            try:
                address_components = result["address_components"]
                
                result_dict = {
                    "latitude": result["location"]["lat"],
                    "longitude": result["location"]["lng"],
                    "address": full_address,
                    "formatted_address": result.get("title", full_address),
                    "province": address_components["province"],
                    "city": address_components["city"],
                    "district": address_components["district"],
                    "adcode": result.get("ad_info", {}).get("adcode", ""),
                    "confidence": result.get("similarity", None)
                }
                
                print(f"调试 - 最终结果: 经度={result_dict['longitude']}, 纬度={result_dict['latitude']}")
                
                # 缓存结果
                if use_cache:
                    try:
                        cache_expiry = 86400  # 默认1天
                        print(f"调试 - 缓存结果, 有效期: {cache_expiry}秒")
                        RedisClient.set(
                            cache_key, 
                            result_dict, 
                            cache_expiry
                        )
                    except Exception as cache_err:
                        print(f"调试 - 缓存存储错误: {str(cache_err)}")
                    
                return result_dict
            except KeyError as key_err:
                print(f"调试 - 解析结果时出现键错误: {str(key_err)}")
                print(f"调试 - 结果结构: {result}")
                raise HTTPException(
                    status_code=500,
                    detail=f"解析地图API结果失败: {str(key_err)}"
                )
        else:
            print(f"调试 - API返回错误: 状态码{data['status']}, 消息: {data.get('message', '无消息')}")
            raise HTTPException(
                status_code=400, 
                detail=f"地图API错误: {data.get('message', '未知错误')}"
            )
            
    except HTTPException:
        # 继续抛出HTTP异常
        raise
    except Exception as e:
        print(f"调试 - 未捕获异常: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"地理编码失败: {str(e)}"
        )

async def batch_geocode_addresses(
    addresses: List[Dict],
    use_cache: bool = True
) -> List[Dict]:
    """
    批量地址转经纬度
    
    Args:
        addresses: 地址列表，每个地址为字典格式包含address字段
        use_cache: 是否使用缓存
        
    Returns:
        经纬度和地址详情列表
    """
    results = []
    for addr in addresses:
        try:
            result = await geocode_address(
                address=addr.get("address", ""),
                province=addr.get("province"),
                city=addr.get("city"),
                district=addr.get("district"),
                use_cache=use_cache
            )
            # 添加成功状态
            result["status"] = "success"
            results.append(result)
        except HTTPException as e:
            # 将错误信息添加到结果中
            results.append({
                "address": addr.get("address", ""),
                "province": addr.get("province", ""),
                "city": addr.get("city", ""),
                "district": addr.get("district", ""),
                "error": e.detail,
                "status": "failed"
            })
    
    return results


async def suggest_address(
    keyword: str,
    region: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None
) -> List[Dict]:
    """
    地址输入提示
    使用腾讯地图API的关键词输入提示功能
    
    Args:
        keyword: 关键词
        region: 地区，如城市名称
        latitude: 当前位置纬度，用于优先返回附近的地点
        longitude: 当前位置经度
        
    Returns:
        地址提示列表
    """
    try:
        if not keyword:
            return []
            
        url = "https://apis.map.qq.com/ws/place/v1/suggestion"
        params = {
            "key": settings.MAP_KEY,
            "keyword": keyword,
            "output": "json"
        }
        
        # 添加地区限制
        if region:
            params["region"] = region
            
        # 添加位置信息
        if latitude is not None and longitude is not None:
            params["location"] = f"{latitude},{longitude}"
            
        response = requests.get(url, params=params, timeout=3)
        data = response.json()
        
        if data["status"] == 0:
            results = []
            for item in data["data"]:
                results.append({
                    "id": item.get("id", ""),
                    "title": item["title"],
                    "address": item.get("address", ""),
                    "province": item.get("province", ""),
                    "city": item.get("city", ""),
                    "district": item.get("district", ""),
                    "latitude": item.get("location", {}).get("lat"),
                    "longitude": item.get("location", {}).get("lng"),
                    "category": item.get("category", "")
                })
                
            return results
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"地址提示API错误: {data.get('message', '未知错误')}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取地址提示失败: {str(e)}"
        )
    


import math
import logging

def calculate_boundary_coordinates(latitude: float, longitude: float, radius: float) -> dict:
    """
    计算指定经纬度和半径的边界坐标
    
    Args:
        latitude: 纬度
        longitude: 经度
        radius: 半径(公里)
        
    Returns:
        包含边界坐标的字典
    """
    logging.error("===== 开始计算边界坐标 =====")
    
    if not latitude or not longitude or not radius:
        logging.error("❌ 无法计算边界坐标：缺少经纬度或半径值")
        return None
    
    try:
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
        
        boundary_points = {
            "center": {"latitude": latitude, "longitude": longitude},
            "radius": radius,
            "north": round(north, 6),
            "south": round(south, 6),
            "east": round(east, 6),
            "west": round(west, 6),
            "coverage_area_km2": round(math.pi * (radius ** 2), 2)
        }
        
        logging.error("\n★★★★★ 商户服务区域边界坐标计算结果 ★★★★★")
        logging.error(f"中心点坐标: ({latitude}, {longitude})")
        logging.error(f"服务半径: {radius} 公里")
        logging.error(f"北边界纬度: {north:.6f}°")
        logging.error(f"南边界纬度: {south:.6f}°")
        logging.error(f"东边界经度: {east:.6f}°")
        logging.error(f"西边界经度: {west:.6f}°")
        logging.error(f"覆盖面积: 约 {boundary_points['coverage_area_km2']} 平方公里")
        logging.error("★★★★★ 计算完成 ★★★★★\n")
        
        return boundary_points
    except Exception as e:
        logging.error(f"❌❌❌ 计算边界坐标时出错: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())
        return None
    

def calculate_boundary_points(latitude: float, longitude: float, radius: float) -> dict:
    """
    计算服务半径边界坐标（纯计算函数，不依赖于日志）
    """
    if not latitude or not longitude or not radius:
        return {
            "error": "缺少经纬度或半径值",
            "valid": False
        }
    
    try:
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
            "valid": True,
            "center": {
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6)
            },
            "radius_km": radius,
            "boundaries": {
                "north": round(north, 6),
                "south": round(south, 6),
                "east": round(east, 6),
                "west": round(west, 6)
            },
            "coverage_area_km2": round(math.pi * (radius ** 2), 2)
        }
    except Exception as e:
        return {
            "error": f"计算错误: {str(e)}",
            "valid": False
        }