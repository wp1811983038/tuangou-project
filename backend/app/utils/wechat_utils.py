import time
import json
import hmac
import hashlib
import base64
import requests
from typing import Dict, Any, Optional, List, Union
from urllib.parse import urlencode

def get_access_token(appid: str, secret: str) -> Dict[str, Any]:
    """
    获取微信接口调用凭证
    
    Args:
        appid: 小程序AppID
        secret: 小程序AppSecret
        
    Returns:
        {
            "access_token": "ACCESS_TOKEN",
            "expires_in": 7200
        }
        
    Raises:
        Exception: 获取失败
    """
    url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={secret}"
    response = requests.get(url)
    data = response.json()
    
    if "errcode" in data and data["errcode"] != 0:
        raise Exception(f"获取access_token失败: {data.get('errmsg')}")
    
    return data

def code_to_session(appid: str, secret: str, code: str) -> Dict[str, Any]:
    """
    小程序登录，通过code获取用户openid和session_key
    
    Args:
        appid: 小程序AppID
        secret: 小程序AppSecret
        code: 小程序登录code
        
    Returns:
        {
            "openid": "OPENID",
            "session_key": "SESSION_KEY",
            "unionid": "UNIONID" // 可能不存在
        }
        
    Raises:
        Exception: 登录失败
    """
    url = f"https://api.weixin.qq.com/sns/jscode2session?appid={appid}&secret={secret}&js_code={code}&grant_type=authorization_code"
    response = requests.get(url)
    data = response.json()
    
    if "errcode" in data and data["errcode"] != 0:
        raise Exception(f"小程序登录失败: {data.get('errmsg')}")
    
    return data

def decrypt_user_info(session_key: str, encrypted_data: str, iv: str) -> Dict[str, Any]:
    """
    解密用户信息
    
    Args:
        session_key: 会话密钥
        encrypted_data: 包括敏感数据在内的完整用户信息的加密数据
        iv: 加密算法的初始向量
        
    Returns:
        解密后的用户信息
        
    Raises:
        Exception: 解密失败
    """
    # 使用Base64解码
    session_key_bytes = base64.b64decode(session_key)
    encrypted_data_bytes = base64.b64decode(encrypted_data)
    iv_bytes = base64.b64decode(iv)
    
    # 使用AES-128-CBC模式解密
    from Crypto.Cipher import AES
    
    cipher = AES.new(session_key_bytes, AES.MODE_CBC, iv_bytes)
    
    # 解密
    decrypted_bytes = cipher.decrypt(encrypted_data_bytes)
    
    # 去除补位
    pad_length = decrypted_bytes[-1]
    decrypted_bytes = decrypted_bytes[:-pad_length]
    
    # 解析JSON
    try:
        user_info = json.loads(decrypted_bytes.decode('utf-8'))
        return user_info
    except Exception as e:
        raise Exception(f"解析解密数据失败: {str(e)}")

def decrypt_phone_number(session_key: str, encrypted_data: str, iv: str) -> Dict[str, Any]:
    """
    解密手机号
    
    Args:
        session_key: 会话密钥
        encrypted_data: 包括敏感数据在内的完整用户信息的加密数据
        iv: 加密算法的初始向量
        
    Returns:
        解密后的手机号信息
        
    Raises:
        Exception: 解密失败
    """
    # 与解密用户信息相同的方法
    return decrypt_user_info(session_key, encrypted_data, iv)

def get_unlimited_qrcode(access_token: str, scene: str, page: Optional[str] = None, width: int = 430) -> bytes:
    """
    获取小程序码，适用于需要的码数量极多的业务场景
    
    Args:
        access_token: 接口调用凭证
        scene: 最大32个可见字符，用于业务参数传递
        page: 小程序页面路径
        width: 二维码的宽度
        
    Returns:
        小程序码图片二进制数据
        
    Raises:
        Exception: 获取失败
    """
    url = f"https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token={access_token}"
    
    data = {
        "scene": scene,
        "width": width
    }
    
    if page:
        data["page"] = page
    
    response = requests.post(url, json=data)
    
    # 判断是否返回JSON（表示请求失败）
    if response.headers.get("Content-Type", "").startswith("application/json"):
        result = response.json()
        raise Exception(f"获取小程序码失败: {result.get('errmsg')}")
    
    # 返回图片二进制数据
    return response.content

def get_qrcode(access_token: str, path: str, width: int = 430) -> bytes:
    """
    获取小程序二维码
    
    Args:
        access_token: 接口调用凭证
        path: 小程序页面路径
        width: 二维码的宽度
        
    Returns:
        小程序二维码图片二进制数据
        
    Raises:
        Exception: 获取失败
    """
    url = f"https://api.weixin.qq.com/wxa/getwxacode?access_token={access_token}"
    
    data = {
        "path": path,
        "width": width
    }
    
    response = requests.post(url, json=data)
    
    # 判断是否返回JSON（表示请求失败）
    if response.headers.get("Content-Type", "").startswith("application/json"):
        result = response.json()
        raise Exception(f"获取小程序二维码失败: {result.get('errmsg')}")
    
    # 返回图片二进制数据
    return response.content

def send_subscribe_message(access_token: str, openid: str, template_id: str, data: Dict[str, Dict[str, str]], page: Optional[str] = None) -> Dict[str, Any]:
    """
    发送订阅消息
    
    Args:
        access_token: 接口调用凭证
        openid: 接收者（用户）的openid
        template_id: 所需下发的订阅模板id
        data: 模板内容，格式形如 {"key1": {"value": "val1"}, "key2": {"value": "val2"}}
        page: 点击模板卡片后的跳转页面
        
    Returns:
        API返回结果
        
    Raises:
        Exception: 发送失败
    """
    url = f"https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={access_token}"
    
    body = {
        "touser": openid,
        "template_id": template_id,
        "data": data
    }
    
    if page:
        body["page"] = page
    
    response = requests.post(url, json=body)
    result = response.json()
    
    if result.get("errcode") != 0:
        raise Exception(f"发送订阅消息失败: {result.get('errmsg')}")
    
    return result

def check_content_security(access_token: str, content: str) -> bool:
    """
    检查文本内容是否安全
    
    Args:
        access_token: 接口调用凭证
        content: 要检查的文本内容
        
    Returns:
        是否安全
    """
    url = f"https://api.weixin.qq.com/wxa/msg_sec_check?access_token={access_token}"
    
    data = {
        "content": content
    }
    
    response = requests.post(url, json=data)
    result = response.json()
    
    # 返回0表示内容正常
    return result.get("errcode") == 0

def check_image_security(access_token: str, image_data: bytes) -> bool:
    """
    检查图片是否安全
    
    Args:
        access_token: 接口调用凭证
        image_data: 图片二进制数据
        
    Returns:
        是否安全
    """
    url = f"https://api.weixin.qq.com/wxa/img_sec_check?access_token={access_token}"
    
    import io
    files = {
        "media": io.BytesIO(image_data)
    }
    
    response = requests.post(url, files=files)
    result = response.json()
    
    # 返回0表示内容正常
    return result.get("errcode") == 0

def generate_signature(params: Dict[str, Any], api_key: str) -> str:
    """
    生成微信支付签名
    
    Args:
        params: 参数字典
        api_key: API密钥
        
    Returns:
        签名
    """
    # 按字典序排序
    sorted_params = sorted(params.items())
    
    # 组装签名串
    sign_string = "&".join([f"{k}={v}" for k, v in sorted_params if v])
    sign_string += f"&key={api_key}"
    
    # MD5签名
    return hashlib.md5(sign_string.encode('utf-8')).hexdigest().upper()

def xml_to_dict(xml_str: str) -> Dict[str, str]:
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