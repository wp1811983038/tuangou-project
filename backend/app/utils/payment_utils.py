import time
import uuid
import json
import hashlib
import requests
from typing import Dict, Any, Optional, List, Union
from datetime import datetime

def generate_out_trade_no(prefix: str = "ORDER") -> str:
    """
    生成商户订单号
    
    Args:
        prefix: 前缀
        
    Returns:
        商户订单号
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = uuid.uuid4().hex[:8].upper()
    return f"{prefix}{timestamp}{random_str}"

def fen_to_yuan(fen: int) -> float:
    """
    分转元
    
    Args:
        fen: 金额（分）
        
    Returns:
        金额（元）
    """
    return fen / 100.0

def yuan_to_fen(yuan: float) -> int:
    """
    元转分
    
    Args:
        yuan: 金额（元）
        
    Returns:
        金额（分）
    """
    return int(yuan * 100)

def generate_wx_pay_request(
    appid: str,
    mch_id: str,
    api_key: str,
    body: str,
    out_trade_no: str,
    total_fee: int,
    spbill_create_ip: str,
    notify_url: str,
    openid: Optional[str] = None,
    trade_type: str = "JSAPI"
) -> Dict[str, Any]:
    """
    生成微信支付请求参数
    
    Args:
        appid: 小程序AppID
        mch_id: 商户号
        api_key: API密钥
        body: 商品描述
        out_trade_no: 商户订单号
        total_fee: 总金额(分)
        spbill_create_ip: 终端IP
        notify_url: 通知地址
        openid: 用户标识，trade_type为JSAPI时必填
        trade_type: 交易类型：JSAPI，NATIVE，APP，MWEB
        
    Returns:
        请求参数
        
    Raises:
        ValueError: 参数错误
    """
    if trade_type == "JSAPI" and not openid:
        raise ValueError("trade_type为JSAPI时，openid必填")
    
    # 请求参数
    params = {
        "appid": appid,
        "mch_id": mch_id,
        "nonce_str": uuid.uuid4().hex,
        "body": body,
        "out_trade_no": out_trade_no,
        "total_fee": total_fee,
        "spbill_create_ip": spbill_create_ip,
        "notify_url": notify_url,
        "trade_type": trade_type
    }
    
    if openid:
        params["openid"] = openid
    
    # 生成签名
    sign_string = "&".join([f"{k}={v}" for k, v in sorted(params.items()) if v])
    sign_string += f"&key={api_key}"
    
    sign = hashlib.md5(sign_string.encode('utf-8')).hexdigest().upper()
    params["sign"] = sign
    
    return params

def generate_wx_pay_xml(params: Dict[str, Any]) -> str:
    """
    生成微信支付XML请求数据
    
    Args:
        params: 请求参数
        
    Returns:
        XML字符串
    """
    xml_parts = ['<xml>']
    
    for key, value in params.items():
        if value is not None:
            if isinstance(value, (int, float)):
                xml_parts.append(f'<{key}>{value}</{key}>')
            else:
                xml_parts.append(f'<{key}><![CDATA[{value}]]></{key}>')
    
    xml_parts.append('</xml>')
    
    return ''.join(xml_parts)

def parse_wx_pay_response(xml_content: str) -> Dict[str, Any]:
    """
    解析微信支付返回的XML数据
    
    Args:
        xml_content: XML字符串
        
    Returns:
        解析后的字典
        
    Raises:
        Exception: 解析失败
    """
    import xml.etree.ElementTree as ET
    
    try:
        root = ET.fromstring(xml_content)
        result = {}
        
        for child in root:
            result[child.tag] = child.text
        
        return result
    except Exception as e:
        raise Exception(f"解析XML失败: {str(e)}")

def verify_wx_pay_sign(params: Dict[str, Any], api_key: str) -> bool:
    """
    验证微信支付签名
    
    Args:
        params: 参数字典
        api_key: API密钥
        
    Returns:
        是否验证成功
    """
    # 获取签名
    sign = params.get("sign")
    if not sign:
        return False
    
    # 生成签名
    params_copy = params.copy()
    params_copy.pop("sign", None)
    
    # 按字典序排序
    sorted_params = sorted(params_copy.items())
    
    # 组装签名串
    sign_string = "&".join([f"{k}={v}" for k, v in sorted_params if v])
    sign_string += f"&key={api_key}"
    
    # MD5签名
    calculated_sign = hashlib.md5(sign_string.encode('utf-8')).hexdigest().upper()
    
    return calculated_sign == sign

def generate_wx_pay_success_response() -> str:
    """
    生成微信支付成功通知返回
    
    Returns:
        XML字符串
    """
    return """<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>"""

def generate_wx_pay_fail_response(message: str = "FAIL") -> str:
    """
    生成微信支付失败通知返回
    
    Args:
        message: 失败原因
        
    Returns:
        XML字符串
    """
    return f"""<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[{message}]]></return_msg></xml>"""

def generate_app_pay_params(
    prepay_id: str,
    appid: str,
    mch_id: str,
    api_key: str
) -> Dict[str, Any]:
    """
    生成APP支付参数
    
    Args:
        prepay_id: 预支付交易会话标识
        appid: 小程序AppID
        mch_id: 商户号
        api_key: API密钥
        
    Returns:
        支付参数
    """
    # 获取时间戳
    timestamp = str(int(time.time()))
    noncestr = uuid.uuid4().hex
    
    # 构造参数
    params = {
        "appid": appid,
        "partnerid": mch_id,
        "prepayid": prepay_id,
        "package": "Sign=WXPay",
        "noncestr": noncestr,
        "timestamp": timestamp
    }
    
    # 生成签名
    sign_string = "&".join([f"{k}={v}" for k, v in sorted(params.items()) if v])
    sign_string += f"&key={api_key}"
    
    sign = hashlib.md5(sign_string.encode('utf-8')).hexdigest().upper()
    params["sign"] = sign
    
    return params

def generate_js_pay_params(
    prepay_id: str,
    appid: str,
    api_key: str
) -> Dict[str, Any]:
    """
    生成JSAPI支付参数
    
    Args:
        prepay_id: 预支付交易会话标识
        appid: 小程序AppID
        api_key: API密钥
        
    Returns:
        支付参数
    """
    # 获取时间戳
    timestamp = str(int(time.time()))
    noncestr = uuid.uuid4().hex
    
    # 构造参数
    params = {
        "appId": appid,
        "timeStamp": timestamp,
        "nonceStr": noncestr,
        "package": f"prepay_id={prepay_id}",
        "signType": "MD5"
    }
    
    # 生成签名
    sign_string = "&".join([f"{k}={v}" for k, v in sorted(params.items()) if v])
    sign_string += f"&key={api_key}"
    
    sign = hashlib.md5(sign_string.encode('utf-8')).hexdigest().upper()
    params["paySign"] = sign
    
    return params

def create_wx_refund_request(
    appid: str,
    mch_id: str,
    api_key: str,
    transaction_id: Optional[str] = None,
    out_trade_no: Optional[str] = None,
    out_refund_no: str = None,
    total_fee: int = None,
    refund_fee: int = None,
    refund_desc: Optional[str] = None
) -> Dict[str, Any]:
    """
    创建微信退款请求
    
    Args:
        appid: 小程序AppID
        mch_id: 商户号
        api_key: API密钥
        transaction_id: 微信支付订单号
        out_trade_no: 商户订单号
        out_refund_no: 商户退款单号
        total_fee: 订单总金额(分)
        refund_fee: 退款金额(分)
        refund_desc: 退款原因
        
    Returns:
        退款请求参数
        
    Raises:
        ValueError: 参数错误
    """
    if not transaction_id and not out_trade_no:
        raise ValueError("transaction_id和out_trade_no必须填写一个")
    
    if not out_refund_no:
        # 生成退款单号
        out_refund_no = f"REFUND{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:8].upper()}"
    
    # 请求参数
    params = {
        "appid": appid,
        "mch_id": mch_id,
        "nonce_str": uuid.uuid4().hex,
        "out_refund_no": out_refund_no,
        "total_fee": total_fee,
        "refund_fee": refund_fee
    }
    
    if transaction_id:
        params["transaction_id"] = transaction_id
    else:
        params["out_trade_no"] = out_trade_no
    
    if refund_desc:
        params["refund_desc"] = refund_desc
    
    # 生成签名
    sign_string = "&".join([f"{k}={v}" for k, v in sorted(params.items()) if v])
    sign_string += f"&key={api_key}"
    
    sign = hashlib.md5(sign_string.encode('utf-8')).hexdigest().upper()
    params["sign"] = sign
    
    return params