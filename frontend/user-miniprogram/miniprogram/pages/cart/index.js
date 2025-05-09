// pages/cart/index.js
import { checkLoginStatus } from '../../utils/auth';

Page({
  data: {
    // 页面数据
  },

  onLoad: function(options) {
    // 页面加载时执行
    console.log('cart 页面加载');
  },

  onShow: function() {
    // 检查登录状态
    const isLoggedIn = checkLoginStatus(false);
    
    if (!isLoggedIn) {
      // 如果未登录，显示提示或引导用户登录
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
    }
  },

  // 跳转到首页
  goToShopping: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
})