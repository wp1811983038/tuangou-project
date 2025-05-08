from typing import Dict, Optional

from pydantic import BaseModel, Field


class WxLoginInfo(BaseModel):
    """微信登录信息"""
    open_id: str
    union_id: Optional[str] = None
    session_key: str


class WxUserInfo(BaseModel):
    """微信用户信息"""
    nickname: str
    avatar_url: str
    gender: int
    country: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    language: Optional[str] = None


class WxPaymentRequest(BaseModel):
    """微信支付请求"""
    order_id: int
    total_fee: int  # 单位：分
    body: str
    attach: Optional[str] = None
    notify_url: Optional[str] = None


class WxPaymentResponse(BaseModel):
    """微信支付响应"""
    appid: str
    timeStamp: str
    nonceStr: str
    package: str
    signType: str
    paySign: str


class WxPayNotify(BaseModel):
    """微信支付回调通知"""
    return_code: str
    return_msg: Optional[str] = None
    appid: Optional[str] = None
    mch_id: Optional[str] = None
    nonce_str: Optional[str] = None
    sign: Optional[str] = None
    result_code: Optional[str] = None
    err_code: Optional[str] = None
    err_code_des: Optional[str] = None
    openid: Optional[str] = None
    trade_type: Optional[str] = None
    bank_type: Optional[str] = None
    total_fee: Optional[int] = None
    cash_fee: Optional[int] = None
    transaction_id: Optional[str] = None
    out_trade_no: Optional[str] = None
    time_end: Optional[str] = None