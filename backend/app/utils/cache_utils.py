import time
import json
import pickle
import hashlib
from typing import Any, Dict, List, Optional, Tuple, Union, Callable
from functools import wraps

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# 内存缓存
_local_cache: Dict[str, Tuple[Any, float, Optional[float]]] = {}  # key -> (value, timestamp, ttl)

def cache_key(*args: Any, **kwargs: Any) -> str:
    """
    生成缓存键
    
    Args:
        *args: 位置参数
        **kwargs: 关键字参数
        
    Returns:
        缓存键
    """
    # 将参数转换为字符串
    key_parts = []
    
    # 添加位置参数
    for arg in args:
        key_parts.append(str(arg))
    
    # 添加关键字参数（按键排序）
    for k in sorted(kwargs.keys()):
        key_parts.append(f"{k}={kwargs[k]}")
    
    # 生成键
    key = ":".join(key_parts)
    
    # 如果键太长，使用哈希值
    if len(key) > 100:
        key = hashlib.md5(key.encode()).hexdigest()
    
    return key

def set_cache(key: str, value: Any, ttl: Optional[int] = None) -> bool:
    """
    设置本地缓存
    
    Args:
        key: 缓存键
        value: 缓存值
        ttl: 过期时间(秒)
        
    Returns:
        是否成功
    """
    timestamp = time.time()
    _local_cache[key] = (value, timestamp, ttl)
    return True

def get_cache(key: str) -> Optional[Any]:
    """
    获取本地缓存
    
    Args:
        key: 缓存键
        
    Returns:
        缓存值，不存在或已过期返回None
    """
    if key not in _local_cache:
        return None
    
    value, timestamp, ttl = _local_cache[key]
    
    # 检查是否已过期
    if ttl is not None:
        if time.time() - timestamp > ttl:
            # 已过期，删除缓存
            del _local_cache[key]
            return None
    
    return value

def delete_cache(key: str) -> bool:
    """
    删除本地缓存
    
    Args:
        key: 缓存键
        
    Returns:
        是否成功
    """
    if key in _local_cache:
        del _local_cache[key]
        return True
    return False

def clear_cache() -> None:
    """
    清空本地缓存
    """
    _local_cache.clear()

def redis_set(key: str, value: Any, ttl: Optional[int] = None, redis_client: Optional[redis.Redis] = None) -> bool:
    """
    设置Redis缓存
    
    Args:
        key: 缓存键
        value: 缓存值
        ttl: 过期时间(秒)
        redis_client: Redis客户端
        
    Returns:
        是否成功
        
    Raises:
        ModuleNotFoundError: Redis模块未安装
    """
    if not REDIS_AVAILABLE:
        raise ModuleNotFoundError("缺少Redis模块，请安装: pip install redis")
    
    if redis_client is None:
        raise ValueError("缺少Redis客户端")
    
    # 序列化值
    if isinstance(value, (dict, list, tuple, set)):
        value = json.dumps(value)
    elif not isinstance(value, (str, int, float, bool)):
        value = pickle.dumps(value)
    
    # 设置缓存
    if ttl is None:
        result = redis_client.set(key, value)
    else:
        result = redis_client.setex(key, ttl, value)
    
    return bool(result)

def redis_get(key: str, redis_client: Optional[redis.Redis] = None) -> Optional[Any]:
    """
    获取Redis缓存
    
    Args:
        key: 缓存键
        redis_client: Redis客户端
        
    Returns:
        缓存值，不存在返回None
        
    Raises:
        ModuleNotFoundError: Redis模块未安装
    """
    if not REDIS_AVAILABLE:
        raise ModuleNotFoundError("缺少Redis模块，请安装: pip install redis")
    
    if redis_client is None:
        raise ValueError("缺少Redis客户端")
    
    # 获取缓存
    value = redis_client.get(key)
    
    if value is None:
        return None
    
    # 尝试反序列化
    if isinstance(value, bytes):
        try:
            # 尝试解析JSON
            value = value.decode('utf-8')
            return json.loads(value)
        except (json.JSONDecodeError, UnicodeDecodeError):
            try:
                # 尝试解析Pickle
                return pickle.loads(value)
            except:
                # 返回原始值
                return value
    
    return value

def redis_delete(key: str, redis_client: Optional[redis.Redis] = None) -> bool:
    """
    删除Redis缓存
    
    Args:
        key: 缓存键
        redis_client: Redis客户端
        
    Returns:
        是否成功
        
    Raises:
        ModuleNotFoundError: Redis模块未安装
    """
    if not REDIS_AVAILABLE:
        raise ModuleNotFoundError("缺少Redis模块，请安装: pip install redis")
    
    if redis_client is None:
        raise ValueError("缺少Redis客户端")
    
    return bool(redis_client.delete(key))

def cache_decorator(ttl: Optional[int] = None, prefix: str = "", use_redis: bool = False, redis_client: Optional[redis.Redis] = None):
    """
    缓存装饰器
    
    Args:
        ttl: 过期时间(秒)
        prefix: 缓存键前缀
        use_redis: 是否使用Redis
        redis_client: Redis客户端
        
    Returns:
        装饰器函数
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 生成缓存键
            base_key = f"{prefix}:{func.__module__}.{func.__name__}"
            arguments_key = cache_key(*args, **kwargs)
            cache_key_str = f"{base_key}:{arguments_key}"
            
            # 尝试获取缓存
            if use_redis:
                if not REDIS_AVAILABLE:
                    raise ModuleNotFoundError("缺少Redis模块，请安装: pip install redis")
                
                if redis_client is None:
                    raise ValueError("缺少Redis客户端")
                
                cached_value = redis_get(cache_key_str, redis_client)
            else:
                cached_value = get_cache(cache_key_str)
            
            if cached_value is not None:
                return cached_value
            
            # 执行函数
            result = func(*args, **kwargs)
            
            # 缓存结果
            if use_redis:
                redis_set(cache_key_str, result, ttl, redis_client)
            else:
                set_cache(cache_key_str, result, ttl)
            
            return result
        
        # 添加清除缓存的方法
        def clear_cache_func(cls_or_self = None, *args, **kwargs):
            if cls_or_self is not None and not isinstance(cls_or_self, type):
                args = (cls_or_self,) + args
            
            base_key = f"{prefix}:{func.__module__}.{func.__name__}"
            
            if args or kwargs:
                # 清除特定参数的缓存
                arguments_key = cache_key(*args, **kwargs)
                cache_key_str = f"{base_key}:{arguments_key}"
                
                if use_redis:
                    redis_delete(cache_key_str, redis_client)
                else:
                    delete_cache(cache_key_str)
            else:
                # 清除所有该函数的缓存
                pass  # 需要模式匹配，本地缓存和Redis实现方式不同
        
        wrapper.clear_cache = clear_cache_func
        return wrapper
    
    return decorator