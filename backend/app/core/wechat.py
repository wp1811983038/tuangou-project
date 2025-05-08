import json
import time
from typing import Dict, Optional, Any

import requests
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.exceptions import AppException


class WechatAPI:
    """
    微信API工具类
    """
    
    @staticmethod
    def request_url(url: str, method: str = "GET", data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        请求微信API

        Args:
            url: 请求URL
            method: 请求方法
            data: 请求数据

        Returns:
            API响应数据

        Raises:
            AppException: 请求失败
        """
        try:
            if method.upper() == "GET":
                response = requests.get(url)
            else:
                response = requests.post(url, data=json.dumps(data) if data else None)
            
            response_data = response.json()
            
            if "errcode" in response_data and response_data["errcode"] != 0:
                raise AppException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"微信API错误: {response_data['errmsg']}"
                )
            
            return response_data
        except Exception as e:
            raise AppException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"微信API请求失败: {str(e)}"
            )
    
    @staticmethod
    def get_access_token() -> str:
        """
        获取微信接口调用凭证

        Returns:
            access_token

        Raises:
            AppException: 获取失败
        """
        url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={settings.WECHAT_APPID}&secret={settings.WECHAT_SECRET}"
        response = WechatAPI.request_url(url)
        return response["access_token"]
    
    @staticmethod
    def code2session(code: str) -> Dict[str, Any]:
        """
        小程序登录，获取用户openid和session_key

        Args:
            code: 小程序登录code

        Returns:
            包含openid和session_key的字典

        Raises:
            AppException: 登录失败
        """
        url = f"https://api.weixin.qq.com/sns/jscode2session?appid={settings.WECHAT_APPID}&secret={settings.WECHAT_SECRET}&js_code={code}&grant_type=authorization_code"
        response = WechatAPI.request_url(url)
        
        if "openid" not in response:
            raise AppException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="微信登录失败，无效的code"
            )
        
        return response
    
    @staticmethod
    def send_subscribe_message(
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

        Raises:
            AppException: 发送失败
        """
        access_token = WechatAPI.get_access_token()
        url = f"https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={access_token}"
        
        body = {
            "touser": open_id,
            "template_id": template_id,
            "data": data
        }
        
        if page:
            body["page"] = page
        
        return WechatAPI.request_url(url, method="POST", data=body)