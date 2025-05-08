import json
import aiohttp
import requests
from typing import Dict, Any, Optional, Union, List, Tuple

async def async_get(url: str, params: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None, timeout: int = 10) -> Dict[str, Any]:
    """
    异步GET请求
    
    Args:
        url: 请求URL
        params: 请求参数
        headers: 请求头
        timeout: 超时时间(秒)
        
    Returns:
        响应数据
        
    Raises:
        Exception: 请求异常
    """
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params, headers=headers, timeout=timeout) as response:
            response.raise_for_status()
            return await response.json()

async def async_post(url: str, data: Optional[Dict[str, Any]] = None, json_data: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None, timeout: int = 10) -> Dict[str, Any]:
    """
    异步POST请求
    
    Args:
        url: 请求URL
        data: 表单数据
        json_data: JSON数据
        headers: 请求头
        timeout: 超时时间(秒)
        
    Returns:
        响应数据
        
    Raises:
        Exception: 请求异常
    """
    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=data, json=json_data, headers=headers, timeout=timeout) as response:
            response.raise_for_status()
            return await response.json()

def get(url: str, params: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None, timeout: int = 10) -> Dict[str, Any]:
    """
    同步GET请求
    
    Args:
        url: 请求URL
        params: 请求参数
        headers: 请求头
        timeout: 超时时间(秒)
        
    Returns:
        响应数据
        
    Raises:
        Exception: 请求异常
    """
    response = requests.get(url, params=params, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.json()

def post(url: str, data: Optional[Dict[str, Any]] = None, json_data: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None, timeout: int = 10) -> Dict[str, Any]:
    """
    同步POST请求
    
    Args:
        url: 请求URL
        data: 表单数据
        json_data: JSON数据
        headers: 请求头
        timeout: 超时时间(秒)
        
    Returns:
        响应数据
        
    Raises:
        Exception: 请求异常
    """
    response = requests.post(url, data=data, json=json_data, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.json()

def download_file(url: str, local_path: str, chunk_size: int = 8192) -> str:
    """
    下载文件
    
    Args:
        url: 文件URL
        local_path: 本地保存路径
        chunk_size: 分块大小
        
    Returns:
        文件保存路径
        
    Raises:
        Exception: 下载异常
    """
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    with open(local_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=chunk_size):
            if chunk:
                f.write(chunk)
    
    return local_path

def upload_file(url: str, file_path: str, field_name: str = 'file', data: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    上传文件
    
    Args:
        url: 上传URL
        file_path: 文件路径
        field_name: 文件字段名
        data: 附加表单数据
        headers: 请求头
        
    Returns:
        响应数据
        
    Raises:
        Exception: 上传异常
    """
    with open(file_path, 'rb') as f:
        files = {field_name: f}
        response = requests.post(url, files=files, data=data, headers=headers)
        response.raise_for_status()
        return response.json()

def build_url(base_url: str, path: str, params: Optional[Dict[str, Any]] = None) -> str:
    """
    构建URL
    
    Args:
        base_url: 基础URL
        path: 路径
        params: 查询参数
        
    Returns:
        完整URL
    """
    # 确保base_url末尾没有斜杠，path开头有斜杠
    base_url = base_url.rstrip('/')
    path = '/' + path.lstrip('/')
    
    url = base_url + path
    
    if params:
        # 构建查询字符串
        query_string = '&'.join([f"{k}={v}" for k, v in params.items() if v is not None])
        if query_string:
            url = url + ('?' if '?' not in url else '&') + query_string
    
    return url

def parse_url(url: str) -> Tuple[str, str, Dict[str, str]]:
    """
    解析URL
    
    Args:
        url: URL字符串
        
    Returns:
        (base_url, path, params)
    """
    from urllib.parse import urlparse, parse_qs
    
    parsed = urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    path = parsed.path
    
    # 解析查询参数
    query_params = parse_qs(parsed.query)
    # 把值列表转换为单个值
    params = {k: v[0] if v and len(v) == 1 else v for k, v in query_params.items()}
    
    return base_url, path, params

def form_encode(data: Dict[str, Any]) -> str:
    """
    表单编码
    
    Args:
        data: 表单数据
        
    Returns:
        编码后的字符串
    """
    from urllib.parse import urlencode
    
    return urlencode(data)

def xml_to_dict(xml_str: str) -> Dict[str, Any]:
    """
    XML转字典
    
    Args:
        xml_str: XML字符串
        
    Returns:
        字典
    """
    import xml.etree.ElementTree as ET
    
    root = ET.fromstring(xml_str)
    result = {}
    
    for child in root:
        result[child.tag] = child.text
    
    return result

def dict_to_xml(data: Dict[str, Any], root_name: str = 'xml') -> str:
    """
    字典转XML
    
    Args:
        data: 字典数据
        root_name: 根元素名称
        
    Returns:
        XML字符串
    """
    xml_parts = [f'<{root_name}>']
    
    for key, value in data.items():
        # 跳过None值
        if value is None:
            continue
        xml_parts.append(f'<{key}>{value}</{key}>')
    
    xml_parts.append(f'</{root_name}>')
    
    return ''.join(xml_parts)