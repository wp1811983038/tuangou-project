# backend/app/api/api_v1/endpoints/products.py
from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path, File, UploadFile
from fastapi import status as http_status  # 重命名导入的status模块
from sqlalchemy.orm import Session

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
    current_user: Optional[schemas.user.User] = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    搜索商品列表 - 公开接口
    """
    user_id = current_user.id if current_user else None
    
    try:
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
        
        # 添加调试输出
        print(f"搜索到 {len(products)} 个商品")
        if products:
            print(f"第一个商品数据类型: {type(products[0])}")
            # 如果返回的是ORM对象列表，需要转换
            if hasattr(products[0], '__dict__'):
                print("警告: 商品列表包含ORM对象，需要转换")
                # 这里应该确保search_products返回的是字典列表
        
        return {
            "data": {
                "items": products,  # 确保这是字典列表，而不是ORM对象列表
                "total": total,
                "page": pagination["page"],
                "page_size": pagination["page_size"],
                "pages": (total + pagination["page_size"] - 1) // pagination["page_size"]
            }
        }
    except Exception as e:
        print(f"搜索商品失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"搜索商品失败: {str(e)}"
        )


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
    """获取当前商户的商品列表 - 商户专用接口"""
    try:
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
            sort_by=sort_by,
            sort_order=sort_order,
            user_id=None,
            skip=pagination["skip"],
            limit=pagination["limit"]
        )
        
        # 检查返回的数据类型并强制转换
        print(f"返回的products类型: {type(products)}")
        if products and len(products) > 0:
            print(f"第一个商品的类型: {type(products[0])}")
            
            # 如果返回的是ORM对象列表，手动转换为字典列表
            if hasattr(products[0], '__dict__'):
                print("检测到ORM对象，开始转换...")
                converted_products = []
                
                for product in products:
                    # 手动转换ORM对象为字典
                    product_dict = {
                        "id": product.id,
                        "merchant_id": product.merchant_id,
                        "name": str(product.name or ""),
                        "thumbnail": str(product.thumbnail or ""),
                        "original_price": float(product.original_price or 0),
                        "current_price": float(product.current_price or 0),
                        "group_price": float(product.group_price) if product.group_price else None,
                        "stock": int(product.stock or 0),
                        "unit": str(product.unit or "件"),
                        "description": str(product.description or ""),
                        "sales": int(product.sales or 0),
                        "views": int(product.views or 0),
                        "status": int(product.status or 1),
                        "sort_order": int(product.sort_order or 0),
                        "is_hot": bool(product.is_hot or False),
                        "is_new": bool(product.is_new or True),
                        "is_recommend": bool(product.is_recommend or False),
                        "has_group": False,  # 暂时设为False
                        "favorite_count": 0,  # 暂时设为0
                        "is_favorite": False,  # 暂时设为False
                        "merchant_name": "",  # 暂时为空
                        "categories": [],  # 暂时为空数组
                        "created_at": product.created_at,
                        "updated_at": product.updated_at
                    }
                    converted_products.append(product_dict)
                
                products = converted_products
                print(f"转换完成，转换了 {len(products)} 个商品")
        
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
        print(f"获取商品列表失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"获取商品列表失败: {str(e)}"
        )


@router.get("/{product_id}", response_model=schemas.product.ProductDetail)
async def get_product(
    product_id: int = Path(..., ge=1),
    current_user: Optional[schemas.user.User] = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取商品详情
    """
    user_id = current_user.id if current_user else None
    
    try:
        # 确保这里调用的是服务层函数，返回字典
        product = await product_service.get_product(
            db=db,
            product_id=product_id,
            user_id=user_id
        )
        
        if not product:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="商品不存在"
            )
        
        # 添加调试输出
        print(f"API返回数据类型: {type(product)}")
        if isinstance(product, dict):
            print(f"返回字典键: {list(product.keys())}")
        else:
            print(f"警告: 返回的不是字典类型，而是: {type(product)}")
            # 如果返回的是ORM对象，转换为字典
            if hasattr(product, '__dict__'):
                product_dict = {}
                for key, value in product.__dict__.items():
                    if not key.startswith('_'):  # 跳过SQLAlchemy内部属性
                        if hasattr(value, '__dict__'):  # 如果是嵌套的ORM对象
                            continue  # 跳过复杂对象
                        product_dict[key] = value
                product = product_dict
        
        return product
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取商品详情失败: {str(e)}")
        import traceback
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
        # 修改这一行：get_product_by_id_raw -> get_product_by_id
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
        # 修改这一行：get_product_by_id_raw -> get_product_by_id
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
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    获取相关商品
    """
    try:
        related_products = await product_service.get_related_products(
            db=db,
            product_id=product_id,
            limit=limit
        )
        return related_products
    except Exception as e:
        import traceback
        print(f"获取相关商品失败: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取相关商品失败: {str(e)}"
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
    """
    获取商品统计概览
    """
    try:
        stats = await product_service.get_merchant_product_stats(
            db=db,
            merchant_id=current_user.merchant_id
        )
        
        return {
            "data": stats
        }
    except Exception as e:
        import traceback
        print(f"获取统计数据失败: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取统计数据失败: {str(e)}"
        )