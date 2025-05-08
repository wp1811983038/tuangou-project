import json
import logging
from typing import Any, Dict, List, Optional, Union

import redis

from app.core.config import settings
from app.core.utils import JSONEncoder


class RedisClient:
    """
    Redis客户端封装
    """
    _instance = None
    _client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisClient, cls).__new__(cls)
            cls._client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=True  # 自动解码为字符串
            )
        return cls._instance
    
    @classmethod
    def get_client(cls) -> redis.Redis:
        """
        获取Redis客户端

        Returns:
            Redis客户端实例
        """
        if cls._client is None:
            cls()
        return cls._client
    
    @classmethod
    def set(cls, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """
        设置键值

        Args:
            key: 键名
            value: 值
            expire: 过期时间(秒)

        Returns:
            是否成功
        """
        client = cls.get_client()
        
        if isinstance(value, (dict, list)):
            value = json.dumps(value, ensure_ascii=False, cls=JSONEncoder)
        elif not isinstance(value, (str, int, float, bool)):
            value = str(value)
        
        try:
            client.set(key, value)
            if expire:
                client.expire(key, expire)
            return True
        except Exception as e:
            logging.error(f"Redis设置键值失败: {e}")
            return False
    
    @classmethod
    def get(cls, key: str) -> Any:
        """
        获取键值

        Args:
            key: 键名

        Returns:
            键值
        """
        client = cls.get_client()
        
        try:
            value = client.get(key)
            
            if value is None:
                return None
            
            # 尝试解析JSON
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        except Exception as e:
            logging.error(f"Redis获取键值失败: {e}")
            return None
    
    @classmethod
    def delete(cls, key: str) -> bool:
        """
        删除键

        Args:
            key: 键名

        Returns:
            是否成功
        """
        client = cls.get_client()
        
        try:
            return bool(client.delete(key))
        except Exception as e:
            logging.error(f"Redis删除键失败: {e}")
            return False
    
    @classmethod
    def exists(cls, key: str) -> bool:
        """
        检查键是否存在

        Args:
            key: 键名

        Returns:
            是否存在
        """
        client = cls.get_client()
        
        try:
            return bool(client.exists(key))
        except Exception as e:
            logging.error(f"Redis检查键是否存在失败: {e}")
            return False
    
    @classmethod
    def expire(cls, key: str, seconds: int) -> bool:
        """
        设置键过期时间

        Args:
            key: 键名
            seconds: 过期时间(秒)

        Returns:
            是否成功
        """
        client = cls.get_client()
        
        try:
            return bool(client.expire(key, seconds))
        except Exception as e:
            logging.error(f"Redis设置键过期时间失败: {e}")
            return False
    
    @classmethod
    def ttl(cls, key: str) -> int:
        """
        获取键剩余过期时间

        Args:
            key: 键名

        Returns:
            剩余时间(秒),-1表示永不过期,-2表示键不存在
        """
        client = cls.get_client()
        
        try:
            return client.ttl(key)
        except Exception as e:
            logging.error(f"Redis获取键剩余过期时间失败: {e}")
            return -2
    
    @classmethod
    def incr(cls, key: str, amount: int = 1) -> int:
        """
        键值递增

        Args:
            key: 键名
            amount: 递增量

        Returns:
            递增后的值
        """
        client = cls.get_client()
        
        try:
            return client.incrby(key, amount)
        except Exception as e:
            logging.error(f"Redis键值递增失败: {e}")
            return 0
    
    @classmethod
    def decr(cls, key: str, amount: int = 1) -> int:
        """
        键值递减

        Args:
            key: 键名
            amount: 递减量

        Returns:
            递减后的值
        """
        client = cls.get_client()
        
        try:
            return client.decrby(key, amount)
        except Exception as e:
            logging.error(f"Redis键值递减失败: {e}")
            return 0
    
    @classmethod
    def hset(cls, name: str, key: str, value: Any) -> bool:
        """
        设置哈希表字段

        Args:
            name: 哈希表名
            key: 字段名
            value: 值

        Returns:
            是否成功
        """
        client = cls.get_client()
        
        if isinstance(value, (dict, list)):
            value = json.dumps(value, ensure_ascii=False, cls=JSONEncoder)
        elif not isinstance(value, (str, int, float, bool)):
            value = str(value)
        
        try:
            client.hset(name, key, value)
            return True
        except Exception as e:
            logging.error(f"Redis设置哈希表字段失败: {e}")
            return False
    
    @classmethod
    def hget(cls, name: str, key: str) -> Any:
        """
        获取哈希表字段

        Args:
            name: 哈希表名
            key: 字段名

        Returns:
            字段值
        """
        client = cls.get_client()
        
        try:
            value = client.hget(name, key)
            
            if value is None:
                return None
            
            # 尝试解析JSON
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        except Exception as e:
            logging.error(f"Redis获取哈希表字段失败: {e}")
            return None
    
    @classmethod
    def hgetall(cls, name: str) -> Dict:
        """
        获取哈希表所有字段

        Args:
            name: 哈希表名

        Returns:
            字段字典
        """
        client = cls.get_client()
        
        try:
            result = client.hgetall(name)
            
            # 尝试解析每个值的JSON
            for key, value in result.items():
                try:
                    result[key] = json.loads(value)
                except json.JSONDecodeError:
                    pass
            
            return result
        except Exception as e:
            logging.error(f"Redis获取哈希表所有字段失败: {e}")
            return {}
    
    @classmethod
    def hdel(cls, name: str, *keys: str) -> int:
        """
        删除哈希表字段

        Args:
            name: 哈希表名
            keys: 字段名列表

        Returns:
            删除成功的字段数
        """
        client = cls.get_client()
        
        try:
            return client.hdel(name, *keys)
        except Exception as e:
            logging.error(f"Redis删除哈希表字段失败: {e}")
            return 0
    
    @classmethod
    def hexists(cls, name: str, key: str) -> bool:
        """
        检查哈希表字段是否存在

        Args:
            name: 哈希表名
            key: 字段名

        Returns:
            是否存在
        """
        client = cls.get_client()
        
        try:
            return bool(client.hexists(name, key))
        except Exception as e:
            logging.error(f"Redis检查哈希表字段是否存在失败: {e}")
            return False