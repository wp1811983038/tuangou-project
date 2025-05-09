// pages/profile/index.js
import { getUserInfo, isLoggedIn, logout } from '../../utils/auth';

Page({
  data: {
    userInfo: {},
    isLoggedIn: false
  },

  onLoad: function(options) {
    console.log('profile 页面加载');
  },

  onShow: function() {
    // 更新登录状态和用户信息
    this.updateUserInfo();
  },

  // 更新用户信息
  updateUserInfo: function() {
    const loggedIn = isLoggedIn();
    const userInfo = getUserInfo();
    
    this.setData({
      isLoggedIn: loggedIn,
      userInfo: userInfo || {}
    });
  },

  // 去登录页面
  goToLogin: function() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/login/index'
      });
    } else {
      wx.navigateTo({
        url: '/pages/profile/settings/index'
      });
    }
  },

  // 联系客服
  contactUs: function() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-000-0000\n工作时间：9:00-18:00',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4000000000'
          });
        }
      }
    });
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 执行退出登录
          logout();
          
          // 更新页面状态
          this.setData({
            isLoggedIn: false,
            userInfo: {}
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  }
})