from enum import Enum
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union

from pydantic import BaseModel, Field
from pydantic.generics import GenericModel


# 定义泛型类型变量
T = TypeVar('T')


class ResponseStatus(str, Enum):
    """响应状态枚举"""
    SUCCESS = "success"
    ERROR = "error"


class ResponseBase(BaseModel):
    """基础响应模型"""
    status: ResponseStatus = ResponseStatus.SUCCESS
    message: str = "操作成功"


class DataResponse(ResponseBase, Generic[T]):
    """通用数据响应模型"""
    data: Optional[T] = None


class PaginationParams(BaseModel):
    """分页查询参数"""
    page: int = Field(1, ge=1, description="页码，从1开始")
    page_size: int = Field(10, ge=1, le=100, description="每页条数")
    

class PaginatedData(GenericModel, Generic[T]):
    """分页数据模型"""
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int


class PaginatedResponse(ResponseBase, Generic[T]):
    """分页响应模型"""
    data: PaginatedData[T]


class IdsRequest(BaseModel):
    """批量ID请求模型"""
    ids: List[int]


class SortOrder(str, Enum):
    """排序顺序"""
    ASC = "asc"
    DESC = "desc"


class ErrorResponse(BaseModel):
    """错误响应模型"""
    status: ResponseStatus = ResponseStatus.ERROR
    message: str
    error_code: Optional[str] = None
    details: Optional[Any] = None


class ValidationErrorDetail(BaseModel):
    """验证错误详情"""
    loc: List[Union[str, int]]
    msg: str
    type: str


class ValidationErrorResponse(ErrorResponse):
    """验证错误响应模型"""
    details: List[ValidationErrorDetail]


class MessageResponse(ResponseBase):
    """消息响应模型"""
    pass


class IdResponse(ResponseBase):
    """ID响应模型"""
    data: Dict[str, int]


class BooleanResponse(ResponseBase):
    """布尔响应模型"""
    data: bool = True