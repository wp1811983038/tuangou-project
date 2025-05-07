# backend/scripts/create_sample_data.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models.admin import Admin
from app.models.merchant import Merchant
from app.models.user import User
from app.utils.password import get_password_hash
from sqlalchemy.sql import func

# 确保数据库表已创建
Base.metadata.create_all(bind=engine)

def create_sample_data():
    """创建示例数据"""
    db = SessionLocal()
    try:
        # 创建示例管理员
        create_admin_samples(db)
        
        # 创建示例商户
        create_merchant_samples(db)
        
        # 创建示例用户
        create_user_samples(db)
        
        print("示例数据创建成功！")
    except Exception as e:
        db.rollback()
        print(f"创建示例数据失败: {str(e)}")
    finally:
        db.close()

def create_admin_samples(db):
    """创建示例管理员"""
    print("创建示例管理员...")
    
    # 超级管理员
    if not db.query(Admin).filter(Admin.username == "admin").first():
        admin = Admin(
            username="admin",
            password=get_password_hash("admin123"),
            name="系统管理员",
            phone="13800138000",
            role=0,  # 超级管理员
            status=1,  # 正常状态
            create_time=func.now()
        )
        db.add(admin)
    
    # 普通管理员
    if not db.query(Admin).filter(Admin.username == "manager").first():
        admin = Admin(
            username="manager",
            password=get_password_hash("manager123"),
            name="普通管理员",
            phone="13800138001",
            role=1,  # 普通管理员
            status=1,  # 正常状态
            create_time=func.now()
        )
        db.add(admin)
    
    db.commit()
    print("示例管理员创建完成")

def create_merchant_samples(db):
    """创建示例商户"""
    print("创建示例商户...")
    
    # 示例商户数据
    merchants = [
        {
            "name": "优鲜水果店",
            "contact_person": "张三",
            "contact_phone": "13900001111",
            "password": "123456",
            "province": "广东省",
            "city": "广州市",
            "district": "天河区",
            "address": "天河路123号",
            "introduction": "专营各类新鲜水果，当日采摘，当日配送。",
            "status": 1  # 正常状态
        },
        {
            "name": "绿色蔬菜铺",
            "contact_person": "李四",
            "contact_phone": "13900002222",
            "password": "123456",
            "province": "广东省",
            "city": "广州市",
            "district": "海珠区",
            "address": "江南大道456号",
            "introduction": "无公害绿色蔬菜，自有农场直供。",
            "status": 1  # 正常状态
        },
        {
            "name": "鲜肉直营店",
            "contact_person": "王五",
            "contact_phone": "13900003333",
            "password": "123456",
            "province": "广东省",
            "city": "广州市",
            "district": "白云区",
            "address": "白云路789号",
            "introduction": "生鲜肉类直营，品质保证。",
            "status": 1  # 正常状态
        },
        {
            "name": "海鲜批发商",
            "contact_person": "赵六",
            "contact_phone": "13900004444",
            "password": "123456",
            "province": "广东省",
            "city": "广州市",
            "district": "番禺区",
            "address": "番禺大道101号",
            "introduction": "各类海鲜批发，价格实惠。",
            "status": 0  # 审核中
        }
    ]
    
    for merchant_data in merchants:
        # 检查商户是否已存在
        if not db.query(Merchant).filter(Merchant.contact_phone == merchant_data["contact_phone"]).first():
            merchant = Merchant(
                name=merchant_data["name"],
                contact_person=merchant_data["contact_person"],
                contact_phone=merchant_data["contact_phone"],
                password=get_password_hash(merchant_data["password"]),
                province=merchant_data["province"],
                city=merchant_data["city"],
                district=merchant_data["district"],
                address=merchant_data["address"],
                introduction=merchant_data["introduction"],
                status=merchant_data["status"],
                create_time=func.now(),
                update_time=func.now()
            )
            db.add(merchant)
    
    db.commit()
    print("示例商户创建完成")

def create_user_samples(db):
    """创建示例用户"""
    print("创建示例用户...")
    
    # 示例用户数据
    users = [
        {
            "openid": "wx_sample_openid_001",
            "nickname": "用户甲",
            "avatar": "https://example.com/avatar1.png",
            "phone": "13800001001",
            "gender": 1,  # 男
            "status": 1  # 正常状态
        },
        {
            "openid": "wx_sample_openid_002",
            "nickname": "用户乙",
            "avatar": "https://example.com/avatar2.png",
            "phone": "13800001002",
            "gender": 2,  # 女
            "status": 1  # 正常状态
        },
        {
            "openid": "wx_sample_openid_003",
            "nickname": "用户丙",
            "avatar": "https://example.com/avatar3.png",
            "phone": "13800001003",
            "gender": 1,  # 男
            "status": 1  # 正常状态
        },
        {
            "openid": "wx_sample_openid_004",
            "nickname": "用户丁",
            "avatar": "https://example.com/avatar4.png",
            "phone": "13800001004",
            "gender": 2,  # 女
            "status": 1  # 正常状态
        },
        {
            "openid": "wx_sample_openid_005",
            "nickname": "用户戊",
            "avatar": "https://example.com/avatar5.png",
            "phone": "13800001005",
            "gender": 0,  # 未知
            "status": 1  # 正常状态
        }
    ]
    
    for user_data in users:
        # 检查用户是否已存在
        if not db.query(User).filter(User.openid == user_data["openid"]).first():
            user = User(
                openid=user_data["openid"],
                nickname=user_data["nickname"],
                avatar=user_data["avatar"],
                phone=user_data["phone"],
                gender=user_data["gender"],
                status=user_data["status"],
                register_time=func.now(),
                last_login_time=func.now()
            )
            db.add(user)
    
    db.commit()
    print("示例用户创建完成")

if __name__ == "__main__":
    create_sample_data()