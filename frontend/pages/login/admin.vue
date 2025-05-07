<template>
  <view class="admin-login">
    <view class="header">
      <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
      <text class="title">管理员登录</text>
    </view>
    
    <view class="form-container">
      <view class="input-group">
        <text class="label">用户名</text>
        <input class="input" type="text" placeholder="请输入用户名" v-model="username" />
      </view>
      
      <view class="input-group">
        <text class="label">密码</text>
        <input class="input" type="password" placeholder="请输入密码" v-model="password" />
      </view>
      
      <button class="login-btn" @click="handleLogin">登录</button>
    </view>
    
    <view class="back-btn" @click="goBack">
      <text>返回选择</text>
    </view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import http from '../../utils/request';
import type { AdminLoginData } from '../../types/api';

export default defineComponent({
  data() {
    return {
      username: '',
      password: ''
    }
  },
  methods: {
    async handleLogin() {
      // 表单验证
      if (!this.username) {
        uni.showToast({
          title: '请输入用户名',
          icon: 'none'
        });
        return;
      }
      
      if (!this.password) {
        uni.showToast({
          title: '请输入密码',
          icon: 'none'
        });
        return;
      }
      
      try {
        // 发送登录请求
        const res = await http.post<AdminLoginData>('/admin/login', {
          username: this.username,
          password: this.password
        });
        
        // 存储token和管理员信息
        uni.setStorageSync('adminToken', res.data.token);
        uni.setStorageSync('adminInfo', res.data.adminInfo);
        
        // 跳转到管理员首页
        uni.reLaunch({
          url: '/pages/admin/index'
        });
      } catch (error) {
        console.error('登录失败', error);
      }
    },
    goBack() {
      uni.navigateBack();
    }
  }
});
</script>

<style>
.admin-login {
  padding: 40px 20px;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
}

.logo {
  width: 80px;
  height: 80px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  margin-top: 10px;
}

.form-container {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.input-group {
  margin-bottom: 20px;
}

.label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
}

.input {
  width: 100%;
  height: 45px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 12px;
  font-size: 16px;
}

.login-btn {
  width: 100%;
  height: 45px;
  background-color: #1989fa;
  color: white;
  border-radius: 4px;
  font-size: 16px;
  margin-top: 30px;
}

.back-btn {
  text-align: center;
  margin-top: 40px;
  color: #666;
  font-size: 16px;
}
</style>