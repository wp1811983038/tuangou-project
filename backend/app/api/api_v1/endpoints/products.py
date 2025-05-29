# backend/app/api/api_v1/endpoints/products.py

from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path, File, UploadFile
from fastapi import status as http_status
from sqlalchemy.orm import Session
import traceback

from app import schemas
from app.api import deps
from app.services import product_service

router = APIRouter()


@router.get("/", response_model=schemas.common.PaginatedResponse)
async def search_products(
    keyword: Optional[str] = Query(None, max_length=100),
    category_id: Optional[int] = Query(None, ge=1),
    merchant_id: Optional[int] = Query(None, ge=1),
    status: Optional[int] = Query(None, ge=0),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    is_hot: Optional[bool] = Query(None),
    is_new: Optional[bool] = Query(None),
    is_recommend: Optional[bool] = Query(None),
    has_group: Optional[bool] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query(None, regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    # 🔐 重新要求用户认证
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索商品列表 - 需要用户登录
    """
    try:
        print(f"🔍 已登录用户({current_user.nickname})请求商品列表:")
        print(f"  - merchant_id: {merchant_id}")
        print(f"  - keyword: {keyword}")
        print(f"  - status: {status}")
        print(f"  - pagination: {pagination}")
        
        # 传递用户ID以获取个人化信息（如收藏状态）
        user_id = current_user.id
        
        products, total = await product_service.search_products(
            db=db,
            keyword=keyword,
            category_id=category_id,
            merchant_id=merchant_id,
            status=status,
            min_price=min_price,
            max_price=max_price,
            is_hot=is_hot,
            is_new=is_new,
            is_recommend=is_recommend,
            has_group=has_group,
            sort_by=sort_by,
            sort_order=sort_order,
            user_id=user_id,
            skip=pagination["skip"],
            limit=pagination["limit"]
        )
        
        print(f"✅ 服务层返回 {len(products)} 个商品")
        
        # 强制检查返回类型并转换
        if products and len(products) > 0:
            first_item_type = type(products[0])
            print(f"📊 检查第一个商品类型: {first_item_type}")
            
            if not isinstance(products[0], dict):
                print(f"❌ 检测到ORM对象，强制转换为字典...")
                
                converted_products = []
                for i, product in enumerate(products):
                    try:
                        if hasattr(product, '__dict__'):  # 是ORM对象
                            product_dict = {
                                "id": getattr(product, 'id', 0),
                                "merchant_id": getattr(product, 'merchant_id', 0),
                                "merchant_name": "",
                                "name": getattr(product, 'name', ''),
                                "thumbnail": getattr(product, 'thumbnail', ''),
                                "original_price": float(getattr(product, 'original_price', 0) or 0),
                                "current_price": float(getattr(product, 'current_price', 0) or 0),
                                "group_price": float(getattr(product, 'group_price', 0)) if getattr(product, 'group_price') else None,
                                "stock": int(getattr(product, 'stock', 0) or 0),
                                "unit": getattr(product, 'unit', '件'),
                                "description": getattr(product, 'description', ''),
                                "sales": int(getattr(product, 'sales', 0) or 0),
                                "views": int(getattr(product, 'views', 0) or 0),
                                "status": int(getattr(product, 'status', 1) or 1),
                                "sort_order": int(getattr(product, 'sort_order', 0) or 0),
                                "is_hot": bool(getattr(product, 'is_hot', False)),
                                "is_new": bool(getattr(product, 'is_new', True)),
                                "is_recommend": bool(getattr(product, 'is_recommend', False)),
                                "has_group": False,
                                "favorite_count": 0,
                                "is_favorite": False,  # 这里可以通过user_id查询真实的收藏状态
                                "categories": [],
                                "created_at": getattr(product, 'created_at', None),
                                "updated_at": getattr(product, 'updated_at', None)
                            }
                            converted_products.append(product_dict)
                            print(f"   ✅ 转换商品 {i+1}: {product_dict['name']}")
                        else:
                            converted_products.append(product)
                    except Exception as e:
                        print(f"   ❌ 转换商品 {i+1} 失败: {e}")
                        continue
                
                products = converted_products
                print(f"🎉 强制转换完成，现在有 {len(products)} 个字典")
        
        # 最终类型检查
        if products and not isinstance(products[0], dict):
            raise HTTPException(
                status_code=500,
                detail=f"商品数据转换失败: {type(products[0])}"
            )
        
        return {
            "data": {
                "items": products,
                "total": total,
                "page": pagination["page"],
                "page_size": pagination["page_size"],
                "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
            }
        }
        
    except HTTPException as e:
        print(f"❌ HTTP异常: {e.detail}")
        raise
    except Exception as e:
        print(f"❌ API异常: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"搜索商品失败: {str(e)}"
        )





# 🔧 修复2：在 backend/app/api/api_v1/endpoints/products.py 中
# 同时修复商户商品接口的序列化问题

# 🔥 商户商品列表 - 需要商户认证
@router.get("/merchant", response_model=schemas.common.PaginatedResponse)
async def get_merchant_products(
    keyword: Optional[str] = Query(None, max_length=100),
    category_id: Optional[int] = Query(None, ge=1),
    status: Optional[int] = Query(None, ge=0),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    is_hot: Optional[bool] = Query(None),
    is_new: Optional[bool] = Query(None),
    is_recommend: Optional[bool] = Query(None),
    has_group: Optional[bool] = Query(None),
    min_stock: Optional[int] = Query(None, ge=0),
    sort_by: Optional[str] = Query("created_at"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$"),
    pagination: dict = Depends(deps.get_pagination_params),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """获取当前商户的商品列表 - 需要商户认证"""
    try:
        print(f"🏪 商户 {current_user.merchant_id} 请求商品列表")
        
        products, total = await product_service.search_products(
            db=db,
            keyword=keyword,
            category_id=category_id,
            merchant_id=current_user.merchant_id,
            status=status,
            min_price=min_price,
            max_price=max_price,
            is_hot=is_hot,
            is_new=is_new,
            is_recommend=is_recommend,
            has_group=has_group,
            min_stock=min_stock,
            sort_by=sort_by,
            sort_order=sort_order,
            user_id=current_user.id,  # 传递用户ID
            skip=pagination["skip"],
            limit=pagination["limit"]
        )
        
        print(f"✅ 商户商品列表获取成功: {len(products)} 个商品")
        
        # 强制检查数据类型
        if products and not isinstance(products[0], dict):
            print(f"❌ 检测到ORM对象，强制转换...")
            # 应用前面的强制转换逻辑
            converted_products = []
            for i, product in enumerate(products):
                if hasattr(product, '__dict__'):
                    product_dict = {
                        "id": getattr(product, 'id', 0),
                        "merchant_id": getattr(product, 'merchant_id', 0),
                        "merchant_name": "",
                        "name": getattr(product, 'name', ''),
                        "thumbnail": getattr(product, 'thumbnail', ''),
                        "original_price": float(getattr(product, 'original_price', 0) or 0),
                        "current_price": float(getattr(product, 'current_price', 0) or 0),
                        "group_price": float(getattr(product, 'group_price', 0)) if getattr(product, 'group_price') else None,
                        "stock": int(getattr(product, 'stock', 0) or 0),
                        "unit": getattr(product, 'unit', '件'),
                        "description": getattr(product, 'description', ''),
                        "sales": int(getattr(product, 'sales', 0) or 0),
                        "views": int(getattr(product, 'views', 0) or 0),
                        "status": int(getattr(product, 'status', 1) or 1),
                        "sort_order": int(getattr(product, 'sort_order', 0) or 0),
                        "is_hot": bool(getattr(product, 'is_hot', False)),
                        "is_new": bool(getattr(product, 'is_new', True)),
                        "is_recommend": bool(getattr(product, 'is_recommend', False)),
                        "has_group": False,
                        "favorite_count": 0,
                        "is_favorite": False,
                        "categories": [],
                        "created_at": getattr(product, 'created_at', None),
                        "updated_at": getattr(product, 'updated_at', None)
                    }
                    converted_products.append(product_dict)
                else:
                    converted_products.append(product)
            products = converted_products
            print(f"🎉 强制转换完成: {len(products)} 个字典")
        
        return {
            "data": {
                "items": products,
                "total": total,
                "page": pagination["page"],
                "page_size": pagination["page_size"],
                "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 获取商户商品列表失败: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"获取商品列表失败: {str(e)}"
        )



@router.get("/{product_id}")
async def get_product(
    product_id: int = Path(..., ge=1),
    # 🔐 重新要求用户认证
    current_user: schemas.user.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商品详情 - 需要用户登录
    """
    try:
        user_id = current_user.id
        
        print(f"🔍 用户({current_user.nickname})获取商品详情: product_id={product_id}")
        
        product = await product_service.get_product(
            db=db,
            product_id=product_id,
            user_id=user_id
        )
        
        print(f"✅ 商品详情获取成功: {product.get('name', 'unknown')}")
        print(f"📊 商品详情数据类型: {type(product)}")
        
        # 确保返回的是字典
        if not isinstance(product, dict):
            print(f"❌ 商品详情不是字典，数据有问题...")
            raise HTTPException(
                status_code=500,
                detail="商品详情数据序列化错误"
            )
        
        return product
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 获取商品详情失败: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取商品详情失败: {str(e)}"
        )

@router.get("/{product_id}")
async def get_product(
    product_id: int = Path(..., ge=1),
    current_user: Optional[schemas.user.User] = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商品详情
    """
    try:
        user_id = current_user.id if current_user else None
        
        print(f"🔍 获取商品详情请求: product_id={product_id}, user_id={user_id}")
        
        # 调用修复后的服务层函数
        product = await product_service.get_product(
            db=db,
            product_id=product_id,
            user_id=user_id
        )
        
        print(f"✅ 商品详情获取成功: {product.get('name', 'unknown')}")
        
        # 确保返回的是字典
        if not isinstance(product, dict):
            print(f"❌ 商品详情数据类型错误: {type(product)}")
            raise HTTPException(
                status_code=500,
                detail="商品详情数据序列化错误"
            )
        
        return product
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 获取商品详情失败: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取商品详情失败: {str(e)}"
        )


@router.post("/", response_model=schemas.product.Product)
async def create_product(
    product_data: schemas.product.ProductCreate,
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    创建商品
    """
    try:
        product = await product_service.create_product(
            db=db,
            product_data=product_data,
            merchant_id=current_user.merchant_id
        )
        return product
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        print(f"创建商品失败: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建商品失败: {str(e)}"
        )


@router.put("/{product_id}", response_model=schemas.product.Product)
async def update_product(
    product_data: schemas.product.ProductUpdate,
    product_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """更新商品"""
    try:
        existing_product = await product_service.get_product_by_id(db=db, product_id=product_id)
        
        if not existing_product:
            raise HTTPException(
                status_code=404,
                detail="商品不存在"
            )
        
        if existing_product.merchant_id != current_user.merchant_id:
            raise HTTPException(
                status_code=403,
                detail="您没有权限修改此商品"
            )
        
        updated_product = await product_service.update_product(
            db=db,
            product_id=product_id,
            product_data=product_data,
            merchant_id=current_user.merchant_id
        )
        return updated_product
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"更新商品失败: {str(e)}"
        )


@router.put("/{product_id}/images", response_model=List[schemas.product.ProductImage])
async def update_product_images(
    images: List[schemas.product.ProductImageCreate],
    product_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新商品图片
    """
    try:
        # 检查商品权限
        existing_product = await product_service.get_product_by_id_raw(db=db, product_id=product_id)
        
        if not existing_product:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="商品不存在"
            )
        
        if existing_product.merchant_id != current_user.merchant_id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="您没有权限修改此商品"
            )
        
        updated_images = await product_service.update_product_images(
            db=db,
            product_id=product_id,
            merchant_id=current_user.merchant_id,
            images=images
        )
        return updated_images
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"更新商品图片失败: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新商品图片失败: {str(e)}"
        )


@router.put("/{product_id}/specifications", response_model=List[schemas.product.ProductSpecification])
async def update_product_specifications(
    specifications: List[schemas.product.ProductSpecificationCreate],
    product_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    更新商品规格
    """
    try:
        # 检查商品权限
        existing_product = await product_service.get_product_by_id_raw(db=db, product_id=product_id)
        
        if not existing_product:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="商品不存在"
            )
        
        if existing_product.merchant_id != current_user.merchant_id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="您没有权限修改此商品"
            )
        
        updated_specs = await product_service.update_product_specifications(
            db=db,
            product_id=product_id,
            merchant_id=current_user.merchant_id,
            specifications=specifications
        )
        return updated_specs
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"更新商品规格失败: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新商品规格失败: {str(e)}"
        )


@router.delete("/{product_id}", response_model=schemas.common.BooleanResponse)
async def delete_product(
    product_id: int = Path(..., ge=1),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """删除商品"""
    try:
        existing_product = await product_service.get_product_by_id(db=db, product_id=product_id)
        
        if not existing_product:
            raise HTTPException(
                status_code=404,
                detail="商品不存在"
            )
        
        if existing_product.merchant_id != current_user.merchant_id:
            raise HTTPException(
                status_code=403,
                detail="您没有权限删除此商品"
            )
        
        # 检查商品是否有未完成的订单或团购
        if await product_service.has_pending_orders(db=db, product_id=product_id):
            raise HTTPException(
                status_code=400,
                detail="该商品有未完成的订单，无法删除"
            )
        
        if await product_service.has_active_groups(db=db, product_id=product_id):
            raise HTTPException(
                status_code=400,
                detail="该商品有进行中的团购活动，无法删除"
            )
        
        result = await product_service.delete_product(
            db=db,
            product_id=product_id,
            merchant_id=current_user.merchant_id
        )
        return {"data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"删除商品失败: {str(e)}"
        )


@router.get("/{product_id}/related", response_model=List[schemas.product.Product])
async def get_related_products(
    product_id: int = Path(..., ge=1),
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取相关商品 - 修复版
    """
    try:
        print(f"🔗 获取相关商品请求 - 商品ID: {product_id}, 限制: {limit}")
        
        related_products = await product_service.get_related_products(
            db=db,
            product_id=product_id,
            limit=limit
        )
        
        print(f"📦 原始相关商品数据: {len(related_products) if related_products else 'None'}")
        
        # 🔧 确保返回数组格式
        if not related_products:
            print("⚠️ 未找到相关商品，返回空数组")
            return []
            
        if not isinstance(related_products, list):
            print("⚠️ 相关商品数据不是数组格式，进行转换")
            related_products = [related_products] if related_products else []
        
        # 🔧 过滤和格式化数据
        formatted_products = []
        for product in related_products:
            try:
                if hasattr(product, '__dict__'):  # ORM对象
                    formatted_product = {
                        "id": product.id,
                        "name": str(product.name or ""),
                        "thumbnail": str(product.thumbnail or ""),
                        "current_price": float(product.current_price or 0),
                        "original_price": float(product.original_price or 0),
                        "sales": int(product.sales or 0),
                        "merchant_name": str(getattr(product, 'merchant_name', '') or ""),
                        "status": int(product.status or 1)
                    }
                else:  # 字典对象
                    formatted_product = {
                        "id": product.get("id", 0),
                        "name": str(product.get("name", "")),
                        "thumbnail": str(product.get("thumbnail", "")),
                        "current_price": float(product.get("current_price", 0)),
                        "original_price": float(product.get("original_price", 0)),
                        "sales": int(product.get("sales", 0)),
                        "merchant_name": str(product.get("merchant_name", "")),
                        "status": int(product.get("status", 1))
                    }
                
                # 只添加有效的商品
                if formatted_product["id"] > 0 and formatted_product["name"]:
                    formatted_products.append(formatted_product)
                    
            except Exception as e:
                print(f"⚠️ 格式化相关商品数据失败: {str(e)}")
                continue
        
        print(f"✅ 返回 {len(formatted_products)} 个相关商品")
        return formatted_products
        
    except Exception as e:
        print(f"❌ 获取相关商品失败: {str(e)}")
        import traceback
        traceback.print_exc()
        # 返回空数组而不是抛出异常
        return []


@router.get("/merchant/{merchant_id}/categories/{category_id}", response_model=schemas.common.PaginatedResponse)
async def get_merchant_category_products(
    merchant_id: int = Path(..., ge=1),
    category_id: int = Path(..., ge=1),
    pagination: dict = Depends(deps.get_pagination_params),
    sort_by: Optional[str] = Query("created_at"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取指定商户指定分类的商品列表
    """
    try:
        products, total = await product_service.search_products(
            db=db,
            merchant_id=merchant_id,
            category_id=category_id,
            status=1,  # 只获取上架商品
            sort_by=sort_by,
            sort_order=sort_order,
            skip=pagination["skip"],
            limit=pagination["limit"]
        )
        
        return {
            "data": {
                "items": products,
                "total": total,
                "page": pagination["page"],
                "page_size": pagination["page_size"],
                "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
            }
        }
    except Exception as e:
        print(f"获取商户分类商品失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取商户分类商品失败: {str(e)}"
        )
    


    
@router.post("/batch")
async def batch_operation_products(
    request_data: dict = Body(...),
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    批量操作商品
    支持的操作：
    - delete: 批量删除
    - update_status: 批量上下架 (data: {"status": 1/0})
    - update_tags: 批量更新标签 (data: {"is_hot": true/false, "is_new": true/false, "is_recommend": true/false})
    - update_category: 批量更新分类 (data: {"category_ids": [1, 2, 3]})
    """
    operation = request_data.get("operation")
    product_ids = request_data.get("product_ids", [])
    data = request_data.get("data", {})
    
    if not operation:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="请指定操作类型"
        )
    
    if not product_ids:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="请选择要操作的商品"
        )
    
    # 验证操作类型
    valid_operations = ["delete", "update_status", "update_tags", "update_category"]
    if operation not in valid_operations:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的操作类型，支持的操作: {', '.join(valid_operations)}"
        )
    
    try:
        # 验证所有商品都属于当前商户
        products = await product_service.get_products_by_ids_raw(db=db, product_ids=product_ids)
        
        if len(products) != len(product_ids):
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="部分商品不存在"
            )
        
        # 检查权限
        unauthorized_products = [
            p.name for p in products 
            if p.merchant_id != current_user.merchant_id
        ]
        
        if unauthorized_products:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail=f"您没有权限操作以下商品: {', '.join(unauthorized_products[:3])}{'...' if len(unauthorized_products) > 3 else ''}"
            )
        
        # 如果是删除操作，检查是否有未完成的订单
        if operation == "delete":
            products_with_orders = []
            for product in products:
                if await product_service.has_pending_orders(db=db, product_id=product.id):
                    products_with_orders.append(product.name)
            
            if products_with_orders:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail=f"以下商品有未完成的订单，无法删除: {', '.join(products_with_orders[:3])}{'...' if len(products_with_orders) > 3 else ''}"
                )
        
        # 执行批量操作
        result = await product_service.batch_operation(
            db=db,
            operation=operation,
            product_ids=product_ids,
            data=data,
            merchant_id=current_user.merchant_id
        )
        
        return {
            "data": {
                "success": True,
                "processed_count": result.get("success_count", len(product_ids)),
                "failed_count": result.get("failed_count", 0),
                "message": f"批量{operation}操作完成"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"批量操作失败: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量操作失败: {str(e)}"
        )


@router.get("/stats/overview")
async def get_product_stats(
    current_user: schemas.user.User = Depends(deps.get_current_merchant),
    db: Session = Depends(deps.get_db)
) -> Any:
    """获取商品统计概览"""
    try:
        stats = await product_service.get_merchant_product_stats(
            db=db,
            merchant_id=current_user.merchant_id
        )
        return {"data": stats}
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取统计数据失败: {str(e)}"
        )


# 🔐 商品列表 - 需要用户认证
