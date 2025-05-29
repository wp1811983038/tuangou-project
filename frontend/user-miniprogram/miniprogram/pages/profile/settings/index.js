const settingsPage = {
  data: {
    settings: {
      notifications: true,
      location: true,
      autoUpdate: true
    }
  },

  onLoad() {
    this.loadSettings();
  },

  loadSettings() {
    // 从本地存储加载设置
    try {
      const settings = wx.getStorageSync('userSettings');
      if (settings) {
        this.setData({ settings });
      }
    } catch (error) {
      console.error('加载设置失败', error);
    }
  },

  toggleSetting(e) {
    const { key } = e.currentTarget.dataset;
    const currentValue = this.data.settings[key];
    
    this.setData({
      [`settings.${key}`]: !currentValue
    });
    
    // 保存到本地存储
    try {
      wx.setStorageSync('userSettings', this.data.settings);
    } catch (error) {
      console.error('保存设置失败', error);
    }
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync();
            wx.showToast({
              title: '缓存已清除',
              icon: 'success'
            });
          } catch (error) {
            wx.showToast({
              title: '清除失败', 
              icon: 'none'
            });
          }
        }
      }
    });
  },

  about() {
    wx.showModal({
      title: '关于我们',
      content: '团购小程序 v1.0.0\n提供优质的团购服务',
      showCancel: false
    });
  }
};
