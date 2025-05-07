<template>
	<view class="container">
	  <!-- 顶部搜索栏 -->
	  <view class="search-bar">
		<view class="search-input">
		  <text class="icon">🔍</text>
		  <input type="text" placeholder="搜索商品" v-model="searchKey" confirm-type="search" @confirm="onSearch" />
		</view>
	  </view>
	  
	  <!-- 分类导航 -->
	  <view class="category-nav">
		<scroll-view scroll-x="true" class="category-scroll">
		  <view class="category-item" :class="{'active': currentCategory === 'all'}" @click="changeCategory('all')">
			<text>全部</text>
		  </view>
		  <view v-for="(item, index) in categories" :key="index" class="category-item" 
				:class="{'active': currentCategory === item.id}" @click="changeCategory(item.id)">
			<text>{{ item.name }}</text>
		  </view>
		</scroll-view>
	  </view>
	  
	  <!-- 商品列表 -->
	  <view class="product-list" v-if="products.length > 0">
		<view v-for="(item, index) in products" :key="index" class="product-item" @click="goToDetail(item.id)">
		  <image class="product-image" :src="item.image" mode="aspectFill"></image>
		  <view class="product-info">
			<text class="product-name">{{ item.name }}</text>
			<text class="product-desc">{{ item.desc }}</text>
			<view class="product-price-box">
			  <text class="product-price">¥{{ item.price.toFixed(2) }}</text>
			  <text class="product-original" v-if="item.originalPrice">¥{{ item.originalPrice.toFixed(2) }}</text>
			</view>
			<view class="add-cart-btn">
			  <text class="add-icon">+</text>
			</view>
		  </view>
		</view>
	  </view>
	  
	  <!-- 空状态 -->
	  <view class="empty-state" v-else>
		<text class="empty-text">暂无商品，敬请期待</text>
	  </view>
	</view>
  </template>
  
  <script>
  export default {
	data() {
	  return {
		searchKey: '',
		currentCategory: 'all',
		categories: [
		  { id: 'fruit', name: '水果' },
		  { id: 'vegetable', name: '蔬菜' },
		  { id: 'meat', name: '肉类' },
		  { id: 'seafood', name: '海鲜' },
		  { id: 'snack', name: '零食' }
		],
		products: [
		  {
			id: 1,
			name: '新鲜苹果',
			desc: '当季优质红富士，脆甜多汁',
			price: 5.99,
			originalPrice: 7.99,
			image: '/static/product/apple.jpg',
			category: 'fruit'
		  },
		  {
			id: 2,
			name: '有机青菜',
			desc: '无农药有机种植，新鲜采摘',
			price: 3.50,
			originalPrice: 4.50,
			image: '/static/product/vegetable.jpg',
			category: 'vegetable'
		  },
		  {
			id: 3,
			name: '精选猪肉',
			desc: '农家土猪肉，肉质鲜嫩',
			price: 23.80,
			originalPrice: 29.90,
			image: '/static/product/meat.jpg',
			category: 'meat'
		  }
		]
	  }
	},
	onLoad() {
	  // 检查登录状态
	  const token = uni.getStorageSync('token');
	  if (!token) {
		uni.redirectTo({
		  url: '/pages/login/index'
		});
		return;
	  }
	  
	  // 加载商品数据
	  this.loadProducts();
	},
	methods: {
	  onSearch() {
		// 搜索商品
		console.log('搜索商品:', this.searchKey);
		this.loadProducts();
	  },
	  changeCategory(categoryId) {
		this.currentCategory = categoryId;
		this.loadProducts();
	  },
	  goToDetail(productId) {
		// 商品详情页面还未创建，先显示提示
		uni.showToast({
		  title: '商品详情页面开发中',
		  icon: 'none'
		});
		// 后续创建页面后可以使用以下代码
		// uni.navigateTo({
		//   url: `/pages/product/detail?id=${productId}`
		// });
	  },
	  loadProducts() {
		try {
		  // 这里可以根据实际 API 接口调整
		  // const res = await http.get('/product/list', {
		  //   category: this.currentCategory === 'all' ? '' : this.currentCategory,
		  //   keyword: this.searchKey
		  // });
		  // this.products = res.data || [];
  
		  // 目前使用模拟数据
		  this.products = [
			{
			  id: 1,
			  name: '新鲜苹果',
			  desc: '当季优质红富士，脆甜多汁',
			  price: 5.99,
			  originalPrice: 7.99,
			  image: '/static/product/apple.jpg',
			  category: 'fruit'
			},
			{
			  id: 2,
			  name: '有机青菜',
			  desc: '无农药有机种植，新鲜采摘',
			  price: 3.50,
			  originalPrice: 4.50,
			  image: '/static/product/vegetable.jpg',
			  category: 'vegetable'
			},
			{
			  id: 3,
			  name: '精选猪肉',
			  desc: '农家土猪肉，肉质鲜嫩',
			  price: 23.80,
			  originalPrice: 29.90,
			  image: '/static/product/meat.jpg',
			  category: 'meat'
			}
		  ];
		  
		  if (this.currentCategory !== 'all') {
			this.products = this.products.filter(item => item.category === this.currentCategory);
		  }
		} catch (error) {
		  console.error('加载商品失败', error);
		  uni.showToast({
			title: '加载商品失败',
			icon: 'none'
		  });
		}
	  }
	}
  }
  </script>
  
  <style>
  .container {
	padding-bottom: 20px;
  }
  
  .search-bar {
	padding: 10px 15px;
	background-color: #f8f8f8;
  }
  
  .search-input {
	display: flex;
	align-items: center;
	background-color: #fff;
	border-radius: 20px;
	padding: 0 15px;
	height: 36px;
  }
  
  .icon {
	margin-right: 5px;
  }
  
  .category-nav {
	margin: 10px 0;
	background-color: #fff;
  }
  
  .category-scroll {
	white-space: nowrap;
	padding: 0 10px;
  }
  
  .category-item {
	display: inline-block;
	padding: 10px 15px;
	margin: 0 5px;
	font-size: 14px;
  }
  
  .category-item.active {
	color: #3cc51f;
	border-bottom: 2px solid #3cc51f;
  }
  
  .product-list {
	padding: 0 10px;
  }
  
  .product-item {
	margin-bottom: 15px;
	background-color: #fff;
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	position: relative;
  }
  
  .product-image {
	width: 100%;
	height: 180px;
  }
  
  .product-info {
	padding: 10px;
  }
  
  .product-name {
	font-size: 16px;
	font-weight: bold;
	margin-bottom: 5px;
  }
  
  .product-desc {
	font-size: 12px;
	color: #666;
	margin-bottom: 10px;
  }
  
  .product-price-box {
	display: flex;
	align-items: baseline;
  }
  
  .product-price {
	font-size: 18px;
	font-weight: bold;
	color: #ff6700;
	margin-right: 8px;
  }
  
  .product-original {
	font-size: 12px;
	color: #999;
	text-decoration: line-through;
  }
  
  .add-cart-btn {
	position: absolute;
	right: 10px;
	bottom: 10px;
	width: 24px;
	height: 24px;
	background-color: #3cc51f;
	border-radius: 12px;
	display: flex;
	justify-content: center;
	align-items: center;
  }
  
  .add-icon {
	color: #fff;
	font-size: 16px;
  }
  
  .empty-state {
	margin-top: 100px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
  }
  
  .empty-text {
	color: #999;
	font-size: 14px;
	margin-top: 10px;
  }
  </style>