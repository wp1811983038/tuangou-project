import json
import time
import uuid
from datetime import datetime
from typing import Dict, Optional

import requests
from fastapi import HTTPException

from app.core.config import settings


async def create_wechat_payment(
    order_id: str,
    total_fee: int,
    body: str,
    openid: str,
    attach: Optional[str] = None,
    notify_url: Optional[str] = None
) -> Dict:
    """
    创建微信支付订单
    
    Args:
        order_id: 商户订单号
        total_fee: 总金额(分)
        body: 商品描述
        openid: 用户OpenID
        attach: 附加数据
        notify_url: 回调通知地址
        
    Returns:
        支付参数
    """
    # 默认回调地址
    if not notify_url:
        notify_url = f"{settings.API_BASE_URL}/api/v1/payments/notify/wechat"
    
    # 支付参数
    params = {
        "appid": settings.WECHAT_APPID,
        "mch_id": settings.WECHAT_PAY_MCH_ID,
        "nonce_str": uuid.uuid4().hex,
        "body": body[:127],  # 商品描述最大128字节
        "out_trade_no": order_id,
        "total_fee": total_fee,
        "spbill_create_ip": "127.0.0.1",  # 在实际应用中应该传入客户端IP
        "notify_url": notify_url,
        "trade_type": "JSAPI",
        "openid": openid
    }
    
    if attach:
        params["attach"] = attach[:127]  # 附加数据最大128字节
    
    # 签名
    sign_str = "&".join([f"{k}={v}" for k, v in sorted(params.items()) if v])
    sign_str += f"&key={settings.WECHAT_PAY_KEY}"
    
    import hashlib
    sign = hashlib.md5(sign_str.encode()).hexdigest().upper()
    params["sign"] = sign
    
    # 将参数转换为XML
    xml = "<xml>"
    for k, v in params.items():
        xml += f"<{k}>{v}</{k}>"
    xml += "</xml>"
    
    # 调用微信支付统一下单接口
    try:
        response = requests.post(
            "https://api.mch.weixin.qq.com/pay/unifiedorder",
            data=xml.encode("utf-8"),
            headers={"Content-Type": "application/xml"}
        )
        
        # 解析XML响应
        import xml.etree.ElementTree as ET
        root = ET.fromstring(response.content)
        result = {}
        for child in root:
            result[child.tag] = child.text
        
        if result.get("return_code") != "SUCCESS" or result.get("result_code") != "SUCCESS":
            raise HTTPException(
                status_code=400,
                detail=f"微信支付下单失败: {result.get('return_msg')} {result.get('err_code_des')}"
            )
        
        # 生成支付参数
        timestamp = str(int(time.time()))
        nonce_str = uuid.uuid4().hex
        prepay_id = result.get("prepay_id")
        
        pay_params = {
            "appId": settings.WECHAT_APPID,
            "timeStamp": timestamp,
            "nonceStr": nonce_str,
            "package": f"prepay_id={prepay_id}",
            "signType": "MD5"
        }
        
        # 签名
        pay_sign_str = "&".join([f"{k}={v}" for k, v in sorted(pay_params.items()) if v])
        pay_sign_str += f"&key={settings.WECHAT_PAY_KEY}"
        pay_sign = hashlib.md5(pay_sign_str.encode()).hexdigest().upper()
        
        pay_params["paySign"] = pay_sign
        
        return pay_params
    
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"微信支付请求异常: {str(e)}")


async def verify_wechat_payment_notify(data: str) -> Dict:
    """
    验证微信支付回调通知
    
    Args:
        data: 微信支付回调通知数据(XML格式)
        
    Returns:
        通知数据
    """
    # 解析XML数据
    import xml.etree.ElementTree as ET
    root = ET.fromstring(data)
    result = {}
    for child in root:
        result[child.tag] = child.text
    
    # 验证签名
    sign = result.pop("sign", None)
    if not sign:
        raise HTTPException(status_code=400, detail="签名验证失败: 没有签名")
    
    sign_str = "&".join([f"{k}={v}" for k, v in sorted(result.items()) if v])
    sign_str += f"&key={settings.WECHAT_PAY_KEY}"
    
    import hashlib
    calculated_sign = hashlib.md5(sign_str.encode()).hexdigest().upper()
    
    if calculated_sign != sign:
        raise HTTPException(status_code=400, detail="签名验证失败: 签名不匹配")
    
    # 检查返回结果
    if result.get("return_code") != "SUCCESS" or result.get("result_code") != "SUCCESS":
        raise HTTPException(
            status_code=400,
            detail=f"支付回调失败: {result.get('return_msg')} {result.get('err_code_des')}"
        )
    
    return result


async def create_wechat_refund(
    order_id: str,
    refund_id: str,
    total_fee: int,
    refund_fee: int,
    refund_desc: Optional[str] = None,
    notify_url: Optional[str] = None
) -> Dict:
    """
    创建微信退款
    
    Args:
        order_id: 商户订单号
        refund_id: 商户退款单号
        total_fee: 订单总金额(分)
        refund_fee: 退款金额(分)
        refund_desc: 退款原因
        notify_url: 回调通知地址
        
    Returns:
        退款结果
    """
    # 默认回调地址
    if not notify_url:
        notify_url = f"{settings.API_BASE_URL}/api/v1/payments/notify/wechat/refund"
    
    # 退款参数
    params = {
        "appid": settings.WECHAT_APPID,
        "mch_id": settings.WECHAT_PAY_MCH_ID,
        "nonce_str": uuid.uuid4().hex,
        "out_trade_no": order_id,
        "out_refund_no": refund_id,
        "total_fee": total_fee,
        "refund_fee": refund_fee
    }
    
    if refund_desc:
        params["refund_desc"] = refund_desc[:80]  # 退款原因最大80字节
    
    if notify_url:
        params["notify_url"] = notify_url
    
    # 签名
    sign_str = "&".join([f"{k}={v}" for k, v in sorted(params.items()) if v])
    sign_str += f"&key={settings.WECHAT_PAY_KEY}"
    
    import hashlib
    sign = hashlib.md5(sign_str.encode()).hexdigest().upper()
    params["sign"] = sign
    
    # 将参数转换为XML
    xml = "<xml>"
    for k, v in params.items():
        xml += f"<{k}>{v}</{k}>"
    xml += "</xml>"
    
    # 调用微信支付退款接口
    try:
        # 注意：微信支付退款接口需要证书
        response = requests.post(
            "https://api.mch.weixin.qq.com/secapi/pay/refund",
            data=xml.encode("utf-8"),
            headers={"Content-Type": "application/xml"},
            cert=(settings.WECHAT_PAY_CERT, settings.WECHAT_PAY_KEY_CERT)
        )
        
        # 解析XML响应
        import xml.etree.ElementTree as ET
        root = ET.fromstring(response.content)
        result = {}
        for child in root:
            result[child.tag] = child.text
        
        if result.get("return_code") != "SUCCESS" or result.get("result_code") != "SUCCESS":
            raise HTTPException(
                status_code=400,
                detail=f"微信支付退款失败: {result.get('return_msg')} {result.get('err_code_des')}"
            )
        
        return result
    
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"微信支付退款请求异常: {str(e)}")


async def verify_wechat_refund_notify(data: str) -> Dict:
    """
    验证微信退款回调通知
    
    Args:
        data: 微信退款回调通知数据(XML格式)
        
    Returns:
        通知数据
    """
    # 解析XML数据
    import xml.etree.ElementTree as ET
    root = ET.fromstring(data)
    result = {}
    for child in root:
        result[child.tag] = child.text
    
    # 验证返回结果
    if result.get("return_code") != "SUCCESS":
        raise HTTPException(
            status_code=400,
            detail=f"退款回调失败: {result.get('return_msg')}"
        )
    
    # 解密退款信息
    req_info = result.get("req_info")
    if not req_info:
        raise HTTPException(status_code=400, detail="退款通知缺少加密信息")
    
    # 解密过程
    import base64
    import hashlib
    from Crypto.Cipher import AES
    
    # 对商户key做md5，得到32位小写key
    key = hashlib.md5(settings.WECHAT_PAY_KEY.encode()).hexdigest().encode()
    
    # 对加密串A做base64解码，得到加密串B
    encrypted_data = base64.b64decode(req_info)
    
    # 用key对加密串B做AES-256-ECB解密
    cipher = AES.new(key, AES.MODE_ECB)
    decrypted_data = cipher.decrypt(encrypted_data)
    
    # 去除补位字符
    decrypted_data = decrypted_data.rstrip(b'\x00')
    
    # 解析XML
    decrypted_root = ET.fromstring(decrypted_data)
    decrypted_result = {}
    for child in decrypted_root:
        decrypted_result[child.tag] = child.text
    
    # 合并结果
    result.update(decrypted_result)
    
    return result