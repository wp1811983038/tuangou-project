<template>
  <view class="login-container">
    <view class="logo-area">
      <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
      <text class="title">社区团购小程序</text>
    </view>
    
    <view class="role-selection">
      <text class="section-title">请选择登录身份</text>
      <view class="role-buttons">
        <button class="role-btn" @click="navigateTo('user')">
          <text class="role-icon">👤</text>
          <text class="role-name">用户登录</text>
        </button>
        <button class="role-btn" @click="navigateTo('merchant')">
          <text class="role-icon">🏪</text>
          <text class="role-name">商户登录</text>
        </button>
        <button class="role-btn" @click="navigateTo('admin')">
          <text class="role-icon">🔑</text>
          <text class="role-name">管理员登录</text>
        </button>
      </view>
    </view>
    
    <view class="wechat-login-area">
      <button class="wechat-btn" open-type="getUserInfo" @getuserinfo="wxLogin">
        <text class="wechat-icon">🔄</text>
        <text>微信一键登录</text>
      </button>
      <text class="tip">微信登录仅适用于用户端</text>
    </view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import http from '../../utils/request';
import type { UserLoginData } from '../../types/api';

export default defineComponent({
  data() {
    return {}
  },
  methods: {
    navigateTo(role: string) {
      if (role === 'user') {
        // 用户选择了用户登录，直接使用微信登录
        uni.showModal({
          title: '提示',
          content: '用户请使用微信一键登录',
          showCancel: false
        });
      } else if (role === 'merchant') {
        // 导航到商户登录页面
        uni.navigateTo({
          url: '/pages/login/merchant'
        });
      } else if (role === 'admin') {
        // 导航到管理员登录页面
        uni.navigateTo({
          url: '/pages/login/admin'
        });
      }
    },
    wxLogin(e: any) {
      if (e.detail.userInfo) {
        // 用户允许授权
        this.userLogin(e.detail.userInfo);
      } else {
        // 用户拒绝授权
        uni.showToast({
          title: '您拒绝了授权',
          icon: 'none'
        });
      }
    },
    async userLogin(userInfo: any) {
      try {
        // 获取code用于换取openid
        const loginRes = await uni.login({ provider: 'weixin' }) as any;
        
        if (loginRes.code) {
          // 请求后端，用code换取openid和session_key
          const res = await http.post<UserLoginData>('/user/login', {
            code: loginRes.code,
            userInfo: userInfo
          });
          
          // 存储token和用户信息
          uni.setStorageSync('token', res.data.token);
          uni.setStorageSync('userInfo', res.data.userInfo);
          
          // 修改这里: 跳转到用户首页
          uni.switchTab({
            url: '/pages/user/index'
          });
        } else {
          uni.showToast({
            title: '微信登录失败',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('登录失败', error);
      }
    }
  }
});
</script>

<style>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 50px;
}

.logo {
  width: 120px;
  height: 120px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  margin-top: 10px;
}

.role-selection {
  width: 100%;
  margin-bottom: 40px;
}

.section-title {
  font-size: 18px;
  margin-bottom: 20px;
  text-align: center;
}

.role-buttons {
  display: flex;
  justify-content: space-around;
}

.role-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 30%;
  padding: 15px 0;
  background-color: #f8f8f8;
  border-radius: 8px;
}

.role-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.role-name {
  font-size: 14px;
}

.wechat-login-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wechat-btn {
  width: 80%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  background-color: #07c160;
  color: white;
  border-radius: 40px;
  margin-bottom: 10px;
}

.wechat-icon {
  margin-right: 8px;
}

.tip {
  font-size: 12px;
  color: #999;
}
</style>