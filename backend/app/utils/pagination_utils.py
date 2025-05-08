from typing import Dict, Generic, List, Optional, TypeVar, Union, Any, Tuple
from pydantic import BaseModel
from sqlalchemy.orm import Query
from sqlalchemy import func
from math import ceil

T = TypeVar('T')

class PaginationParams(BaseModel):
    """分页参数"""
    page: int = 1
    page_size: int = 10
    
    @property
    def offset(self) -> int:
        """计算偏移量"""
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        """获取限制数量"""
        return self.page_size

class PaginatedData(Generic[T]):
    """分页数据"""
    def __init__(
        self,
        items: List[T],
        total: int,
        page: int,
        page_size: int
    ):
        self.items = items
        self.total = total
        self.page = page
        self.page_size = page_size
        self.pages = ceil(total / page_size) if page_size > 0 else 0
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "items": self.items,
            "total": self.total,
            "page": self.page,
            "page_size": self.page_size,
            "pages": self.pages
        }
    
    @property
    def has_next(self) -> bool:
        """是否有下一页"""
        return self.page < self.pages
    
    @property
    def has_prev(self) -> bool:
        """是否有上一页"""
        return self.page > 1
    
    @property
    def next_page(self) -> Optional[int]:
        """下一页页码"""
        return self.page + 1 if self.has_next else None
    
    @property
    def prev_page(self) -> Optional[int]:
        """上一页页码"""
        return self.page - 1 if self.has_prev else None

def paginate_query(query: Query, page: int = 1, page_size: int = 10) -> Tuple[List[Any], int]:
    """
    对SQL查询进行分页
    
    Args:
        query: SQLAlchemy查询对象
        page: 页码
        page_size: 每页数量
        
    Returns:
        (分页结果列表, 总记录数)
    """
    total = query.count()
    offset = (page - 1) * page_size
    
    items = query.offset(offset).limit(page_size).all()
    
    return items, total

def paginate_list(items: List[T], page: int = 1, page_size: int = 10) -> PaginatedData[T]:
    """
    对列表进行分页
    
    Args:
        items: 列表数据
        page: 页码
        page_size: 每页数量
        
    Returns:
        分页数据对象
    """
    total = len(items)
    offset = (page - 1) * page_size
    limit = offset + page_size
    
    paginated_items = items[offset:limit]
    
    return PaginatedData(
        items=paginated_items,
        total=total,
        page=page,
        page_size=page_size
    )

def get_page_range(current_page: int, total_pages: int, window: int = 5) -> List[int]:
    """
    获取分页导航范围
    
    Args:
        current_page: 当前页码
        total_pages: 总页数
        window: 窗口大小（显示的页码数）
        
    Returns:
        页码列表
    """
    half_window = window // 2
    
    if total_pages <= window:
        return list(range(1, total_pages + 1))
    
    if current_page <= half_window:
        return list(range(1, window + 1))
    
    if current_page >= total_pages - half_window:
        return list(range(total_pages - window + 1, total_pages + 1))
    
    return list(range(current_page - half_window, current_page + half_window + 1))

def parse_pagination_params(page: Optional[int] = None, page_size: Optional[int] = None, default_page: int = 1, default_page_size: int = 10, max_page_size: int = 100) -> Tuple[int, int]:
    """
    解析分页参数
    
    Args:
        page: 页码
        page_size: 每页数量
        default_page: 默认页码
        default_page_size: 默认每页数量
        max_page_size: 最大每页数量
        
    Returns:
        (页码, 每页数量)
    """
    if page is None or page < 1:
        page = default_page
    
    if page_size is None or page_size < 1:
        page_size = default_page_size
    
    # 限制每页最大数量
    page_size = min(page_size, max_page_size)
    
    return page, page_size

def create_pagination_metadata(page: int, page_size: int, total: int, base_url: str) -> Dict[str, Any]:
    """
    创建分页元数据
    
    Args:
        page: 当前页码
        page_size: 每页数量
        total: 总记录数
        base_url: 基础URL
        
    Returns:
        分页元数据
    """
    total_pages = ceil(total / page_size) if page_size > 0 else 0
    
    if '?' in base_url:
        url_pattern = f"{base_url}&page={{}}&page_size={page_size}"
    else:
        url_pattern = f"{base_url}?page={{}}&page_size={page_size}"
    
    has_next = page < total_pages
    has_prev = page > 1
    
    metadata = {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_prev": has_prev,
        "links": {}
    }
    
    if has_next:
        metadata["links"]["next"] = url_pattern.format(page + 1)
    
    if has_prev:
        metadata["links"]["prev"] = url_pattern.format(page - 1)
    
    metadata["links"]["first"] = url_pattern.format(1)
    metadata["links"]["last"] = url_pattern.format(total_pages) if total_pages > 0 else url_pattern.format(1)
    
    return metadata