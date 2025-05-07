<template>
    <view class="container">
      <!-- 商户信息 -->
      <view class="merchant-info">
        <view class="merchant-logo">
          <image :src="merchantInfo.logo || '/static/default-logo.png'" mode="aspectFill"></image>
        </view>
        <view class="merchant-detail">
          <text class="merchant-name">{{ merchantInfo.name }}</text>
          <text class="merchant-status" :class="statusClass">{{ statusText }}</text>
        </view>
      </view>
      
      <!-- 经营数据 -->
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-value">{{ statistics.todayOrders }}</text>
          <text class="stat-label">今日订单</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ statistics.pendingOrders }}</text>
          <text class="stat-label">待处理</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">¥{{ statistics.todayAmount.toFixed(2) }}</text>
          <text class="stat-label">今日金额</text>
        </view>
      </view>
      
      <!-- 功能区 -->
      <view class="feature-grid">
        <view class="feature-item" @click="navigateTo('productList')">
          <text class="feature-icon">📦</text>
          <text class="feature-name">商品管理</text>
        </view>
        <view class="feature-item" @click="navigateTo('orderList')">
          <text class="feature-icon">📑</text>
          <text class="feature-name">订单管理</text>
        </view>
        <view class="feature-item" @click="navigateTo('promotion')">
          <text class="feature-icon">🔥</text>
          <text class="feature-name">促销活动</text>
        </view>
        <view class="feature-item" @click="navigateTo('financial')">
          <text class="feature-icon">💰</text>
          <text class="feature-name">财务管理</text>
        </view>
        <view class="feature-item" @click="navigateTo('setting')">
          <text class="feature-icon">⚙️</text>
          <text class="feature-name">店铺设置</text>
        </view>
        <view class="feature-item" @click="navigateTo('customerService')">
          <text class="feature-icon">💬</text>
          <text class="feature-name">客户服务</text>
        </view>
      </view>
      
      <!-- 最近订单 -->
      <view class="recent-orders">
        <view class="section-header">
          <text class="section-title">最近订单</text>
          <text class="section-more" @click="navigateTo('orderList')">查看更多 ></text>
        </view>
        
        <view class="order-list">
          <view v-for="(item, index) in recentOrders" :key="index" class="order-item" @click="navigateTo('orderDetail', item.id)">
            <view class="order-header">
              <text class="order-no">订单号: {{ item.orderNo }}</text>
              <text class="order-status" :style="{ color: getStatusColor(item.status) }">{{ getStatusText(item.status) }}</text>
            </view>
            <view class="order-info">
              <text class="order-time">{{ item.createTime }}</text>
              <text class="order-price">¥{{ item.totalAmount.toFixed(2) }}</text>
            </view>
          </view>
          
          <view v-if="recentOrders.length === 0" class="empty-order">
            <text>暂无订单</text>
          </view>
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
        merchantInfo: {
          merchantId: 0,
          name: '',
          logo: '',
          status: 1,
        },
        statistics: {
          todayOrders: 0,
          pendingOrders: 0,
          todayAmount: 0,
        },
        recentOrders: [
          {
            id: 1,
            orderNo: 'TD2025050701001',
            status: 1,
            createTime: '2025-05-07 14:30:25',
            totalAmount: 98.50
          },
          {
            id: 2,
            orderNo: 'TD2025050701002',
            status: 2,
            createTime: '2025-05-07 13:05:18',
            totalAmount: 45.80
          },
          {
            id: 3,
            orderNo: 'TD2025050701003',
            status: 3,
            createTime: '2025-05-07 10:18:36',
            totalAmount: 120.00
          }
        ]
      }
    },
    computed: {
      statusText(): string {
        switch(this.merchantInfo.status) {
          case 0: return '审核中';
          case 1: return '正常';
          case -1: return '已禁用';
          default: return '未知状态';
        }
      },
      statusClass(): string {
        switch(this.merchantInfo.status) {
          case 0: return 'status-pending';
          case 1: return 'status-normal';
          case -1: return 'status-disabled';
          default: return '';
        }
      }
    },
    onLoad() {
      // 检查登录状态
      const token = uni.getStorageSync('merchantToken');
      if (!token) {
        uni.redirectTo({
          url: '/pages/login/merchant'
        });
        return;
      }
      
      // 加载商户信息
      this.loadMerchantInfo();
      
      // 加载统计数据
      this.loadStatistics();
      
      // 加载最近订单
      this.loadRecentOrders();
    },
    methods: {
      async loadMerchantInfo() {
        try {
          // 从本地存储获取商户信息
          const merchantInfo = uni.getStorageSync('merchantInfo');
          if (merchantInfo) {
            this.merchantInfo = JSON.parse(merchantInfo);
          }
          
          // 也可以从服务器获取最新的商户信息
          // const res = await http.get('/merchant/info');
          // this.merchantInfo = res.data;
        } catch (error) {
          console.error('加载商户信息失败', error);
        }
      },
      async loadStatistics() {
        try {
          // const res = await http.get('/merchant/statistics');
          // this.statistics = res.data;
          
          // 使用模拟数据
          this.statistics = {
            todayOrders: 12,
            pendingOrders: 3,
            todayAmount: 520.50
          };
        } catch (error) {
          console.error('加载统计数据失败', error);
        }
      },
      async loadRecentOrders() {
        try {
          // const res = await http.get('/merchant/order/recent');
          // this.recentOrders = res.data;
        } catch (error) {
          console.error('加载最近订单失败', error);
        }
      },
      navigateTo(page: string, id?: number) {
        let url = '';
        switch(page) {
          case 'productList':
            url = '/pages/merchant/product/list';
            break;
          case 'orderList':
            url = '/pages/merchant/order/list';
            break;
          case 'orderDetail':
            url = `/pages/merchant/order/detail?id=${id}`;
            break;
          case 'promotion':
            url = '/pages/merchant/promotion/index';
            break;
          case 'financial':
            url = '/pages/merchant/financial/index';
            break;
          case 'setting':
            url = '/pages/merchant/setting/index';
            break;
          case 'customerService':
            url = '/pages/merchant/service/index';
            break;
        }
        
        if (url) {
          uni.navigateTo({ url });
        }
      },
      getStatusText(status: number): string {
        switch(status) {
          case 0: return '待付款';
          case 1: return '待发货';
          case 2: return '已发货';
          case 3: return '已完成';
          case -1: return '已取消';
          default: return '未知状态';
        }
      },
      getStatusColor(status: number): string {
        switch(status) {
          case 0: return '#ff9800';
          case 1: return '#2196f3';
          case 2: return '#9c27b0';
          case 3: return '#4caf50';
          case -1: return '#9e9e9e';
          default: return '#9e9e9e';
        }
      }
    }
  });
  </script>
  
  <style>
  .container {
    padding: 15px;
  }
  
  .merchant-info {
    display: flex;
    align-items: center;
    padding: 15px;
    background-color: #fff;
    border-radius: 8px;
    margin-bottom: 15px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .merchant-logo {
    width: 60px;
    height: 60px;
    border-radius: 30px;
    overflow: hidden;
    margin-right: 15px;
  }
  
  .merchant-logo image {
    width: 100%;
    height: 100%;
  }
  
  .merchant-name {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 5px;
    display: block;
  }
  
  .merchant-status {
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 10px;
    display: inline-block;
  }
  
  .status-pending {
    background-color: #ffefd5;
    color: #ff9800;
  }
  
  .status-normal {
    background-color: #e8f5e9;
    color: #4caf50;
  }
  
  .status-disabled {
    background-color: #f5f5f5;
    color: #9e9e9e;
  }
  
  .stats-card {
    display: flex;
    background-color: #fff;
    border-radius: 8px;
    margin-bottom: 15px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .stat-item {
    flex: 1;
    text-align: center;
    padding: 15px 0;
  }
  
  .stat-value {
    font-size: 18px;
    font-weight: bold;
    color: #333;
    display: block;
    margin-bottom: 5px;
  }
  
  .stat-label {
    font-size: 12px;
    color: #666;
  }
  
  .feature-grid {
    display: flex;
    flex-wrap: wrap;
    background-color: #fff;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 15px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .feature-item {
    width: 33.33%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px solid #f5f5f5;
    border-right: 1px solid #f5f5f5;
    box-sizing: border-box;
  }
  
  .feature-icon {
    font-size: 24px;
    margin-bottom: 5px;
  }
  
  .feature-name {
    font-size: 12px;
    color: #333;
  }
  
  .recent-orders {
    background-color: #fff;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .section-title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
  }
  
  .section-more {
    font-size: 12px;
    color: #2196f3;
  }
  
  .order-item {
    border-bottom: 1px solid #f5f5f5;
    padding: 10px 0;
  }
  
  .order-item:last-child {
    border-bottom: none;
  }
  
  .order-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
  }
  
  .order-no {
    font-size: 14px;
    color: #333;
  }
  
  .order-status {
    font-size: 14px;
  }
  
  .order-info {
    display: flex;
    justify-content: space-between;
  }
  
  .order-time {
    font-size: 12px;
    color: #999;
  }
  
  .order-price {
    font-size: 14px;
    font-weight: bold;
    color: #ff6700;
  }
  
  .empty-order {
    padding: 20px 0;
    text-align: center;
    color: #999;
    font-size: 14px;
  }
  </style>