#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import pathlib

def create_directory(directory):
    """创建目录，如果目录已存在则忽略"""
    pathlib.Path(directory).mkdir(parents=True, exist_ok=True)
    print(f"创建目录: {directory}")

def create_file(file_path):
    """创建空文件"""
    with open(file_path, 'w', encoding='utf-8') as f:
        pass
    print(f"创建文件: {file_path}")

def create_frontend_structure():
    """创建前端项目目录结构"""
    # 基本目录
    base_dir = "frontend"
    create_directory(base_dir)
    
    # 创建管理端和商户端目录结构
    for system in ["admin-system", "merchant-system"]:
        system_dir = os.path.join(base_dir, system)
        create_directory(system_dir)
        
        # 创建 public 目录
        public_dir = os.path.join(system_dir, "public")
        create_directory(public_dir)
        create_file(os.path.join(public_dir, "index.html"))
        create_file(os.path.join(public_dir, "favicon.ico"))
        
        # 创建 src 目录
        src_dir = os.path.join(system_dir, "src")
        create_directory(src_dir)
        
        # 创建 API 目录
        api_dir = os.path.join(src_dir, "api")
        create_directory(api_dir)
        create_file(os.path.join(api_dir, "auth.js"))
        
        # 创建 assets 目录
        assets_dir = os.path.join(src_dir, "assets")
        create_directory(assets_dir)
        create_directory(os.path.join(assets_dir, "images"))
        create_file(os.path.join(assets_dir, "images", "logo.svg"))
        create_file(os.path.join(assets_dir, "images", "login-bg.jpg"))
        
        # 创建 components 目录
        components_dir = os.path.join(src_dir, "components")
        create_directory(components_dir)
        auth_components_dir = os.path.join(components_dir, "Auth")
        create_directory(auth_components_dir)
        create_file(os.path.join(auth_components_dir, "LoginForm.jsx"))
        create_file(os.path.join(auth_components_dir, "LoginForm.less"))
        create_file(os.path.join(auth_components_dir, "ForgotPassword.jsx"))
        
        # 创建 config 目录
        config_dir = os.path.join(src_dir, "config")
        create_directory(config_dir)
        create_file(os.path.join(config_dir, "config.js"))
        create_file(os.path.join(config_dir, "routes.js"))
        
        # 创建 hooks 目录
        hooks_dir = os.path.join(src_dir, "hooks")
        create_directory(hooks_dir)
        create_file(os.path.join(hooks_dir, "useAuth.js"))
        create_file(os.path.join(hooks_dir, "useRequest.js"))
        
        # 创建 layouts 目录
        layouts_dir = os.path.join(src_dir, "layouts")
        create_directory(layouts_dir)
        layout_name = "AdminLayout.jsx" if system == "admin-system" else "MerchantLayout.jsx"
        create_file(os.path.join(layouts_dir, layout_name))
        create_file(os.path.join(layouts_dir, "BasicLayout.jsx"))
        create_file(os.path.join(layouts_dir, "AuthLayout.jsx"))
        
        # 创建 pages 目录
        pages_dir = os.path.join(src_dir, "pages")
        create_directory(pages_dir)
        login_dir = os.path.join(pages_dir, "Login")
        create_directory(login_dir)
        create_file(os.path.join(login_dir, "index.jsx"))
        create_file(os.path.join(login_dir, "index.less"))
        
        # 创建 redux 目录
        redux_dir = os.path.join(src_dir, "redux")
        create_directory(redux_dir)
        create_file(os.path.join(redux_dir, "store.js"))
        slices_dir = os.path.join(redux_dir, "slices")
        create_directory(slices_dir)
        create_file(os.path.join(slices_dir, "authSlice.js"))
        create_file(os.path.join(slices_dir, "userSlice.js"))
        
        # 创建 utils 目录
        utils_dir = os.path.join(src_dir, "utils")
        create_directory(utils_dir)
        create_file(os.path.join(utils_dir, "request.js"))
        create_file(os.path.join(utils_dir, "auth.js"))
        create_file(os.path.join(utils_dir, "storage.js"))
        create_file(os.path.join(utils_dir, "validator.js"))
        
        # 创建主入口文件
        create_file(os.path.join(src_dir, "App.jsx"))
        create_file(os.path.join(src_dir, "index.jsx"))
        create_file(os.path.join(src_dir, "global.less"))
        
        # 创建 package.json
        create_file(os.path.join(system_dir, "package.json"))
        create_file(os.path.join(system_dir, ".gitignore"))
        create_file(os.path.join(system_dir, "README.md"))

if __name__ == "__main__":
    print("开始创建社区团购系统前端目录结构...")
    create_frontend_structure()
    print("目录结构创建完成！")