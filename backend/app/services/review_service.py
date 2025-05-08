from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from fastapi import HTTPException, status
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session, joinedload

from app.models.review import Review, ReviewImage
from app.models.order import Order
from app.models.product import Product
from app.models.merchant import Merchant
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewUpdate, ReviewImageCreate, ReviewReplyRequest


async def create_review(db: Session, review_data: ReviewCreate, user_id: int) -> Review:
    """创建商品评价"""
    # 检查订单是否存在且属于该用户
    order = db.query(Order).filter(
        Order.id == review_data.order_id,
        Order.user_id == user_id,
        Order.status == 3  # 已完成
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在或无权评价")
    
    # 检查是否已评价
    existing_review = db.query(Review).filter(
        Review.order_id == review_data.order_id,
        Review.user_id == user_id
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="已评价过该订单")
    
    # 检查商品是否存在
    product = db.query(Product).filter(Product.id == review_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    # 创建评价
    review = Review(
        user_id=user_id,
        product_id=review_data.product_id,
        order_id=review_data.order_id,
        content=review_data.content,
        rating=review_data.rating,
        is_anonymous=review_data.is_anonymous,
        status=0  # 待审核
    )
    
    db.add(review)
    db.flush()  # 获取评价ID
    
    # 添加评价图片
    for image_data in review_data.images:
        review_image = ReviewImage(
            review_id=review.id,
            image_url=image_data.image_url,
            sort_order=image_data.sort_order
        )
        db.add(review_image)
    
    # 更新商品评分
    reviews = db.query(Review).filter(
        Review.product_id == review_data.product_id,
        Review.status == 1  # 已审核
    ).all()
    
    total_rating = sum(r.rating for r in reviews) + review.rating
    avg_rating = total_rating / (len(reviews) + 1)
    
    product.rating = avg_rating
    
    # 更新商户评分
    merchant_id = product.merchant_id
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if merchant:
        merchant_reviews = db.query(Review).join(
            Product, Review.product_id == Product.id
        ).filter(
            Product.merchant_id == merchant_id,
            Review.status == 1  # 已审核
        ).all()
        
        merchant_total_rating = sum(r.rating for r in merchant_reviews) + review.rating
        merchant_avg_rating = merchant_total_rating / (len(merchant_reviews) + 1)
        
        merchant.rating = merchant_avg_rating
    
    db.commit()
    db.refresh(review)
    
    return review


async def get_review(db: Session, review_id: int) -> Dict:
    """获取评价详情"""
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="评价不存在")
    
    # 获取评价图片
    images = db.query(ReviewImage).filter(
        ReviewImage.review_id == review_id
    ).order_by(ReviewImage.sort_order).all()
    
    # 获取用户信息
    user = db.query(User).filter(User.id == review.user_id).first()
    
    # 获取商品信息
    product = db.query(Product).filter(Product.id == review.product_id).first()
    
    # 获取商户信息
    merchant = None
    if product:
        merchant = db.query(Merchant).filter(Merchant.id == product.merchant_id).first()
    
    return {
        "id": review.id,
        "user_id": review.user_id,
        "product_id": review.product_id,
        "order_id": review.order_id,
        "content": review.content,
        "rating": review.rating,
        "is_anonymous": review.is_anonymous,
        "status": review.status,
        "reply_content": review.reply_content,
        "reply_time": review.reply_time,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
        "user": {
            "id": user.id,
            "nickname": user.nickname if not review.is_anonymous else "匿名用户",
            "avatar_url": user.avatar_url if not review.is_anonymous else None
        } if user else None,
        "product_name": product.name if product else None,
        "product_image": product.thumbnail if product else None,
        "merchant_id": product.merchant_id if product else None,
        "merchant_name": merchant.name if merchant else None,
        "images": [
            {
                "id": image.id,
                "image_url": image.image_url,
                "sort_order": image.sort_order
            } for image in images
        ]
    }


async def search_reviews(
    db: Session,
    product_id: Optional[int] = None,
    merchant_id: Optional[int] = None,
    user_id: Optional[int] = None,
    status: Optional[int] = None,
    min_rating: Optional[float] = None,
    max_rating: Optional[float] = None,
    has_reply: Optional[bool] = None,
    has_image: Optional[bool] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[Dict], int]:
    """搜索评价列表"""
    query = db.query(Review)
    
    # 筛选条件
    if product_id:
        query = query.filter(Review.product_id == product_id)
    
    if merchant_id:
        query = query.join(
            Product, Review.product_id == Product.id
        ).filter(
            Product.merchant_id == merchant_id
        )
    
    if user_id:
        query = query.filter(Review.user_id == user_id)
    
    if status is not None:
        query = query.filter(Review.status == status)
    
    if min_rating is not None:
        query = query.filter(Review.rating >= min_rating)
    
    if max_rating is not None:
        query = query.filter(Review.rating <= max_rating)
    
    if has_reply is not None:
        if has_reply:
            query = query.filter(Review.reply_content != None)
        else:
            query = query.filter(Review.reply_content == None)
    
    if has_image is not None:
        if has_image:
            query = query.filter(
                Review.id.in_(
                    db.query(ReviewImage.review_id).distinct()
                )
            )
        else:
            query = query.filter(
                ~Review.id.in_(
                    db.query(ReviewImage.review_id).distinct()
                )
            )
    
    # 查询总数
    total = query.count()
    
    # 排序
    if sort_by:
        direction = desc if sort_order == "desc" else asc
        if sort_by == "rating":
            query = query.order_by(direction(Review.rating))
        elif sort_by == "created_at":
            query = query.order_by(direction(Review.created_at))
    else:
        # 默认按创建时间倒序
        query = query.order_by(Review.created_at.desc())
    
    # 分页
    reviews = query.offset(skip).limit(limit).all()
    
    # 处理结果
    result = []
    for review in reviews:
        # 获取评价图片
        images = db.query(ReviewImage).filter(
            ReviewImage.review_id == review.id
        ).order_by(ReviewImage.sort_order).all()
        
        # 获取用户信息
        user = db.query(User).filter(User.id == review.user_id).first()
        
        # 获取商品信息
        product = db.query(Product).filter(Product.id == review.product_id).first()
        
        # 获取商户信息
        merchant = None
        if product:
            merchant = db.query(Merchant).filter(Merchant.id == product.merchant_id).first()
        
        review_data = {
            "id": review.id,
            "user_id": review.user_id,
            "product_id": review.product_id,
            "order_id": review.order_id,
            "content": review.content,
            "rating": review.rating,
            "is_anonymous": review.is_anonymous,
            "status": review.status,
            "reply_content": review.reply_content,
            "reply_time": review.reply_time,
            "created_at": review.created_at,
            "updated_at": review.updated_at,
            "user": {
                "id": user.id,
                "nickname": user.nickname if not review.is_anonymous else "匿名用户",
                "avatar_url": user.avatar_url if not review.is_anonymous else None
            } if user else None,
            "product_name": product.name if product else None,
            "product_image": product.thumbnail if product else None,
            "merchant_id": product.merchant_id if product else None,
            "merchant_name": merchant.name if merchant else None,
            "images": [
                {
                    "id": image.id,
                    "image_url": image.image_url
                } for image in images
            ]
        }
        
        result.append(review_data)
    
    return result, total


async def reply_review(db: Session, reply_data: ReviewReplyRequest, merchant_id: int) -> Review:
    """商户回复评价"""
    # 获取评价
    review = db.query(Review).filter(Review.id == reply_data.review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="评价不存在")
    
    # 检查商户权限
    product = db.query(Product).filter(Product.id == review.product_id).first()
    if not product or product.merchant_id != merchant_id:
        raise HTTPException(status_code=403, detail="无权限回复该评价")
    
    # 更新评价回复
    review.reply_content = reply_data.reply_content
    review.reply_time = datetime.now()
    
    db.commit()
    db.refresh(review)
    
    return review


async def update_review_status(db: Session, review_id: int, status: int) -> Review:
    """更新评价状态（管理员）"""
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="评价不存在")
    
    # 更新状态
    review.status = status
    
    # 如果通过审核，更新商品和商户评分
    if status == 1:  # 已通过
        # 更新商品评分
        product_id = review.product_id
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            reviews = db.query(Review).filter(
                Review.product_id == product_id,
                Review.status == 1  # 已审核
            ).all()
            
            total_rating = sum(r.rating for r in reviews)
            avg_rating = total_rating / len(reviews) if reviews else 5.0
            
            product.rating = avg_rating
        
        # 更新商户评分
        if product:
            merchant_id = product.merchant_id
            merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
            if merchant:
                merchant_reviews = db.query(Review).join(
                    Product, Review.product_id == Product.id
                ).filter(
                    Product.merchant_id == merchant_id,
                    Review.status == 1  # 已审核
                ).all()
                
                merchant_total_rating = sum(r.rating for r in merchant_reviews)
                merchant_avg_rating = merchant_total_rating / len(merchant_reviews) if merchant_reviews else 5.0
                
                merchant.rating = merchant_avg_rating
    
    db.commit()
    db.refresh(review)
    
    return review


async def get_product_review_stats(db: Session, product_id: int) -> Dict:
    """获取商品评价统计"""
    # 检查商品是否存在
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    # 评价总数
    total_count = db.query(func.count(Review.id)).filter(
        Review.product_id == product_id,
        Review.status == 1  # 已审核
    ).scalar() or 0
    
    # 平均评分
    avg_rating = db.query(func.avg(Review.rating)).filter(
        Review.product_id == product_id,
        Review.status == 1  # 已审核
    ).scalar() or 5.0
    
    # 各星级评价数量
    rating_counts = {}
    for rating in range(1, 6):
        count = db.query(func.count(Review.id)).filter(
            Review.product_id == product_id,
            Review.rating == rating,
            Review.status == 1  # 已审核
        ).scalar() or 0
        rating_counts[str(rating)] = count
    
    # 有图评价数量
    image_count = db.query(func.count(Review.id)).filter(
        Review.product_id == product_id,
        Review.status == 1,  # 已审核
        Review.id.in_(
            db.query(ReviewImage.review_id).distinct()
        )
    ).scalar() or 0
    
    # 好评率（4星及以上）
    good_count = db.query(func.count(Review.id)).filter(
        Review.product_id == product_id,
        Review.rating >= 4,
        Review.status == 1  # 已审核
    ).scalar() or 0
    
    good_rate = good_count / total_count * 100 if total_count > 0 else 100
    
    return {
        "total_count": total_count,
        "avg_rating": float(avg_rating),
        "rating_counts": rating_counts,
        "image_count": image_count,
        "good_count": good_count,
        "good_rate": float(good_rate)
    }