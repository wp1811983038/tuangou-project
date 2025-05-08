#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import shutil

def create_directory(path):
    """创建目录"""
    if not os.path.exists(path):
        os.makedirs(path)
        print(f"创建目录: {path}")

def create_file(path, content=""):
    """创建文件"""
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"创建文件: {path}")

def create_project_structure():
    """创建项目目录结构"""
    base_dir = "group_buy_project"
    
    # 创建根目录
    create_directory(base_dir)
    
    # 前端目录
    frontend_dir = os.path.join(base_dir, "frontend")
    create_directory(frontend_dir)
    
    # 用户端（微信小程序）
    user_dir = os.path.join(frontend_dir, "user-miniprogram")
    create_directory(user_dir)
    create_directory(os.path.join(user_dir, "miniprogram"))
    create_directory(os.path.join(user_dir, "miniprogram", "pages"))
    create_directory(os.path.join(user_dir, "miniprogram", "components"))
    create_directory(os.path.join(user_dir, "miniprogram", "utils"))
    create_directory(os.path.join(user_dir, "miniprogram", "images"))
    create_directory(os.path.join(user_dir, "miniprogram", "styles"))
    create_directory(os.path.join(user_dir, "cloudfunctions"))
    create_file(os.path.join(user_dir, "project.config.json"), '{"description": "团购小程序"}')
    create_file(os.path.join(user_dir, "miniprogram", "app.js"), '// 小程序入口文件')
    create_file(os.path.join(user_dir, "miniprogram", "app.json"), '{"pages": ["pages/index/index"]}')
    create_file(os.path.join(user_dir, "miniprogram", "app.wxss"), '/* 全局样式 */')
    
    # 商户端（Web管理后台）
    merchant_dir = os.path.join(frontend_dir, "merchant-admin")
    create_directory(merchant_dir)
    create_directory(os.path.join(merchant_dir, "src"))
    create_directory(os.path.join(merchant_dir, "src", "views"))
    create_directory(os.path.join(merchant_dir, "src", "components"))
    create_directory(os.path.join(merchant_dir, "src", "utils"))
    create_directory(os.path.join(merchant_dir, "src", "api"))
    create_directory(os.path.join(merchant_dir, "src", "assets"))
    create_file(os.path.join(merchant_dir, "package.json"), '{"name": "merchant-admin", "version": "1.0.0"}')
    create_file(os.path.join(merchant_dir, "src", "main.js"), '// 主入口文件')
    
    # 管理端（Web管理后台）
    admin_dir = os.path.join(frontend_dir, "admin-system")
    create_directory(admin_dir)
    create_directory(os.path.join(admin_dir, "src"))
    create_directory(os.path.join(admin_dir, "src", "views"))
    create_directory(os.path.join(admin_dir, "src", "components"))
    create_directory(os.path.join(admin_dir, "src", "utils"))
    create_directory(os.path.join(admin_dir, "src", "api"))
    create_directory(os.path.join(admin_dir, "src", "assets"))
    create_file(os.path.join(admin_dir, "package.json"), '{"name": "admin-system", "version": "1.0.0"}')
    create_file(os.path.join(admin_dir, "src", "main.js"), '// 主入口文件')
    
    # 后端目录
    backend_dir = os.path.join(base_dir, "backend")
    create_directory(backend_dir)
    create_directory(os.path.join(backend_dir, "app"))
    create_directory(os.path.join(backend_dir, "app", "api"))
    create_directory(os.path.join(backend_dir, "app", "models"))
    create_directory(os.path.join(backend_dir, "app", "schemas"))
    create_directory(os.path.join(backend_dir, "app", "services"))
    create_directory(os.path.join(backend_dir, "app", "utils"))
    create_directory(os.path.join(backend_dir, "app", "core"))
    create_directory(os.path.join(backend_dir, "app", "db"))
    create_directory(os.path.join(backend_dir, "tests"))
    create_directory(os.path.join(backend_dir, "migrations"))
    create_directory(os.path.join(backend_dir, "logs"))
    create_file(os.path.join(backend_dir, "requirements.txt"), '# 依赖包列表\nfastapi\nuvicorn\nsqlalchemy\nmysqlclient')
    create_file(os.path.join(backend_dir, ".env"), '# 环境变量\nDEBUG=True\nDB_HOST=localhost')
    create_file(os.path.join(backend_dir, "app", "main.py"), '# 主入口文件')
    
    # 创建README
    create_file(os.path.join(base_dir, "README.md"), "# 团购小程序系统\n\n包含用户端、商户端和管理端")
    
    print("\n项目基本结构已创建完成！")

if __name__ == "__main__":
    create_project_structure()