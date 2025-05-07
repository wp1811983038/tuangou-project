<template>
  <view class="merchant-login">
    <view class="header">
      <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
      <text class="title">商户登录</text>
    </view>
    
    <view class="form-container">
      <view class="input-group">
        <text class="label">手机号</text>
        <input class="input" type="number" placeholder="请输入手机号" v-model="phone" maxlength="11" />
      </view>
      
      <view class="input-group">
        <text class="label">密码</text>
        <input class="input" type="password" placeholder="请输入密码" v-model="password" />
      </view>
      
      <button class="login-btn" @click="handleLogin">登录</button>
      
      <view class="links">
        <text class="link" @click="goToReset">忘记密码?</text>
        <text class="link" @click="goToRegister">商户注册</text>
      </view>
    </view>
    
    <view class="back-btn" @click="goBack">
      <text>返回选择</text>
    </view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import http from '../../utils/request';
import type { MerchantLoginData } from '../../types/api';

export default defineComponent({
  data() {
    return {
      phone: '',
      password: ''
    }
  },
  methods: {
    async handleLogin() {
      // 表单验证
      if (!this.phone || this.phone.length !== 11) {
        uni.showToast({
          title: '请输入正确的手机号',
          icon: 'none'
        });
        return;
      }
      
      if (!this.password || this.password.length < 6) {
        uni.showToast({
          title: '密码不能少于6位',
          icon: 'none'
        });
        return;
      }
      
      try {
        // 发送登录请求
        const res = await http.post<MerchantLoginData>('/merchant/login', {
          phone: this.phone,
          password: this.password
        });
        
        // 存储token和商户信息
        uni.setStorageSync('merchantToken', res.data.token);
        uni.setStorageSync('merchantInfo', res.data.merchantInfo);
        
        // 跳转到商户首页
        uni.reLaunch({
          url: '/pages/merchant/index'
        });
      } catch (error) {
        console.error('登录失败', error);
      }
    },
    goToReset() {
      uni.navigateTo({
        url: '/pages/login/merchantReset'
      });
    },
    goToRegister() {
      uni.navigateTo({
        url: '/pages/login/merchantRegister'
      });
    },
    goBack() {
      uni.navigateBack();
    }
  }
});
</script>

<style>
.merchant-login {
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
  background-color: #3cc51f;
  color: white;
  border-radius: 4px;
  font-size: 16px;
  margin: 30px 0 20px;
}

.links {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.link {
  color: #3cc51f;
}

.back-btn {
  text-align: center;
  margin-top: 40px;
  color: #666;
  font-size: 16px;
}
</style>