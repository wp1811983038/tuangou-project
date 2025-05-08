from enum import Enum, IntEnum


class UserStatus(IntEnum):
    """用户状态枚举"""
    INACTIVE = 0  # 未激活
    ACTIVE = 1    # 正常
    BANNED = 2    # 已禁用


class MerchantStatus(IntEnum):
    """商户状态枚举"""
    PENDING = 0    # 待审核
    ACTIVE = 1     # 正常
    BANNED = 2     # 已禁用


class ProductStatus(IntEnum):
    """商品状态枚举"""
    OFFLINE = 0    # 下架
    ONLINE = 1     # 上架


class GroupStatus(IntEnum):
    """团购状态枚举"""
    PENDING = 0    # 未开始
    ONGOING = 1    # 进行中
    SUCCEEDED = 2  # 已成功
    FAILED = 3     # 已失败


class OrderStatus(IntEnum):
    """订单状态枚举"""
    PENDING_PAYMENT = 0  # 待支付
    PAID = 1             # 已支付
    SHIPPED = 2          # 已发货
    COMPLETED = 3        # 已完成
    CANCELLED = 4        # 已取消
    REFUNDED = 5         # 已退款


class PaymentStatus(IntEnum):
    """支付状态枚举"""
    UNPAID = 0      # 未支付
    PAID = 1        # 已支付
    REFUNDED = 2    # 已退款


class DeliveryStatus(IntEnum):
    """物流状态枚举"""
    UNSHIPPED = 0    # 未发货
    SHIPPED = 1      # 已发货
    RECEIVED = 2     # 已收货


class ReviewStatus(IntEnum):
    """评价状态枚举"""
    PENDING = 0     # 待审核
    APPROVED = 1    # 已通过
    REJECTED = 2    # 已拒绝


class PaymentMethod(str, Enum):
    """支付方式枚举"""
    WECHAT = "wechat"     # 微信支付
    ALIPAY = "alipay"     # 支付宝
    BALANCE = "balance"   # 余额支付


class BannerLinkType(str, Enum):
    """轮播图链接类型枚举"""
    PRODUCT = "product"   # 商品
    GROUP = "group"       # 团购
    URL = "url"           # 网址


class BannerPosition(str, Enum):
    """轮播图位置枚举"""
    HOME = "home"            # 首页
    CATEGORY = "category"    # 分类页


class NoticeType(str, Enum):
    """公告类型枚举"""
    SYSTEM = "system"      # 系统公告
    ACTIVITY = "activity"  # 活动公告


class StorageType(str, Enum):
    """存储类型枚举"""
    LOCAL = "local"   # 本地存储
    OSS = "oss"       # 阿里云OSS
    COS = "cos"       # 腾讯云COS


# 性别枚举
GENDER_UNKNOWN = 0
GENDER_MALE = 1
GENDER_FEMALE = 2

# 系统配置键
SYSTEM_CONFIG_KEYS = {
    "site_name": "站点名称",
    "site_description": "站点描述",
    "commission_rate": "默认佣金率",
    "min_group_members": "最小成团人数",
    "order_auto_cancel_time": "订单自动取消时间(分钟)",
    "order_auto_confirm_time": "订单自动确认时间(天)",
}

# 缓存键前缀
CACHE_KEY_PREFIX = {
    "user": "user:",
    "merchant": "merchant:",
    "product": "product:",
    "group": "group:",
    "order": "order:",
    "token": "token:",
    "wechat": "wechat:",
    "config": "config:",
}

# 缓存过期时间(秒)
CACHE_EXPIRE_TIME = {
    "user": 3600,
    "merchant": 3600,
    "product": 1800,
    "group": 600,
    "order": 1800,
    "token": 86400 * 7,  # 7天
    "wechat": 7200,      # 2小时
    "config": 86400,     # 1天
}