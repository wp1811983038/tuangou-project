#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import time
import os
from PIL import Image
import io
import random
import traceback

# 服务器配置
BASE_URL = "http://localhost:8000/api/v1"

# 接口路径配置
LOGIN_URL = f"{BASE_URL}/auth/phone-login"
PRODUCTS_URL = f"{BASE_URL}/products"
UPLOAD_URL = f"{BASE_URL}/uploads/images"

# 测试账号配置（商户账号）
TEST_MERCHANT_PHONE = "13921892121"
TEST_MERCHANT_PASSWORD = "Password123"

# 全局变量
token = ""
merchant_id = None
product_id = None
first_product_id = None
category_ids = []
test_products = []  # 用于存储测试中创建的商品ID列表，便于清理

def create_test_image(width=400, height=300):
    """创建一个简单的测试图片以供上传测试使用"""
    print("创建测试图片...")
    # 创建一个简单的彩色图片，每次不同颜色
    img = Image.new('RGB', (width, height), color=(random.randint(0, 255), 
                                                   random.randint(0, 255), 
                                                   random.randint(0, 255)))
    
    # 保存到内存中而不是文件系统
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    return img_byte_arr


def setup():
    """初始化测试环境，获取认证令牌和商户信息"""
    global token, merchant_id, category_ids, first_product_id
    
    print("=== 初始化测试环境 ===")
    
    # 1. 登录获取认证令牌
    login_data = {
        "phone": TEST_MERCHANT_PHONE,
        "password": TEST_MERCHANT_PASSWORD
    }
    response = requests.post(LOGIN_URL, json=login_data)
    if response.status_code != 200:
        print(f"登录失败: {response.status_code}")
        print(response.text)
        exit(1)
    
    response_data = response.json()
    token = response_data.get("access_token")
    merchant_id = response_data.get("merchant_id")
    
    print(f"登录成功，Token: {token[:10]}...")
    print(f"商户ID: {merchant_id}")
    
    if not token:
        print("错误：无法获取有效的认证令牌")
        exit(1)
    
    # 如果登录成功但未获取到merchant_id，尝试获取用户信息
    if not merchant_id:
        print("尝试从用户资料获取商户ID...")
        headers = {"Authorization": f"Bearer {token}"}
        user_url = f"{BASE_URL}/users/me"
        response = requests.get(user_url, headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            merchant_id = user_data.get("merchant_id")
            print(f"从用户资料获取到商户ID: {merchant_id}")
    
    # 2. 获取可用的商品分类
    categories_url = f"{BASE_URL}/merchants/categories/all"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(categories_url, headers=headers)
    
    if response.status_code == 200:
        categories = response.json()
        if categories and len(categories) > 0:
            # 选择前两个分类用于测试
            category_ids = [cat["id"] for cat in categories[:2]]
            print(f"获取分类成功: {category_ids}")
        else:
            print("没有可用分类，请先创建分类")
    else:
        print(f"获取分类失败: {response.status_code}")
        print(response.text)
    
    # 3. 获取一个存在的商品ID，用于测试
    params = {
        "page": 1,
        "page_size": 1,
        "sort_by": "created_at",
        "sort_order": "desc"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{PRODUCTS_URL}/", headers=headers, params=params)
    
    if response.status_code == 200:
        result = response.json()
        items = result.get("data", {}).get("items", [])
        if items:
            first_product_id = items[0].get('id')
            print(f"已获取现有商品ID: {first_product_id} 用于参考测试")


def upload_test_image(width=400, height=300):
    """上传测试图片并返回图片URL"""
    # 创建测试图片
    img_data = create_test_image(width=width, height=height)
    
    headers = {"Authorization": f"Bearer {token}"}
    # 不要在files中使用open()，而是直接使用内存中的图片数据
    files = {"files": ("test_image.jpg", img_data, "image/jpeg")}
    data = {"folder": "images"}
    
    # 如果有商户ID，添加到请求中
    if merchant_id:
        data["merchant_id"] = merchant_id
    
    response = requests.post(UPLOAD_URL, headers=headers, files=files, data=data)
    
    if response.status_code == 200:
        result = response.json()
        if result.get("files") and len(result["files"]) > 0:
            image_url = result["files"][0].get("url")
            print(f"图片上传成功: {image_url}")
            return image_url
    
    print(f"图片上传失败: {response.status_code}")
    print(response.text)
    return None


def test_search_products():
    """测试获取商品列表"""
    print("\n=== 测试获取商品列表 ===")
    
    # 设置查询参数
    params = {
        "page": 1,
        "page_size": 10,
        "sort_by": "created_at",
        "sort_order": "desc"
    }
    
    # 添加headers包含token
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{PRODUCTS_URL}/", headers=headers, params=params)
    
    if response.status_code == 200:
        result = response.json()
        total = result.get("data", {}).get("total", 0)
        items = result.get("data", {}).get("items", [])
        
        print(f"查询成功: 共 {total} 个商品")
        if items:
            print("商品列表前3项:")
            for item in items[:3]:
                print(f"  - {item.get('id')}: {item.get('name')} ({item.get('current_price')}元)")
            
            # 如果还没有测试商品ID，使用列表中的第一个商品作为测试对象
            global product_id
            if not product_id and items:
                product_id = items[0].get('id')
                print(f"选择ID为 {product_id} 的商品用于后续测试")
    else:
        print(f"查询失败: {response.status_code}")
        print(response.text)


def test_search_products_with_filters():
    """测试使用不同筛选条件查询商品列表"""
    print("\n=== 测试不同筛选条件查询商品 ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 测试不同的筛选条件组合
    filter_tests = [
        {"name": "价格筛选", "params": {"min_price": 50, "max_price": 150}},
        {"name": "热门商品", "params": {"is_hot": "true"}},
        {"name": "新品筛选", "params": {"is_new": "true"}},
        {"name": "推荐商品", "params": {"is_recommend": "true"}},
        {"name": "商品状态", "params": {"status": 1}},  # 已上架
        {"name": "关键词搜索", "params": {"keyword": "商品"}}
    ]
    
    for test in filter_tests:
        params = {**test["params"], "page": 1, "page_size": 5}
        response = requests.get(f"{PRODUCTS_URL}/", headers=headers, params=params)
        
        if response.status_code == 200:
            result = response.json()
            total = result.get("data", {}).get("total", 0)
            items = result.get("data", {}).get("items", [])
            
            print(f"* {test['name']}筛选结果: 共 {total} 个商品")
            if items and len(items) > 0:
                print(f"  - 首个商品: {items[0].get('name')} ({items[0].get('current_price')}元)")
        else:
            print(f"* {test['name']}筛选失败: {response.status_code}")
            print(response.text)


def test_create_product():
    """测试创建商品"""
    global product_id, test_products
    print("\n=== 测试创建商品 ===")
    
    # 上传图片
    image_url = upload_test_image()
    if not image_url:
        print("图片上传失败，测试无法继续")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 创建商品数据
    product_data = {
        "name": f"测试商品-{int(time.time())}",
        "thumbnail": image_url,
        "original_price": 199.00,
        "current_price": 99.00,
        "group_price": 89.00,
        "stock": 100,
        "unit": "件",
        "description": "这是一个用于接口测试的商品",
        "detail": "<p>商品详情内容</p><p>包含<strong>HTML</strong>格式</p>",
        "status": 1,
        "is_hot": True,
        "is_new": True,
        "is_recommend": True,
        "category_ids": category_ids,
        "images": [
            {
                "image_url": image_url,
                "sort_order": 0
            }
        ],
        "specifications": [
            {
                "name": "颜色",
                "value": "红色",
                "price_adjustment": 0,
                "stock": 50,
                "sort_order": 0
            },
            {
                "name": "颜色",
                "value": "蓝色",
                "price_adjustment": 10,
                "stock": 50,
                "sort_order": 1
            }
        ]
    }
    
    response = requests.post(f"{PRODUCTS_URL}/", headers=headers, json=product_data)
    
    if response.status_code == 200:
        result = response.json()
        product_id = result.get("id")
        test_products.append(product_id)  # 添加到测试商品列表
        print(f"创建商品成功，ID: {product_id}")
        print(f"商品名称: {result.get('name')}")
        print(f"价格: {result.get('current_price')}元")
    else:
        print(f"创建商品失败: {response.status_code}")
        print(response.text)


def test_create_multiple_products():
    """测试创建多个商品"""
    global test_products
    print("\n=== 测试创建多个商品 ===")
    
    if not category_ids:
        print("没有可用的分类，跳过测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 创建多个不同的商品
    products_to_create = 2
    created_count = 0
    
    for i in range(products_to_create):
        # 上传图片
        image_url = upload_test_image()
        if not image_url:
            print(f"商品 {i+1} 图片上传失败，跳过")
            continue
        
        # 创建商品数据，使用不同价格和规格
        product_data = {
            "name": f"批量测试商品-{i+1}-{int(time.time())}",
            "thumbnail": image_url,
            "original_price": 180.00 + (i * 20),
            "current_price": 90.00 + (i * 10),
            "group_price": 80.00 + (i * 10),
            "stock": 80 + (i * 20),
            "unit": "个",
            "description": f"这是批量测试商品 {i+1}",
            "detail": f"<p>批量测试商品 {i+1} 详情</p>",
            "status": 1,
            "is_hot": i % 2 == 0,  # 交替设置
            "is_new": True,
            "is_recommend": i % 2 == 1,  # 交替设置
            "category_ids": category_ids,
            "images": [
                {
                    "image_url": image_url,
                    "sort_order": 0
                }
            ],
            "specifications": [
                {
                    "name": "规格",
                    "value": "标准",
                    "price_adjustment": 0,
                    "stock": 50,
                    "sort_order": 0
                },
                {
                    "name": "规格",
                    "value": "升级版",
                    "price_adjustment": 20 + (i * 5),
                    "stock": 30,
                    "sort_order": 1
                }
            ]
        }
        
        response = requests.post(f"{PRODUCTS_URL}/", headers=headers, json=product_data)
        
        if response.status_code == 200:
            result = response.json()
            new_product_id = result.get("id")
            test_products.append(new_product_id)  # 添加到测试商品列表
            created_count += 1
            print(f"创建商品 {i+1} 成功，ID: {new_product_id}, 名称: {result.get('name')}")
        else:
            print(f"创建商品 {i+1} 失败: {response.status_code}")
            print(response.text)
    
    print(f"批量创建完成，成功: {created_count}, 失败: {products_to_create - created_count}")


def test_get_product_detail():
    """测试获取商品详情"""
    print("\n=== 测试获取商品详情 ===")
    
    if not product_id:
        print("没有可用的商品ID，跳过测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{PRODUCTS_URL}/{product_id}", headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print(f"获取商品详情成功: {result.get('name')}")
        print(f"原价: {result.get('original_price')}元")
        print(f"现价: {result.get('current_price')}元")
        print(f"团购价: {result.get('group_price')}元")
        print(f"库存: {result.get('stock')}{result.get('unit')}")
        
        # 查看规格信息
        specs = result.get("specifications", [])
        if specs:
            print("商品规格:")
            for spec in specs:
                print(f"  - {spec.get('name')}: {spec.get('value')} (+{spec.get('price_adjustment')}元, 库存: {spec.get('stock')})")
    else:
        print(f"获取商品详情失败: {response.status_code}")
        print(response.text)


def test_update_product():
    """测试更新商品信息"""
    print("\n=== 测试更新商品信息 ===")
    
    if not product_id:
        print("没有可用的商品ID，跳过测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 更新商品数据
    update_data = {
        "name": f"更新后的商品-{int(time.time())}",
        "current_price": 89.00,
        "description": "这是更新后的商品描述",
        "is_hot": False,
        "category_ids": category_ids
    }
    
    response = requests.put(f"{PRODUCTS_URL}/{product_id}", headers=headers, json=update_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"更新商品成功: {result.get('name')}")
        print(f"更新后价格: {result.get('current_price')}元")
    else:
        print(f"更新商品失败: {response.status_code}")
        print(response.text)


def test_update_product_status():
    """测试更新商品状态(上架/下架)"""
    print("\n=== 测试商品上架/下架 ===")
    
    if not product_id:
        print("没有可用的商品ID，跳过测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 先获取当前状态
    response = requests.get(f"{PRODUCTS_URL}/{product_id}", headers=headers)
    if response.status_code != 200:
        print(f"获取商品当前状态失败: {response.status_code}")
        return
    
    current_status = response.json().get("status")
    print(f"当前商品状态: {current_status} ({'上架' if current_status == 1 else '下架'})")
    
    # 切换状态
    new_status = 0 if current_status == 1 else 1
    update_data = {"status": new_status}
    
    response = requests.put(f"{PRODUCTS_URL}/{product_id}", headers=headers, json=update_data)
    
    if response.status_code == 200:
        result = response.json()
        status_text = "上架" if new_status == 1 else "下架"
        print(f"商品状态更新成功: {status_text}")
        print(f"商品ID: {result.get('id')}, 名称: {result.get('name')}")
    else:
        print(f"商品状态更新失败: {response.status_code}")
        print(response.text)


def test_update_product_images():
    """测试更新商品图片"""
    print("\n=== 测试更新商品图片 ===")
    
    if not product_id:
        print("没有可用的商品ID，跳过测试")
        return
    
    # 上传两张新图片
    image_url1 = upload_test_image()
    image_url2 = upload_test_image(width=500, height=400)  # 不同尺寸的图片
    
    if not image_url1 or not image_url2:
        print("图片上传失败，跳过测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 更新图片数据
    images_data = [
        {
            "image_url": image_url1,
            "sort_order": 0
        },
        {
            "image_url": image_url2,
            "sort_order": 1
        }
    ]
    
    response = requests.put(
        f"{PRODUCTS_URL}/{product_id}/images", 
        headers=headers, 
        json=images_data
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"更新商品图片成功，共 {len(result)} 张图片")
        for i, image in enumerate(result):
            print(f"  - 图片 {i+1}: {image.get('image_url')}")
    else:
        print(f"更新商品图片失败: {response.status_code}")
        print(response.text)


def test_update_product_specifications():
    """测试更新商品规格"""
    print("\n=== 测试更新商品规格 ===")
    
    if not product_id:
        print("没有可用的商品ID，跳过测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 更新规格数据
    specifications = [
        {
            "name": "颜色",
            "value": "红色",
            "price_adjustment": 0,
            "stock": 40,
            "sort_order": 0
        },
        {
            "name": "颜色",
            "value": "蓝色",
            "price_adjustment": 10,
            "stock": 40,
            "sort_order": 1
        },
        {
            "name": "颜色",
            "value": "绿色",
            "price_adjustment": 20,
            "stock": 20,
            "sort_order": 2
        }
    ]
    
    response = requests.put(
        f"{PRODUCTS_URL}/{product_id}/specifications", 
        headers=headers, 
        json=specifications
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"更新商品规格成功，共 {len(result)} 个规格")
        for spec in result:
            print(f"  - {spec.get('name')}: {spec.get('value')} (+{spec.get('price_adjustment')}元, 库存: {spec.get('stock')})")
    else:
        print(f"更新商品规格失败: {response.status_code}")
        print(response.text)


def test_get_related_products():
    """测试获取相关商品"""
    print("\n=== 测试获取相关商品 ===")
    
    if not product_id:
        print("没有可用的商品ID，跳过测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    params = {"limit": 5}
    response = requests.get(f"{PRODUCTS_URL}/{product_id}/related", headers=headers, params=params)
    
    if response.status_code == 200:
        result = response.json()
        print(f"获取相关商品成功，共 {len(result)} 个相关商品")
        if result:
            print("相关商品列表:")
            for item in result:
                print(f"  - {item.get('id')}: {item.get('name')} ({item.get('current_price')}元)")
    else:
        print(f"获取相关商品失败: {response.status_code}")
        print(response.text)


def test_edge_cases():
    """测试边界情况"""
    print("\n=== 测试边界情况 ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("* 测试获取不存在的商品")
    non_existent_id = 99999
    response = requests.get(f"{PRODUCTS_URL}/{non_existent_id}", headers=headers)
    print(f"  状态码: {response.status_code}")
    if response.status_code != 200:
        print(f"  错误信息: {response.text}")
    
    print("* 测试使用无效价格区间")
    params = {"min_price": 1000, "max_price": 500}
    response = requests.get(f"{PRODUCTS_URL}/", headers=headers, params=params)
    print(f"  状态码: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        total = result.get("data", {}).get("total", 0)
        print(f"  结果数量: {total}")
    
    print("* 测试无权限更新他人商品")
    if first_product_id and first_product_id != product_id:
        # 尝试更新不属于当前商户的商品
        update_data = {"name": "尝试更新他人商品"}
        response = requests.put(f"{PRODUCTS_URL}/{first_product_id}", headers=headers, json=update_data)
        print(f"  状态码: {response.status_code}")
        if response.status_code != 200:
            print(f"  错误信息: {response.text}")


def test_delete_product():
    """测试删除商品"""
    print("\n=== 测试删除商品 ===")
    
    if not product_id:
        print("没有可用的商品ID，跳过测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.delete(f"{PRODUCTS_URL}/{product_id}", headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        success = result.get("data", False)
        if success:
            print("删除商品成功")
        else:
            print("商品未被删除，可能已有关联订单，已被下架")
    else:
        print(f"删除商品失败: {response.status_code}")
        print(response.text)


def cleanup():
    """清理测试数据"""
    print("\n=== 清理测试数据 ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 删除测试创建的所有商品
    success_count = 0
    if test_products:
        for pid in test_products:
            print(f"尝试删除商品 ID: {pid}")
            response = requests.delete(f"{PRODUCTS_URL}/{pid}", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                success = result.get("data", False)
                if success:
                    success_count += 1
                    print(f"  - 商品 {pid} 删除成功")
                else:
                    print(f"  - 商品 {pid} 未被删除，已下架")
            else:
                print(f"  - 商品 {pid} 删除失败: {response.status_code}")
    
    print(f"清理完成: 共删除 {success_count} 个测试商品")


def run_tests():
    """运行所有测试用例"""
    try:
        # 初始化环境
        setup()
        
        # 基础测试
        test_search_products()
        test_search_products_with_filters()
        test_create_product()
        test_get_product_detail()
        test_update_product()
        test_update_product_specifications()
        test_get_related_products()
        
        # 增强测试
        test_create_multiple_products()
        test_update_product_status()
        test_update_product_images()
        test_edge_cases()
        
        # 删除测试
        test_delete_product()
        
        # 清理测试数据
        cleanup()
        
        print("\n所有测试完成！")
    except Exception as e:
        print(f"\n测试过程中发生异常: {str(e)}")
        traceback.print_exc()
        print("\n尝试清理测试数据...")
        cleanup()


if __name__ == "__main__":
    run_tests()