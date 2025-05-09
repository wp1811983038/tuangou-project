// app.js - 小程序入口文件
const { getToken, removeToken, setToken } = require('./utils/auth')
const { apiPath } = require('./config/api')

App({
  // 全局数据
  globalData: {
    userInfo: null,         // 用户信息
    token: null,            // 用户令牌
    location: null,         // 用户位置
    systemInfo: null,       // 系统信息
    navHeight: 0,           // 导航栏高度
    statusBarHeight: 0,     // 状态栏高度
    refreshing: false,      // 是否正在刷新
    cartCount: 0,           // 购物车数量
    messageCount: 0,        // 未读消息数量
    hasLogin: false         // 是否已登录
  },

  // 小程序启动时执行
  onLaunch: function(options) {
    console.log('App onLaunch', options)
    
    // 获取系统信息
    this.getSystemInfo()
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 初始化购物车
    this.initCartCount()
    
    // 获取定位
    this.getLocation()
    
    // 检查更新
    this.checkUpdate()
  },

  // 小程序显示时执行
  onShow: function(options) {
    console.log('App onShow', options)
    
    // 小程序从后台进入前台时可能需要刷新的操作
    if (this.globalData.hasLogin) {
      // 重新获取未读消息数量
      this.getMessageCount()
    }
  },

  // 小程序隐藏时执行
  onHide: function() {
    console.log('App onHide')
  },

  // 小程序发生错误时执行
  onError: function(error) {
    console.error('App onError', error)
  },

  // 小程序发生未处理的Promise拒绝时执行
  onUnhandledRejection: function(res) {
    console.error('App onUnhandledRejection', res)
  },

  // 获取系统信息
  getSystemInfo: function() {
    try {
      const systemInfo = wx.getSystemInfoSync()
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect()
      
      this.globalData.systemInfo = systemInfo
      this.globalData.statusBarHeight = systemInfo.statusBarHeight
      this.globalData.navHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height + systemInfo.statusBarHeight
      
      console.log('系统信息', systemInfo)
      console.log('导航栏高度', this.globalData.navHeight)
    } catch (error) {
      console.error('获取系统信息失败', error)
    }
  },

  // 检查登录状态
  checkLoginStatus: function() {
    try {
      // 获取存储的令牌
      const token = getToken()
      
      if (token) {
        // 设置全局token
        this.globalData.token = token
        this.globalData.hasLogin = true
        
        // 从缓存获取用户信息
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo) {
          this.globalData.userInfo = userInfo
        }
        
        // 校验token有效性
        this.validateToken()
      } else {
        this.globalData.hasLogin = false
      }
    } catch (error) {
      console.error('检查登录状态失败', error)
      this.globalData.hasLogin = false
    }
  },

  // 校验token有效性
  validateToken: function() {
    // 调用用户信息接口，校验token是否过期
    const token = this.globalData.token
    
    if (!token) return
    
    wx.request({
      url: apiPath.user.profile,
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 401) {
          // token已过期，清除登录状态
          this.clearLoginStatus()
        } else if (res.statusCode === 200) {
          // token有效，更新用户信息
          this.globalData.userInfo = res.data
          this.globalData.hasLogin = true
          wx.setStorageSync('userInfo', res.data)
        }
      },
      fail: (err) => {
        console.error('校验token失败', err)
      }
    })
  },

  // 清除登录状态
  clearLoginStatus: function() {
    this.globalData.token = null
    this.globalData.userInfo = null
    this.globalData.hasLogin = false
    removeToken()
    wx.removeStorageSync('userInfo')
  },

  // 初始化购物车数量
  initCartCount: function() {
    try {
      const cart = wx.getStorageSync('cart') || []
      const count = cart.reduce((total, item) => total + item.quantity, 0)
      this.globalData.cartCount = count
    } catch (error) {
      console.error('初始化购物车数量失败', error)
      this.globalData.cartCount = 0
    }
  },

  // 获取未读消息数量
  getMessageCount: function() {
    if (!this.globalData.hasLogin) return
    
    wx.request({
      url: apiPath.message.count,
      header: {
        'Authorization': `Bearer ${this.globalData.token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const count = res.data.unread || 0
          this.globalData.messageCount = count
          
          // 设置TabBar消息红点
          if (count > 0) {
            wx.showTabBarRedDot({
              index: 4 // 个人中心TabBar位置
            })
          } else {
            wx.hideTabBarRedDot({
              index: 4
            })
          }
        }
      }
    })
  },

  // 获取位置
  getLocation: function() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude
        }
        this.globalData.location = location
        wx.setStorageSync('location', location)
        
        // 获取地址信息
        this.getAddressFromLocation(location.latitude, location.longitude)
      },
      fail: (err) => {
        console.error('获取位置失败', err)
        // 使用上次缓存的位置
        const cachedLocation = wx.getStorageSync('location')
        if (cachedLocation) {
          this.globalData.location = cachedLocation
        }
      }
    })
  },

  // 通过经纬度获取地址信息
  getAddressFromLocation: function(latitude, longitude) {
    wx.request({
      url: apiPath.location.address,
      method: 'POST',
      data: {
        latitude,
        longitude
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const location = this.globalData.location || {}
          this.globalData.location = {
            ...location,
            ...res.data
          }
          wx.setStorageSync('location', this.globalData.location)
        }
      }
    })
  },

  // 检查小程序更新
  checkUpdate: function() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('有新版本可用')
          
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: (res) => {
                if (res.confirm) {
                  updateManager.applyUpdate()
                }
              }
            })
          })
          
          updateManager.onUpdateFailed(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本下载失败，请检查网络后重试',
              showCancel: false
            })
          })
        }
      })
    }
  }
})