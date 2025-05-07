<template>
    <view class="container">
      <!-- 顶部欢迎 -->
      <view class="welcome-card">
        <view class="welcome-info">
          <text class="welcome-title">欢迎回来，{{ adminInfo.name }}</text>
          <text class="welcome-subtitle">{{ todayString }}</text>
        </view>
        <view class="admin-avatar">
          <text class="admin-role" :class="{'super-admin': adminInfo.role === 0}">
            {{ adminInfo.role === 0 ? '超级管理员' : '管理员' }}
          </text>
        </view>
      </view>
      
      <!-- 平台概览 -->
      <view class="overview-card">
        <view class="card-header">
          <text class="card-title">平台概览</text>
        </view>
        <view class="overview-grid">
          <view class="overview-item">
            <text class="overview-value">{{ overview.totalUsers }}</text>
            <text class="overview-label">用户总数</text>
          </view>
          <view class="overview-item">
            <text class="overview-value">{{ overview.totalMerchants }}</text>
            <text class="overview-label">商户总数</text>
          </view>
          <view class="overview-item">
            <text class="overview-value">{{ overview.pendingMerchants }}</text>
            <text class="overview-label">待审核商户</text>
          </view>
          <view class="overview-item">
            <text class="overview-value">{{ overview.totalOrders }}</text>
            <text class="overview-label">订单总数</text>
          </view>
        </view>
      </view>
      
      <!-- 功能快捷入口 -->
      <view class="shortcut-card">
        <view class="card-header">
          <text class="card-title">快捷操作</text>
        </view>
        <view class="shortcut-grid">
          <view class="shortcut-item" @click="navigateTo('merchantAudit')">
            <text class="shortcut-icon">✅</text>
            <text class="shortcut-name">商户审核</text>
          </view>
          <view class="shortcut-item" @click="navigateTo('productManage')">
            <text class="shortcut-icon">🛒</text>
            <text class="shortcut-name">商品管理</text>
          </view>
          <view class="shortcut-item" @click="navigateTo('orderManage')">
            <text class="shortcut-icon">📦</text>
            <text class="shortcut-name">订单管理</text>
          </view>
          <view class="shortcut-item" @click="navigateTo('userManage')">
            <text class="shortcut-icon">👥</text>
            <text class="shortcut-name">用户管理</text>
          </view>
          <view class="shortcut-item" @click="navigateTo('merchantManage')">
            <text class="shortcut-icon">🏪</text>
            <text class="shortcut-name">商户管理</text>
          </view>
          <view class="shortcut-item" @click="navigateTo('systemSetting')">
            <text class="shortcut-icon">⚙️</text>
            <text class="shortcut-name">系统设置</text>
          </view>
        </view>
      </view>
      
      <!-- 待处理任务 -->
      <view class="task-card">
        <view class="card-header">
          <text class="card-title">待处理任务</text>
          <text class="card-more" @click="viewAllTasks">查看全部</text>
        </view>
        <view class="task-list">
          <view v-for="(item, index) in pendingTasks" :key="index" class="task-item" @click="handleTask(item)">
            <view class="task-icon" :class="`task-type-${item.type}`">{{ getTaskIcon(item.type) }}</view>
            <view class="task-content">
              <text class="task-title">{{ item.title }}</text>
              <text class="task-time">{{ item.time }}</text>
            </view>
            <text class="task-arrow">></text>
          </view>
          
          <view v-if="pendingTasks.length === 0" class="empty-task">
            <text>暂无待处理任务</text>
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
        adminInfo: {
          adminId: 0,
          name: '',
          role: 1
        },
        todayString: '',
        overview: {
          totalUsers: 0,
          totalMerchants: 0,
          pendingMerchants: 0,
          totalOrders: 0
        },
        pendingTasks: [
          {
            id: 1,
            type: 'merchant',
            title: '新商户注册审核 - 海鲜批发商',
            time: '2小时前'
          },
          {
            id: 2,
            type: 'refund',
            title: '订单退款申请 #TD2025050700156',
            time: '3小时前'
          },
          {
            id: 3,
            type: 'complaint',
            title: '用户投诉 - 商品质量问题',
            time: '5小时前'
          }
        ]
      }
    },
    onLoad() {
      // 检查登录状态
      const token = uni.getStorageSync('adminToken');
      if (!token) {
        uni.redirectTo({
          url: '/pages/login/admin'
        });
        return;
      }
      
      // 设置当前日期
      this.setTodayString();
      
      // 加载管理员信息
      this.loadAdminInfo();
      
      // 加载平台概览数据
      this.loadOverview();
      
      // 加载待处理任务
      this.loadPendingTasks();
    },
    methods: {
      setTodayString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const weekday = weekdays[now.getDay()];
        
        this.todayString = `${year}年${month}月${day}日 ${weekday}`;
      },
      async loadAdminInfo() {
        try {
          // 从本地存储获取管理员信息
          const adminInfo = uni.getStorageSync('adminInfo');
          if (adminInfo) {
            this.adminInfo = JSON.parse(adminInfo);
          }
          
          // 也可以从服务器获取最新的管理员信息
          // const res = await http.get('/admin/info');
          // this.adminInfo = res.data;
        } catch (error) {
          console.error('加载管理员信息失败', error);
        }
      },
      async loadOverview() {
        try {
          // const res = await http.get('/admin/overview');
          // this.overview = res.data;
          
          // 使用模拟数据
          this.overview = {
            totalUsers: 1256,
            totalMerchants: 48,
            pendingMerchants: 3,
            totalOrders: 8765
          };
        } catch (error) {
          console.error('加载平台概览失败', error);
        }
      },
      async loadPendingTasks() {
        try {
          // const res = await http.get('/admin/pending-tasks');
          // this.pendingTasks = res.data;
        } catch (error) {
          console.error('加载待处理任务失败', error);
        }
      },
      navigateTo(page: string) {
        let url = '';
        switch(page) {
          case 'merchantAudit':
            url = '/pages/admin/merchant/audit';
            break;
          case 'productManage':
            url = '/pages/admin/product/index';
            break;
          case 'orderManage':
            url = '/pages/admin/order/index';
            break;
          case 'userManage':
            url = '/pages/admin/user/index';
            break;
          case 'merchantManage':
            url = '/pages/admin/merchant/index';
            break;
          case 'systemSetting':
            url = '/pages/admin/system/index';
            break;
        }
        
        if (url) {
          uni.navigateTo({ url });
        }
      },
      viewAllTasks() {
        uni.navigateTo({
          url: '/pages/admin/task/index'
        });
      },
      handleTask(task: any) {
        let url = '';
        switch(task.type) {
          case 'merchant':
            url = `/pages/admin/merchant/audit?id=${task.id}`;
            break;
          case 'refund':
            url = `/pages/admin/order/refund?id=${task.id}`;
            break;
          case 'complaint':
            url = `/pages/admin/complaint/detail?id=${task.id}`;
            break;
        }
        
        if (url) {
          uni.navigateTo({ url });
        }
      },
      getTaskIcon(type: string): string {
        switch(type) {
          case 'merchant': return '🏪';
          case 'refund': return '💰';
          case 'complaint': return '📣';
          default: return '📋';
        }
      }
    }
  });
  </script>
  
  <style>
  .container {
    padding: 15px;
    background-color: #f5f5f5;
  }
  
  .welcome-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #1989fa;
    border-radius: 8px;
    padding: 20px;
    color: #fff;
    margin-bottom: 15px;
    box-shadow: 0 2px 5px rgba(25, 137, 250, 0.3);
  }
  
  .welcome-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 5px;
    display: block;
  }
  
  .welcome-subtitle {
    font-size: 12px;
    opacity: 0.8;
  }
  
  .admin-avatar {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    padding: 5px 10px;
  }
  
  .admin-role {
    font-size: 12px;
    color: #fff;
  }
  
  .super-admin {
    color: #ffeb3b;
  }
  
  .overview-card, .shortcut-card, .task-card {
    background-color: #fff;
    border-radius: 8px;
    margin-bottom: 15px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border-bottom: 1px solid #f5f5f5;
  }
  
  .card-title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
  }
  
  .card-more {
    font-size: 12px;
    color: #1989fa;
  }
  
  .overview-grid {
    display: flex;
    flex-wrap: wrap;
    padding: 10px 0;
  }
  
  .overview-item {
    width: 50%;
    padding: 10px 0;
    text-align: center;
  }
  
  .overview-value {
    font-size: 20px;
    font-weight: bold;
    color: #333;
    display: block;
    margin-bottom: 5px;
  }
  
  .overview-label {
    font-size: 12px;
    color: #666;
  }
  
  .shortcut-grid {
    display: flex;
    flex-wrap: wrap;
    padding: 5px;
  }
  
  .shortcut-item {
    width: 33.33%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px 0;
  }
  
  .shortcut-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }
  
  .shortcut-name {
    font-size: 12px;
    color: #333;
  }
  
  .task-list {
    padding: 0 15px;
  }
  
  .task-item {
    display: flex;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px solid #f5f5f5;
  }
  
  .task-item:last-child {
    border-bottom: none;
  }
  
  .task-icon {
    width: 36px;
    height: 36px;
    border-radius: 18px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 10px;
  }
  
  .task-type-merchant {
    background-color: #e3f2fd;
  }
  
  .task-type-refund {
    background-color: #fff3e0;
  }
  
  .task-type-complaint {
    background-color: #ffebee;
  }
  
  .task-content {
    flex: 1;
  }
  
  .task-title {
    font-size: 14px;
    color: #333;
    display: block;
    margin-bottom: 3px;
  }
  
  .task-time {
    font-size: 12px;
    color: #999;
  }
  
  .task-arrow {
    color: #ccc;
    font-size: 16px;
  }
  
  .empty-task {
    padding: 20px 0;
    text-align: center;
    color: #999;
    font-size: 14px;
  }
  </style>