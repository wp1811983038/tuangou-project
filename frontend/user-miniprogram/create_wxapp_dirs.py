#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import shutil

# 定义小程序根目录
base_dir = "miniprogram"

# 定义主要目录结构
main_dirs = [
    "pages",              # 页面
    "components",         # 组件
    "utils",              # 工具函数
    "services",           # API服务
    "assets",             # 静态资源
    "assets/images",      # 图片资源
    "assets/icons",       # 图标资源
    "styles",             # 样式文件
    "config"              # 配置文件
]

# 定义页面目录结构
page_dirs = [
    "pages/index",                    # 首页
    "pages/category",                 # 分类页
    "pages/merchant/detail",          # 商户详情
    "pages/product/detail",           # 商品详情
    "pages/product/list",             # 商品列表
    "pages/group/detail",             # 团购详情
    "pages/group/list",               # 团购列表
    "pages/order/create",             # 创建订单
    "pages/order/detail",             # 订单详情
    "pages/order/list",               # 订单列表
    "pages/order/payment",            # 订单支付
    "pages/profile/index",            # 个人中心
    "pages/profile/settings",         # 个人设置
    "pages/cart/index",               # 购物车
    "pages/search/index",             # 搜索
    "pages/my-groups/index",          # 我的团购
    "pages/review/create",            # 创建评价
    "pages/review/list",              # 评价列表
    "pages/address/list",             # 地址列表
    "pages/address/edit",             # 地址编辑
    "pages/messages/index",           # 消息中心
    "pages/login/index"               # 登录页面
]

# 定义组件目录结构
component_dirs = [
    "components/product-card",        # 商品卡片
    "components/group-card",          # 团购卡片
    "components/merchant-card",       # 商户卡片
    "components/order-item",          # 订单项
    "components/review-item",         # 评价项
    "components/search-bar",          # 搜索栏
    "components/action-bar",          # 底部操作栏
    "components/tab-bar",             # 自定义标签栏
    "components/loading",             # 加载组件
    "components/empty-state",         # 空状态组件
    "components/price",               # 价格组件
    "components/address-item",        # 地址项
    "components/count-down",          # 倒计时组件
    "components/badge",               # 徽章组件
    "components/notice-bar"           # 通知栏
]

# 定义工具函数文件
util_files = [
    "utils/request.js",               # 请求封装
    "utils/auth.js",                  # 认证相关
    "utils/util.js",                  # 通用工具函数
    "utils/location.js",              # 位置相关
    "utils/storage.js",               # 存储相关
    "utils/format.js",                # 格式化相关
    "utils/validator.js",             # 验证相关
    "utils/event-bus.js"              # 事件总线
]

# 定义服务 API 文件
service_files = [
    "services/user.js",               # 用户相关 API
    "services/merchant.js",           # 商户相关 API
    "services/product.js",            # 商品相关 API
    "services/group.js",              # 团购相关 API
    "services/order.js",              # A 相关 API
    "services/review.js",             # 评价相关 API
    "services/address.js",            # 地址相关 API
    "services/payment.js",            # 支付相关 API
    "services/message.js",            # 消息相关 API
    "services/location.js",           # 位置相关 API
    "services/upload.js"              # 上传相关 API
]

# 定义配置文件
config_files = [
    "config/api.js",                  # API 配置
    "config/app.js"                   # 应用配置
]

# 定义样式文件
style_files = [
    "styles/variables.wxss",          # 变量定义
    "styles/common.wxss",             # 通用样式
    "styles/iconfont.wxss",           # 图标字体
    "styles/animation.wxss"           # 动画样式
]

# 定义基础文件
base_files = [
    "app.js",                         # 小程序入口文件
    "app.json",                       # 小程序配置
    "app.wxss",                       # 全局样式
    "project.config.json",            # 项目配置
    "sitemap.json"                    # 微信索引配置
]

# 主函数，创建目录结构和空文件
def main():
    print(f"开始创建微信小程序空目录结构: {base_dir}")
    
    # 如果目录已存在，询问是否覆盖
    if os.path.exists(base_dir):
        answer = input(f"目录 '{base_dir}' 已存在，是否覆盖? (y/n): ")
        if answer.lower() == 'y':
            shutil.rmtree(base_dir)
        else:
            print("已取消操作")
            return
    
    # 创建主目录
    os.makedirs(base_dir, exist_ok=True)
    print(f"已创建主目录: {base_dir}")
    
    # 创建主要目录结构
    for directory in main_dirs:
        full_path = os.path.join(base_dir, directory)
        os.makedirs(full_path, exist_ok=True)
        print(f"已创建目录: {full_path}")
    
    # 创建页面目录结构
    for directory in page_dirs:
        full_path = os.path.join(base_dir, directory)
        os.makedirs(full_path, exist_ok=True)
        
        # 为每个页面创建基本空文件
        base_name = os.path.basename(full_path)
        if base_name != "detail" and base_name != "list" and base_name != "edit" and base_name != "create" and base_name != "payment":
            # 创建 JS 文件
            open(os.path.join(full_path, "index.js"), "w").close()
            # 创建 WXML 文件
            open(os.path.join(full_path, "index.wxml"), "w").close()
            # 创建 WXSS 文件
            open(os.path.join(full_path, "index.wxss"), "w").close()
            # 创建 JSON 文件
            open(os.path.join(full_path, "index.json"), "w").close()
        
        print(f"已创建页面目录和文件: {full_path}")
    
    # 创建组件目录结构
    for directory in component_dirs:
        full_path = os.path.join(base_dir, directory)
        os.makedirs(full_path, exist_ok=True)
        
        # 为每个组件创建基本空文件
        # 创建 JS 文件
        open(os.path.join(full_path, "index.js"), "w").close()
        # 创建 WXML 文件
        open(os.path.join(full_path, "index.wxml"), "w").close()
        # 创建 WXSS 文件
        open(os.path.join(full_path, "index.wxss"), "w").close()
        # 创建 JSON 文件
        open(os.path.join(full_path, "index.json"), "w").close()
        
        print(f"已创建组件目录和文件: {full_path}")
    
    # 创建工具函数文件
    for file_path in util_files:
        full_path = os.path.join(base_dir, file_path)
        directory = os.path.dirname(full_path)
        
        # 确保目录存在
        os.makedirs(directory, exist_ok=True)
        
        # 创建空文件
        open(full_path, "w").close()
        
        print(f"已创建工具函数文件: {full_path}")
    
    # 创建服务 API 文件
    for file_path in service_files:
        full_path = os.path.join(base_dir, file_path)
        directory = os.path.dirname(full_path)
        
        # 确保目录存在
        os.makedirs(directory, exist_ok=True)
        
        # 创建空文件
        open(full_path, "w").close()
        
        print(f"已创建服务 API 文件: {full_path}")
    
    # 创建配置文件
    for file_path in config_files:
        full_path = os.path.join(base_dir, file_path)
        directory = os.path.dirname(full_path)
        
        # 确保目录存在
        os.makedirs(directory, exist_ok=True)
        
        # 创建空文件
        open(full_path, "w").close()
        
        print(f"已创建配置文件: {full_path}")
    
    # 创建样式文件
    for file_path in style_files:
        full_path = os.path.join(base_dir, file_path)
        directory = os.path.dirname(full_path)
        
        # 确保目录存在
        os.makedirs(directory, exist_ok=True)
        
        # 创建空文件
        open(full_path, "w").close()
        
        print(f"已创建样式文件: {full_path}")
    
    # 创建基础配置文件
    for filename in base_files:
        full_path = os.path.join(base_dir, filename)
        
        # 创建空文件
        open(full_path, "w").close()
        
        print(f"已创建基础配置文件: {full_path}")
    
    # 创建一些空白图标文件
    icons_dir = os.path.join(base_dir, "assets/icons")
    icon_files = [
        "home.png", "home-active.png",
        "category.png", "category-active.png",
        "group.png", "group-active.png",
        "cart.png", "cart-active.png",
        "profile.png", "profile-active.png"
    ]
    
    for icon_file in icon_files:
        icon_path = os.path.join(icons_dir, icon_file)
        # 创建空文件
        open(icon_path, "w").close()
        print(f"已创建空白图标文件: {icon_path}")
    
    print("\n微信小程序空目录结构创建完成！")
    print(f"项目路径: {os.path.abspath(base_dir)}")
    print("可以使用微信开发者工具导入项目了。")

if __name__ == "__main__":
    main()