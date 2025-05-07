# scripts/create_admin.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.admin import Admin
from app.utils.password import get_password_hash

def create_admin(username, password, name, phone):
    db = SessionLocal()
    try:
        # 检查是否已存在
        admin = db.query(Admin).filter(Admin.username == username).first()
        if admin:
            print(f"管理员 {username} 已存在")
            return
        
        # 创建新管理员
        admin = Admin(
            username=username,
            password=get_password_hash(password),
            name=name,
            phone=phone,
            role=0  # 超级管理员
        )
        db.add(admin)
        db.commit()
        print(f"管理员 {username} 创建成功")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin("admin", "admin123", "系统管理员", "13800138000")