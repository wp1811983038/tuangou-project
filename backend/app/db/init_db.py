# app/db/init_db.py
import logging
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine
from app.core.config import settings
from app.models.admin import Admin, SystemConfig
from app.models.category import Category
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

# 初始类别数据
INIT_CATEGORIES = [
    {"name": "生鲜果蔬", "icon": "/static/icons/category/fruits.png", "sort_order": 1},
    {"name": "肉禽蛋奶", "icon": "/static/icons/category/meat.png", "sort_order": 2},
    {"name": "海鲜水产", "icon": "/static/icons/category/seafood.png", "sort_order": 3},
    {"name": "休闲零食", "icon": "/static/icons/category/snacks.png", "sort_order": 4},
    {"name": "粮油调味", "icon": "/static/icons/category/oil.png", "sort_order": 5},
    {"name": "酒水饮料", "icon": "/static/icons/category/drinks.png", "sort_order": 6},
    {"name": "日用百货", "icon": "/static/icons/category/daily.png", "sort_order": 7},
    {"name": "母婴用品", "icon": "/static/icons/category/baby.png", "sort_order": 8},
]

# 初始系统配置
INIT_CONFIGS = [
    {"key": "site_name", "value": "社区团购", "description": "站点名称"},
    {"key": "site_description", "value": "便捷的社区团购平台", "description": "站点描述"},
    {"key": "commission_rate", "value": "0.05", "description": "默认佣金率"},
    {"key": "min_group_members", "value": "2", "description": "最小成团人数"},
    {"key": "order_auto_cancel_time", "value": "30", "description": "订单自动取消时间(分钟)"},
    {"key": "order_auto_confirm_time", "value": "7", "description": "订单自动确认时间(天)"},
]

def init_db(db: Session) -> None:
    """初始化数据库"""
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    
    # 检查是否已存在管理员账号
    admin_exists = db.query(Admin).filter(Admin.username == "admin").first()
    if not admin_exists:
        # 创建超级管理员账号
        admin = Admin(
            username="admin",
            hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
            name="超级管理员",
            role="admin",
            is_active=True
        )
        db.add(admin)
    
    # 初始化类别
    for category_data in INIT_CATEGORIES:
        category_exists = db.query(Category).filter(Category.name == category_data["name"]).first()
        if not category_exists:
            category = Category(**category_data)
            db.add(category)
    
    # 初始化系统配置
    for config_data in INIT_CONFIGS:
        config_exists = db.query(SystemConfig).filter(SystemConfig.key == config_data["key"]).first()
        if not config_exists:
            config = SystemConfig(**config_data)
            db.add(config)
    
    db.commit()
    logger.info("数据库初始化完成")