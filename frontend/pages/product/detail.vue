<template>
    <view class="container">
      <!-- 商品图片 -->
      <swiper class="product-swiper" indicator-dots autoplay>
        <swiper-item v-for="(item, index) in productImages" :key="index">
          <image :src="item" mode="aspectFill" class="product-image"></image>
        </swiper-item>
      </swiper>
      
      <!-- 商品信息 -->
      <view class="product-info">
        <text class="product-name">{{ product.name }}</text>
        <view class="price-box">
          <text class="price">¥{{ product.price.toFixed(2) }}</text>
          <text class="original-price" v-if="product.originalPrice">¥{{ product.originalPrice.toFixed(2) }}</text>
        </view>
        <text class="sales">销量: {{ product.sales }}</text>
      </view>
      
      <!-- 商品描述 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">商品详情</text>
        </view>
        <view class="section-content">
          <text class="product-desc">{{ product.description }}</text>
        </view>
      </view>
      
      <!-- 商家信息 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">商家信息</text>
        </view>
        <view class="merchant-info">
          <text class="merchant-name">{{ product.merchantName }}</text>
          <text class="merchant-address">{{ product.merchantAddress }}</text>
        </view>
      </view>
      
      <!-- 底部购买栏 -->
      <view class="bottom-bar">
        <view class="action-buttons">
          <button class="add-cart-btn" @click="addToCart">加入购物车</button>
          <button class="buy-now-btn" @click="buyNow">立即购买</button>
        </view>
      </view>
    </view>
  </template>
  
  <script lang="ts">
  import { defineComponent } from "vue";
  import http from '../../utils/request';
  
  export default defineComponent({
    data() {
      return {
        productId: 0,
        product: {
          id: 1,
          name: '新鲜苹果',
          price: 5.99,
          originalPrice: 7.99,
          sales: 1024,
          description: '当季优质红富士苹果，脆甜多汁，富含维生素和矿物质，口感极佳。每一个苹果都经过严格挑选，保证新鲜度和品质。',
          merchantName: '优鲜水果店',
          merchantAddress: '广东省广州市天河区天河路123号'
        },
        productImages: [
          '/static/product/apple1.jpg',
          '/static/product/apple2.jpg',
          '/static/product/apple3.jpg'
        ]
      }
    },
    onLoad(options) {
      // 获取商品ID
      if (options.id) {
        this.productId = parseInt(options.id);
        this.loadProductDetail();
      }
    },
    methods: {
      async loadProductDetail() {
        try {
          // 实际项目中应该从API获取商品详情
          // const res = await http.get(`/product/detail/${this.productId}`);
          // this.product = res.data;
          // this.productImages = res.data.images || [];
          
          // 现在使用模拟数据
          console.log(`加载商品ID: ${this.productId} 的详情`);
        } catch (error) {
          console.error('加载商品详情失败', error);
          uni.showToast({
            title: '加载商品详情失败',
            icon: 'none'
          });
        }
      },
      addToCart() {
        // 添加到购物车逻辑
        uni.showToast({
          title: '已加入购物车',
          icon: 'success'
        });
      },
      buyNow() {
        // 立即购买逻辑
        uni.navigateTo({
          url: `/pages/order/confirm?productId=${this.productId}&quantity=1`
        });
      }
    }
  });
  </script>
  
  <style>
  .container {
    padding-bottom: 50px;
  }
  
  .product-swiper {
    width: 100%;
    height: 300px;
  }
  
  .product-image {
    width: 100%;
    height: 100%;
  }
  
  .product-info {
    padding: 15px;
    background-color: #fff;
    margin-bottom: 10px;
  }
  
  .product-name {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 10px;
  }
  
  .price-box {
    display: flex;
    align-items: baseline;
    margin-bottom: 10px;
  }
  
  .price {
    font-size: 20px;
    font-weight: bold;
    color: #ff6700;
    margin-right: 10px;
  }
  
  .original-price {
    font-size: 14px;
    color: #999;
    text-decoration: line-through;
  }
  
  .sales {
    font-size: 14px;
    color: #666;
  }
  
  .section {
    margin-bottom: 10px;
    background-color: #fff;
    padding: 15px;
  }
  
  .section-header {
    border-left: 3px solid #3cc51f;
    padding-left: 10px;
    margin-bottom: 10px;
  }
  
  .section-title {
    font-size: 16px;
    font-weight: bold;
  }
  
  .product-desc {
    font-size: 14px;
    color: #666;
    line-height: 1.6;
  }
  
  .merchant-info {
    margin-top: 10px;
  }
  
  .merchant-name {
    font-size: 16px;
    color: #333;
    display: block;
    margin-bottom: 5px;
  }
  
  .merchant-address {
    font-size: 14px;
    color: #666;
    display: block;
  }
  
  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50px;
    background-color: #fff;
    border-top: 1px solid #eee;
    display: flex;
    padding: 0 15px;
  }
  
  .action-buttons {
    display: flex;
    flex: 1;
    justify-content: space-between;
    align-items: center;
  }
  
  .add-cart-btn, .buy-now-btn {
    height: 40px;
    line-height: 40px;
    border-radius: 20px;
    font-size: 14px;
    margin: 0;
    width: 48%;
  }
  
  .add-cart-btn {
    background-color: #ff9800;
    color: #fff;
  }
  
  .buy-now-btn {
    background-color: #ff6700;
    color: #fff;
  }
  </style>