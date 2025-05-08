import json
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Any, Union, Optional

def to_dict(obj: Any) -> Dict[str, Any]:
    """
    将对象转换为字典
    
    Args:
        obj: 对象
        
    Returns:
        字典
    """
    if hasattr(obj, "__dict__"):
        result = obj.__dict__.copy()
        # 移除私有属性
        for key in list(result.keys()):
            if key.startswith("_"):
                del result[key]
        return result
    elif hasattr(obj, "to_dict"):
        return obj.to_dict()
    else:
        return obj

def obj_to_dict(obj: Any, exclude_keys: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    将对象转换为字典，支持嵌套对象
    
    Args:
        obj: 对象
        exclude_keys: 排除的键列表
        
    Returns:
        字典
    """
    if exclude_keys is None:
        exclude_keys = []
    
    if hasattr(obj, "__dict__"):
        result = {}
        for key, value in obj.__dict__.items():
            if key not in exclude_keys and not key.startswith("_"):
                if hasattr(value, "__dict__") or isinstance(value, (list, tuple, set)):
                    result[key] = obj_to_dict(value, exclude_keys)
                else:
                    result[key] = value
        return result
    elif isinstance(obj, (list, tuple, set)):
        return [obj_to_dict(item, exclude_keys) for item in obj]
    elif isinstance(obj, dict):
        return {key: obj_to_dict(value, exclude_keys) for key, value in obj.items() if key not in exclude_keys}
    else:
        return obj

def snake_to_camel(snake_str: str) -> str:
    """
    蛇形命名转驼峰命名
    
    Args:
        snake_str: 蛇形命名字符串
        
    Returns:
        驼峰命名字符串
    """
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def camel_to_snake(camel_str: str) -> str:
    """
    驼峰命名转蛇形命名
    
    Args:
        camel_str: 驼峰命名字符串
        
    Returns:
        蛇形命名字符串
    """
    import re
    
    pattern = re.compile(r'(?<!^)(?=[A-Z])')
    return pattern.sub('_', camel_str).lower()

def dict_keys_to_camel(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    将字典的键名从蛇形命名转为驼峰命名
    
    Args:
        data: 原始字典
        
    Returns:
        转换后的字典
    """
    result = {}
    for key, value in data.items():
        if isinstance(value, dict):
            value = dict_keys_to_camel(value)
        elif isinstance(value, list):
            value = [
                dict_keys_to_camel(item) if isinstance(item, dict) else item
                for item in value
            ]
        
        result[snake_to_camel(key)] = value
    
    return result

def dict_keys_to_snake(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    将字典的键名从驼峰命名转为蛇形命名
    
    Args:
        data: 原始字典
        
    Returns:
        转换后的字典
    """
    result = {}
    for key, value in data.items():
        if isinstance(value, dict):
            value = dict_keys_to_snake(value)
        elif isinstance(value, list):
            value = [
                dict_keys_to_snake(item) if isinstance(item, dict) else item
                for item in value
            ]
        
        result[camel_to_snake(key)] = value
    
    return result

class CustomJSONEncoder(json.JSONEncoder):
    """自定义JSON编码器，支持日期时间、Decimal等类型"""
    
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        elif hasattr(obj, "to_dict"):
            return obj.to_dict()
        elif hasattr(obj, "__dict__"):
            return obj.__dict__
        
        return super().default(obj)

def to_json(obj: Any, ensure_ascii: bool = False) -> str:
    """
    将对象转换为JSON字符串
    
    Args:
        obj: 对象
        ensure_ascii: 是否确保ASCII编码
        
    Returns:
        JSON字符串
    """
    return json.dumps(obj, cls=CustomJSONEncoder, ensure_ascii=ensure_ascii)

def from_json(json_str: str) -> Any:
    """
    将JSON字符串转换为对象
    
    Args:
        json_str: JSON字符串
        
    Returns:
        对象
    """
    return json.loads(json_str)

def decimal_to_str(value: Union[Decimal, float], places: int = 2) -> str:
    """
    Decimal转字符串
    
    Args:
        value: Decimal值
        places: 小数位数
        
    Returns:
        字符串
    """
    if isinstance(value, float):
        value = Decimal(str(value))
    
    format_str = f"{{:.{places}f}}"
    return format_str.format(value)

def str_to_decimal(value: str) -> Decimal:
    """
    字符串转Decimal
    
    Args:
        value: 字符串
        
    Returns:
        Decimal
    """
    return Decimal(value)

def dict_to_model(data: Dict[str, Any], model_class: Any) -> Any:
    """
    字典转模型对象
    
    Args:
        data: 字典数据
        model_class: 模型类
        
    Returns:
        模型对象
    """
    return model_class(**data)

def models_to_dicts(models: List[Any]) -> List[Dict[str, Any]]:
    """
    模型列表转字典列表
    
    Args:
        models: 模型列表
        
    Returns:
        字典列表
    """
    return [obj_to_dict(model) for model in models]

def hex_to_rgb(hex_color: str) -> tuple:
    """
    十六进制颜色转RGB
    
    Args:
        hex_color: 十六进制颜色，例如 #FF0000
        
    Returns:
        RGB元组，例如 (255, 0, 0)
    """
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_hex(rgb: tuple) -> str:
    """
    RGB转十六进制颜色
    
    Args:
        rgb: RGB元组，例如 (255, 0, 0)
        
    Returns:
        十六进制颜色，例如 #FF0000
    """
    return '#{:02x}{:02x}{:02x}'.format(*rgb)