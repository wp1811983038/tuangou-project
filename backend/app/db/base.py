# app/db/base.py
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# 导入所有模型，以便Alembic可以发现它们
from app.models.user import User, Address, Favorite
from app.models.merchant import Merchant, Category, MerchantCategory
from app.models.product import Product, ProductImage, ProductSpecification
from app.models.group import Group, GroupParticipant
from app.models.order import Order, OrderItem, Payment
from app.models.review import Review, ReviewImage
from app.models.admin import Admin, SystemConfig, Banner, Notice, OperationLog