import json
import time
from typing import Dict, Optional, Tuple, Any

import requests
from fastapi import HTTPException

from app.core.config import settings
from app.core.redis import RedisClient
from app.core.constants import CACHE_KEY_PREFIX, CACHE_EXPIRE_TIME


async def get_access_token() -> str:
    """
    获取微信接口调用凭证
    
    Returns:
        access_token
    """
    # 先从缓存获取
    cache_key = f"{CACHE_KEY_PREFIX['wechat']}access_token"
    access_token = RedisClient.get(cache_key)
    
    if access_token:
        return access_token
    
    # 缓存不存在，从微信服务器获取
    try:
        url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={settings.WECHAT_APPID}&secret={settings.WECHAT_SECRET}"
        response = requests.get(url)
        data = response.json()
        
        if "access_token" in data:
            access_token = data["access_token"]
            expires_in = data.get("expires_in", 7200)
            
            # 缓存access_token，过期时间比实际少5分钟，确保安全
            RedisClient.set(cache_key, access_token, expires_in - 300)
            
            return access_token
        else:
            raise HTTPException(status_code=400, detail=f"获取access_token失败: {data.get('errmsg')}")
    
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"获取access_token请求异常: {str(e)}")


async def code2session(code: str) -> Dict[str, str]:
    """
    小程序登录，获取用户openid和session_key
    
    Args:
        code: 小程序登录code
        
    Returns:
        包含openid和session_key的字典
    """
    try:
        url = f"https://api.weixin.qq.com/sns/jscode2session?appid={settings.WECHAT_APPID}&secret={settings.WECHAT_SECRET}&js_code={code}&grant_type=authorization_code"
        response = requests.get(url)
        data = response.json()
        
        if "openid" in data:
            return {
                "openid": data["openid"],
                "session_key": data["session_key"],
                "unionid": data.get("unionid")
            }
        else:
            raise HTTPException(status_code=400, detail=f"小程序登录失败: {data.get('errmsg')}")
    
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"小程序登录请求异常: {str(e)}")


async def decrypt_user_info(
    session_key: str,
    encrypted_data: str,
    iv: str
) -> Dict[str, Any]:
    """
    解密用户信息
    
    Args:
        session_key: 会话密钥
        encrypted_data: 加密数据
        iv: 加密算法的初始向量
        
    Returns:
        用户信息
    """
    import base64
    from Crypto.Cipher import AES
    
    try:
        session_key = base64.b64decode(session_key)
        encrypted_data = base64.b64decode(encrypted_data)
        iv = base64.b64decode(iv)
        
        cipher = AES.new(session_key, AES.MODE_CBC, iv)
        
        # 解密
        decrypted = cipher.decrypt(encrypted_data)
        
        # 去除补位字符
        decrypted = decrypted[:-ord(decrypted[len(decrypted)-1:])]
        
        # 将decrypted转为json对象
        user_info = json.loads(decrypted)
        
        # 校验appid
        if user_info.get("watermark", {}).get("appid") != settings.WECHAT_APPID:
            raise HTTPException(status_code=400, detail="用户信息解密校验失败")
        
        return user_info
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"用户信息解密失败: {str(e)}")


async def send_subscribe_message(
    open_id: str,
    template_id: str,
    data: Dict[str, Dict[str, str]],
    page: Optional[str] = None
) -> Dict[str, Any]:
    """
    发送小程序订阅消息
    
    Args:
        open_id: 接收者openid
        template_id: 模板ID
        data: 模板数据
        page: 跳转页面
        
    Returns:
        API响应数据
    """
    access_token = await get_access_token()
    
    url = f"https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={access_token}"
    
    params = {
        "touser": open_id,
        "template_id": template_id,
        "data": data
    }
    
    if page:
        params["page"] = page
    
    try:
        response = requests.post(url, json=params)
        result = response.json()
        
        if result.get("errcode") != 0:
            raise HTTPException(status_code=400, detail=f"发送订阅消息失败: {result.get('errmsg')}")
        
        return result
    
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"发送订阅消息请求异常: {str(e)}")


async def get_wx_qrcode(
    path: str,
    width: int = 430
) -> bytes:
    """
    获取小程序码
    
    Args:
        path: 小程序页面路径
        width: 小程序码宽度
        
    Returns:
        小程序码图片二进制数据
    """
    access_token = await get_access_token()
    
    url = f"https://api.weixin.qq.com/wxa/getwxacode?access_token={access_token}"
    
    params = {
        "path": path,
        "width": width
    }
    
    try:
        response = requests.post(url, json=params)
        
        # 判断返回是否为JSON（错误情况）
        if response.headers.get("Content-Type", "").startswith("application/json"):
            result = response.json()
            raise HTTPException(status_code=400, detail=f"获取小程序码失败: {result.get('errmsg')}")
        
        # 返回二进制数据
        return response.content
    
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"获取小程序码请求异常: {str(e)}")


async def check_message_security(content: str) -> bool:
    """
    检查文本是否安全（微信内容安全接口）
    
    Args:
        content: 待检查文本
        
    Returns:
        是否安全
    """
    access_token = await get_access_token()
    
    url = f"https://api.weixin.qq.com/wxa/msg_sec_check?access_token={access_token}"
    
    params = {
        "content": content
    }
    
    try:
        response = requests.post(url, json=params)
        result = response.json()
        
        if result.get("errcode") == 0:
            return True
        elif result.get("errcode") == 87014:
            # 内容含有违法违规内容
            return False
        else:
            # 其他错误
            raise HTTPException(status_code=400, detail=f"内容安全检查失败: {result.get('errmsg')}")
    
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"内容安全检查请求异常: {str(e)}")


async def check_image_security(image_data: bytes) -> bool:
    """
    检查图片是否安全（微信图片安全接口）
    
    Args:
        image_data: 图片二进制数据
        
    Returns:
        是否安全
    """
    access_token = await get_access_token()
    
    url = f"https://api.weixin.qq.com/wxa/img_sec_check?access_token={access_token}"
    
    # 构建multipart/form-data
    import io
    files = {
        "media": io.BytesIO(image_data)
    }
    
    try:
        response = requests.post(url, files=files)
        result = response.json()
        
        if result.get("errcode") == 0:
            return True
        elif result.get("errcode") == 87014:
            # 图片含有违法违规内容
            return False
        else:
            # 其他错误
            raise HTTPException(status_code=400, detail=f"图片安全检查失败: {result.get('errmsg')}")
    
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"图片安全检查请求异常: {str(e)}")