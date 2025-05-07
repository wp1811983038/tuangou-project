import requests
from app.config import settings

def get_openid(code: str) -> dict:
    """
    通过微信登录code获取用户openid和session_key
    """
    url = f"https://api.weixin.qq.com/sns/jscode2session"
    params = {
        "appid": settings.WECHAT_APPID,
        "secret": settings.WECHAT_SECRET,
        "js_code": code,
        "grant_type": "authorization_code"
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        if "errcode" in data and data["errcode"] != 0:
            return {"success": False, "msg": f"微信API返回错误: {data['errmsg']}"}
        
        return {
            "success": True, 
            "openid": data.get("openid"), 
            "session_key": data.get("session_key")
        }
    except Exception as e:
        return {"success": False, "msg": f"请求微信API失败: {str(e)}"}