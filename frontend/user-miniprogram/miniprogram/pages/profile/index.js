// pages/profile/index.js - 完整的个人中心页面
import { getUserInfo, isLoggedIn, logout, checkLoginStatus, setUserInfo } from '../../utils/auth';
import { get, post } from '../../utils/request';
import { apiPath } from '../../config/api';

Page({
  data: {
    // 用户基础信息
    userInfo: {},
    isLoggedIn: false,
    
    // 订单统计数据
    orderStats: {
      unpaid: 0,      // 待付款
      unshipped: 0,   // 待发货  
      shipped: 0,     // 待收货
      completed: 0,   // 已完成
      refund: 0       // 退款/售后
    },
    
    // 消息统计
    unreadCount: 0,
    
    // 用户统计信息
    userStats: {
      favoriteCount: 0,    // 收藏数
      reviewCount: 0,      // 评价数
      couponCount: 0,      // 优惠券数
      points: 0,           // 积分
      level: 1,            // 等级
      levelName: '普通会员' // 等级名称
    },
    
    // 页面状态
    loading: false,
    refreshing: false,
    
    // 调试信息（开发时使用）
    debugInfo: {
      showDebug: false, // 生产环境设为 false，开发时可设为 true
      apiResponse: null,
      localStorage: null,
      lastUpdateTime: null
    },
    
    // 工具菜单配置
    toolMenus: [
      {
        id: 'address',
        name: '收货地址',
        icon: '/assets/icons/address.png',
        url: '/pages/address/list/index',
        showArrow: true,
        needLogin: true
      },
      {
        id: 'favorites',
        name: '我的收藏',
        icon: '/assets/icons/favorite.png', 
        url: '/pages/user/favorites/index',
        showArrow: true,
        badge: 0,
        needLogin: true
      },
      {
        id: 'reviews',
        name: '我的评价',
        icon: '/assets/icons/review.png',
        url: '/pages/review/list/index',
        showArrow: true,
        badge: 0,
        needLogin: true
      },
      {
        id: 'messages',
        name: '消息中心',
        icon: '/assets/icons/message.png',
        url: '/pages/messages/index',
        showArrow: true,
        badge: 0,
        needLogin: true
      },
      {
        id: 'coupons',
        name: '我的优惠券',
        icon: '/assets/icons/coupon.png',
        url: '/pages/user/coupons/index',
        showArrow: true,
        badge: 0,
        needLogin: true
      },
      {
        id: 'points',
        name: '积分中心',
        icon: '/assets/icons/points.png',
        url: '/pages/user/points/index',
        showArrow: true,
        needLogin: true
      },
      {
        id: 'service',
        name: '联系客服',
        icon: '/assets/icons/service.png',
        showArrow: true,
        action: 'contactUs',
        needLogin: false
      },
      {
        id: 'settings',
        name: '设置',
        icon: '/assets/icons/settings.png',
        url: '/pages/profile/settings/index',
        showArrow: true,
        needLogin: false
      }
    ]
  },

  /**
   * 页面生命周期 - 加载
   */
  onLoad: function(options) {
    console.log('🏠 个人中心页面加载');
    
    // 记录页面加载时间
    this.setData({
      'debugInfo.lastUpdateTime': new Date().toLocaleString()
    });
  },

  /**
   * 页面生命周期 - 显示
   */
  onShow: function() {
    console.log('👁️ 个人中心页面显示');
    
    // 每次显示页面时刷新数据
    this.initPageData();
  },

  /**
   * 页面生命周期 - 就绪
   */
  onReady: function() {
    console.log('✅ 个人中心页面渲染完成');
  },

  /**
   * 下拉刷新事件
   */
  onPullDownRefresh: function() {
    console.log('🔄 触发下拉刷新');
    this.refreshPageData();
  },

  /**
   * 页面分享
   */
  onShareAppMessage: function() {
    return {
      title: '团购小程序 - 发现更多优质商品',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-default.png'
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline: function() {
    return {
      title: '团购小程序 - 发现更多优质商品',
      imageUrl: '/assets/images/share-default.png'
    };
  },

  // ==================== 数据加载相关方法 ====================

  /**
   * 初始化页面数据
   */
  async initPageData() {
    try {
      // 显示主加载状态
      this.setData({ loading: true });
      
      console.log('🚀 开始初始化页面数据...');
      
      // 1. 更新登录状态和用户信息
      await this.updateUserInfo();
      
      // 2. 如果已登录，获取用户相关数据
      if (this.data.isLoggedIn) {
        await Promise.all([
          this.loadOrderStats(),
          this.loadUserStats(), 
          this.loadUnreadCount()
        ]);
      }
      
      console.log('✅ 页面数据初始化完成');
      
    } catch (error) {
      console.error('❌ 初始化页面数据失败:', error);
      
      // 显示用户友好的错误提示
      wx.showToast({
        title: '加载失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
      
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 刷新页面数据
   */
  async refreshPageData() {
    try {
      this.setData({ refreshing: true });
      
      console.log('🔄 开始刷新页面数据...');
      
      // 清除可能的缓存数据
      this.clearUserInfoCache();
      
      // 重新初始化数据
      await this.initPageData();
      
      // 显示刷新成功提示
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
      
      console.log('✅ 页面数据刷新完成');
      
    } catch (error) {
      console.error('❌ 刷新数据失败:', error);
      
      wx.showToast({
        title: '刷新失败，请重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    }
  },

  /**
   * 更新用户信息 - 核心方法
   */
  async updateUserInfo() {
    console.log('🔍 开始更新用户信息...');
    
    // 1. 检查登录状态
    const loggedIn = isLoggedIn();
    console.log('📱 登录状态检查:', loggedIn ? '✅ 已登录' : '❌ 未登录');

    if (!loggedIn) {
      console.log('⚠️ 用户未登录，显示未登录状态');
      this.setData({
        isLoggedIn: false,
        userInfo: {},
        'debugInfo.localStorage': null,
        'debugInfo.apiResponse': null
      });
      return;
    }

    // 2. 先从本地存储获取用户信息
    const localUserInfo = getUserInfo();
    console.log('💾 本地存储的用户信息:', localUserInfo);

    if (localUserInfo) {
      const processedLocalInfo = this.processUserInfo(localUserInfo);
      this.setData({
        isLoggedIn: true,
        userInfo: processedLocalInfo,
        'debugInfo.localStorage': localUserInfo
      });
      console.log('✅ 已设置本地用户信息');
    }

    // 3. 从服务器获取最新用户信息
    try {
      console.log('🌐 开始从服务器获取用户信息...');
      
      const serverUserInfo = await get(apiPath.user.profile, {}, {
        showLoading: false,
        showError: false
      });
      
      console.log('📡 服务器返回原始数据:', JSON.stringify(serverUserInfo, null, 2));
      
      if (serverUserInfo) {
        // 4. 处理服务器返回的用户信息
        const processedServerInfo = this.processUserInfo(serverUserInfo);
        console.log('🔄 处理后的用户信息:', processedServerInfo);
        
        // 5. 更新页面数据
        this.setData({
          isLoggedIn: true,
          userInfo: processedServerInfo,
          'debugInfo.apiResponse': serverUserInfo,
          'debugInfo.lastUpdateTime': new Date().toLocaleString()
        });
        
        // 6. 更新本地存储
        setUserInfo(processedServerInfo);
        console.log('💾 已更新本地存储');
        
        // 7. 更新全局状态
        const app = getApp();
        if (app) {
          app.globalData.userInfo = processedServerInfo;
          app.globalData.hasLogin = true;
        }
        
        console.log('✅ 用户信息更新完成');
      }
      
    } catch (error) {
      console.error('❌ 获取服务器用户信息失败:', error);
      
      // 根据错误类型处理
      if (error.statusCode === 401) {
        console.log('🔑 Token可能已过期');
        // 可以在这里触发token刷新逻辑
        this.handleTokenExpired();
      } else if (error.statusCode === 404) {
        console.log('👤 用户信息不存在');
      } else {
        console.log('🌐 网络请求失败，使用本地缓存数据');
        
        // 如果有本地数据就继续使用，否则提示用户
        if (!localUserInfo) {
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'none'
          });
        }
      }
    }
  },

  /**
   * 处理用户信息 - 数据映射和格式化
   */
  processUserInfo(rawUserInfo) {
    if (!rawUserInfo) {
      console.log('⚠️ 原始用户信息为空');
      return {};
    }

    console.log('🔄 开始处理用户信息...');
    console.log('📋 原始数据字段检查:');
    console.log('  - id:', rawUserInfo.id);
    console.log('  - nickname:', rawUserInfo.nickname);
    console.log('  - nickName:', rawUserInfo.nickName);
    console.log('  - name:', rawUserInfo.name);
    console.log('  - realName:', rawUserInfo.realName);
    console.log('  - phone:', rawUserInfo.phone);
    console.log('  - mobile:', rawUserInfo.mobile);
    console.log('  - avatar:', rawUserInfo.avatar);
    console.log('  - avatarUrl:', rawUserInfo.avatarUrl);
    console.log('  - head_img:', rawUserInfo.head_img);

    // 1. 处理显示名称 - 按优先级获取
    let displayName = this.getUserDisplayName(rawUserInfo);
    
    // 2. 处理头像
    let avatarUrl = this.getUserAvatarUrl(rawUserInfo);
    
    // 3. 处理其他信息
    const processedInfo = {
      ...rawUserInfo,
      displayName: displayName,
      nickName: displayName,     // 保持兼容性
      name: displayName,         // 保持兼容性
      avatarUrl: avatarUrl,
      // 确保必要字段存在
      id: rawUserInfo.id || 0,
      phone: rawUserInfo.phone || rawUserInfo.mobile || '',
      email: rawUserInfo.email || '',
      gender: rawUserInfo.gender || 0,
      birthday: rawUserInfo.birthday || '',
      level: rawUserInfo.level || 1,
      points: rawUserInfo.points || 0
    };

    console.log('🎯 最终处理的用户信息:');
    console.log('  - displayName:', displayName);
    console.log('  - avatarUrl:', avatarUrl);
    console.log('  - phone:', processedInfo.phone);
    
    return processedInfo;
  },

  /**
   * 获取用户显示名称 - 按优先级
   */
  getUserDisplayName(userInfo) {
    if (!userInfo) {
      console.log('⚠️ 用户信息为空，使用默认名称');
      return '团购用户';
    }

    // 优先级顺序：nickname > nickName > name > realName > user_name > 脱敏手机号 > 默认名
    const nameFields = [
      userInfo.nickname,
      userInfo.nickName, 
      userInfo.name,
      userInfo.realName,
      userInfo.user_name,
      userInfo.userName
    ];
    
    for (let name of nameFields) {
      if (name && typeof name === 'string' && name.trim()) {
        const trimmedName = name.trim();
        console.log('✅ 使用字段作为显示名:', trimmedName);
        return trimmedName;
      }
    }
    
    // 如果没有名称字段，尝试使用手机号
    const phone = userInfo.phone || userInfo.mobile;
    if (phone && typeof phone === 'string') {
      const maskedPhone = this.maskPhone(phone);
      console.log('📱 使用脱敏手机号作为显示名:', maskedPhone);
      return maskedPhone;
    }
    
    console.log('⚠️ 没有可用的名称信息，使用默认名称');
    return '团购用户';
  },

  /**
   * 获取用户头像URL
   */
  getUserAvatarUrl(userInfo) {
    if (!userInfo) return '/assets/images/logo.png';
    
    const avatarFields = [
      userInfo.avatarUrl,
      userInfo.avatar,
      userInfo.head_img,
      userInfo.headImg
    ];
    
    for (let avatar of avatarFields) {
      if (avatar && typeof avatar === 'string' && avatar.trim()) {
        console.log('✅ 使用头像:', avatar);
        return avatar.trim();
      }
    }
    
    console.log('⚠️ 没有头像信息，使用默认头像');
    return '/assets/images/logo.png';
  },

  /**
   * 手机号脱敏处理
   */
  maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return phone;
    
    // 移除所有非数字字符
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
    } else if (cleanPhone.length >= 7) {
      const start = cleanPhone.substring(0, 3);
      const end = cleanPhone.substring(cleanPhone.length - 4);
      return `${start}****${end}`;
    }
    
    return phone;
  },

  /**
   * 加载订单统计数据
   */
  async loadOrderStats() {
    try {
      console.log('📊 开始加载订单统计...');
      
      const result = await get(apiPath.order.statistics, {}, {
        showLoading: false,
        showError: false
      });
      
      console.log('📈 订单统计API返回:', result);
      
      // 处理订单统计数据，支持不同的数据格式
      const orderStats = {
        unpaid: this.getStatValue(result, ['unpaid', 'pending_payment', 'wait_pay']) || 0,
        unshipped: this.getStatValue(result, ['unshipped', 'pending_delivery', 'wait_ship']) || 0,
        shipped: this.getStatValue(result, ['shipped', 'in_transit', 'wait_receive']) || 0,
        completed: this.getStatValue(result, ['completed', 'finished', 'done']) || 0,
        refund: this.getStatValue(result, ['refund', 'refunding', 'after_sale']) || 0
      };
      
      this.setData({ orderStats });
      console.log('✅ 订单统计加载完成:', orderStats);
      
    } catch (error) {
      console.error('❌ 加载订单统计失败:', error);
      
      // 使用默认值，不影响页面显示
      this.setData({
        orderStats: {
          unpaid: 0, unshipped: 0, shipped: 0, completed: 0, refund: 0
        }
      });
    }
  },

  /**
   * 获取统计值 - 支持多种字段名
   */
  getStatValue(data, fieldNames) {
    if (!data || !Array.isArray(fieldNames)) return 0;
    
    for (let fieldName of fieldNames) {
      if (data[fieldName] !== undefined && data[fieldName] !== null) {
        const value = parseInt(data[fieldName]) || 0;
        console.log(`📊 找到统计字段 ${fieldName}:`, value);
        return value;
      }
    }
    
    return 0;
  },

  /**
   * 加载用户统计信息
   */
  async loadUserStats() {
    try {
      console.log('📊 开始加载用户统计信息...');
      
      // 并行请求多个接口获取统计信息
      const [favoritesResult, reviewsResult] = await Promise.allSettled([
        get(apiPath.user.favorites, { page: 1, page_size: 1 }, { showLoading: false, showError: false }),
        get(apiPath.review.list, { page: 1, page_size: 1 }, { showLoading: false, showError: false })
      ]);
      
      const userStats = { ...this.data.userStats };
      
      // 处理收藏数
      if (favoritesResult.status === 'fulfilled' && favoritesResult.value) {
        userStats.favoriteCount = favoritesResult.value.data?.total || 0;
        this.updateToolMenuBadge('favorites', userStats.favoriteCount);
        console.log('✅ 收藏数:', userStats.favoriteCount);
      }
      
      // 处理评价数  
      if (reviewsResult.status === 'fulfilled' && reviewsResult.value) {
        userStats.reviewCount = reviewsResult.value.data?.total || 0;
        this.updateToolMenuBadge('reviews', userStats.reviewCount);
        console.log('✅ 评价数:', userStats.reviewCount);
      }
      
      // 模拟其他统计数据（可根据实际API调整）
      userStats.couponCount = Math.floor(Math.random() * 5);
      userStats.points = Math.floor(Math.random() * 1000);
      userStats.level = Math.min(5, Math.floor(userStats.points / 200) + 1);
      userStats.levelName = this.getLevelName(userStats.level);
      
      this.updateToolMenuBadge('coupons', userStats.couponCount);
      
      this.setData({ userStats });
      console.log('📊 用户统计信息加载完成:', userStats);
      
    } catch (error) {
      console.error('❌ 加载用户统计失败:', error);
    }
  },

  /**
   * 加载未读消息数量
   */
  async loadUnreadCount() {
    try {
      console.log('📬 开始加载未读消息数量...');
      
      const result = await get(apiPath.message.count, {}, {
        showLoading: false,
        showError: false
      });
      
      const unreadCount = result.unread || result.unread_count || 0;
      this.setData({ unreadCount });
      this.updateToolMenuBadge('messages', unreadCount);
      
      console.log('✅ 未读消息数量:', unreadCount);
      
    } catch (error) {
      console.error('❌ 加载未读消息数量失败:', error);
    }
  },

  /**
   * 更新工具菜单徽章数量
   */
  updateToolMenuBadge(menuId, count) {
    const toolMenus = this.data.toolMenus.map(menu => {
      if (menu.id === menuId) {
        return { ...menu, badge: count };
      }
      return menu;
    });
    
    this.setData({ toolMenus });
  },

  /**
   * 获取等级名称
   */
  getLevelName(level) {
    const levelNames = {
      1: '普通会员',
      2: '铜牌会员', 
      3: '银牌会员',
      4: '金牌会员',
      5: 'VIP会员'
    };
    return levelNames[level] || '普通会员';
  },

  // ==================== 事件处理方法 ====================

  /**
   * 点击用户信息区域
   */
  goToLogin: function() {
    if (!this.data.isLoggedIn) {
      // 未登录，跳转到登录页
      wx.navigateTo({
        url: '/pages/login/index'
      });
    } else {
      // 已登录，显示更多选项
      wx.showActionSheet({
        itemList: ['编辑资料', '刷新用户信息', '查看调试信息'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 编辑资料
            wx.navigateTo({
              url: '/pages/user/profile/index'
            });
          } else if (res.tapIndex === 1) {
            // 刷新用户信息
            this.refreshUserInfo();
          } else if (res.tapIndex === 2) {
            // 查看调试信息
            this.showDebugInfo();
          }
        }
      });
    }
  },

  /**
   * 手动刷新用户信息
   */
  async refreshUserInfo() {
    wx.showLoading({ title: '刷新中...' });
    
    try {
      console.log('🔄 手动刷新用户信息...');
      
      await this.updateUserInfo();
      await this.loadUserStats();
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('❌ 刷新用户信息失败:', error);
      
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 显示调试信息
   */
  showDebugInfo: function() {
    const { debugInfo, userInfo } = this.data;
    
    const debugContent = [
      `🕐 最后更新: ${debugInfo.lastUpdateTime || '未知'}`,
      `💾 本地存储: ${debugInfo.localStorage ? '有数据' : '无数据'}`,
      `📡 API响应: ${debugInfo.apiResponse ? '有数据' : '无数据'}`,
      `👤 当前用户名: ${userInfo.displayName || '未设置'}`,
      `📱 当前头像: ${userInfo.avatarUrl ? '已设置' : '未设置'}`
    ].join('\n');
    
    wx.showModal({
      title: '调试信息',
      content: debugContent,
      confirmText: '查看详细',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          // 显示更详细的调试信息
          this.showDetailedDebugInfo();
        }
      }
    });
  },

  /**
   * 显示详细调试信息
   */
  showDetailedDebugInfo() {
    const { debugInfo } = this.data;
    
    console.log('🔍 === 详细调试信息 ===');
    console.log('本地存储数据:', debugInfo.localStorage);
    console.log('API响应数据:', debugInfo.apiResponse);
    console.log('当前页面数据:', this.data.userInfo);
    console.log('========================');
    
    wx.showModal({
      title: '详细信息已输出到控制台',
      content: '请打开开发者工具查看控制台输出',
      showCancel: false
    });
  },

  /**
   * 长按头像事件
   */
  onAvatarLongPress: function() {
    if (!this.data.isLoggedIn) {
      this.goToLogin();
      return;
    }
    
    wx.showActionSheet({
      itemList: ['查看头像', '更换头像', '诊断用户信息'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 预览头像
          const { userInfo } = this.data;
          if (userInfo.avatarUrl && userInfo.avatarUrl !== '/assets/images/logo.png') {
            wx.previewImage({
              urls: [userInfo.avatarUrl]
            });
          } else {
            wx.showToast({
              title: '暂无头像',
              icon: 'none'
            });
          }
        } else if (res.tapIndex === 1) {
          // 更换头像
          this.changeAvatar();
        } else if (res.tapIndex === 2) {
          // 诊断用户信息
          this.diagnoseUserInfo();
        }
      }
    });
  },

  /**
   * 更换头像
   */
  changeAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 这里应该上传头像到服务器
        console.log('选择的头像:', res.tempFilePaths[0]);
        
        wx.showToast({
          title: '头像更换功能开发中',
          icon: 'none'
        });
        
        // TODO: 实现头像上传逻辑
        // this.uploadAvatar(res.tempFilePaths[0]);
      }
    });
  },

  /**
   * 诊断用户信息
   */
  async diagnoseUserInfo() {
    wx.showLoading({ title: '诊断中...' });
    
    try {
      console.log('🩺 开始诊断用户信息...');
      
      // 重新获取用户信息进行诊断
      await this.updateUserInfo();
      
      const { userInfo, debugInfo } = this.data;
      
      // 分析用户信息完整性
      const diagnosis = {
        hasName: !!(userInfo.displayName && userInfo.displayName !== '团购用户'),
        hasAvatar: !!(userInfo.avatarUrl && userInfo.avatarUrl !== '/assets/images/logo.png'),
        hasPhone: !!userInfo.phone,
        hasApiData: !!debugInfo.apiResponse,
        hasLocalData: !!debugInfo.localStorage
      };
      
      const suggestions = [];
      if (!diagnosis.hasName) suggestions.push('缺少用户昵称');
      if (!diagnosis.hasAvatar) suggestions.push('缺少用户头像');
      if (!diagnosis.hasApiData) suggestions.push('API接口异常');
      if (!diagnosis.hasLocalData) suggestions.push('本地存储为空');
      
      const diagnosisResult = suggestions.length === 0 
        ? '✅ 用户信息完整' 
        : `⚠️ 发现问题: ${suggestions.join(', ')}`;
      
      wx.hideLoading();
      
      wx.showModal({
        title: '诊断结果',
        content: diagnosisResult,
        confirmText: suggestions.length > 0 ? '尝试修复' : '确定',
        success: (res) => {
          if (res.confirm && suggestions.length > 0) {
            this.attemptAutoFix();
          }
        }
      });
      
    } catch (error) {
      wx.hideLoading();
      
      wx.showModal({
        title: '诊断失败',
        content: error.message || '诊断过程中发生错误',
        showCancel: false
      });
    }
  },

  /**
   * 尝试自动修复用户信息
   */
  async attemptAutoFix() {
    wx.showLoading({ title: '修复中...' });
    
    try {
      console.log('🔧 尝试自动修复...');
      
      // 1. 清除缓存数据
      this.clearUserInfoCache();
      
      // 2. 重新获取用户信息
      await this.updateUserInfo();
      
      // 3. 重新加载统计数据
      await this.loadUserStats();
      
      wx.hideLoading();
      
      wx.showToast({
        title: '修复完成',
        icon: 'success'
      });
      
    } catch (error) {
      wx.hideLoading();
      
      wx.showToast({
        title: '修复失败',
        icon: 'none'
      });
    }
  },

  /**
   * 清除用户信息缓存
   */
  clearUserInfoCache() {
    try {
      wx.removeStorageSync('userInfo');
      console.log('🧹 已清除用户信息缓存');
    } catch (error) {
      console.error('❌ 清除缓存失败:', error);
    }
  },

  /**
   * 处理Token过期
   */
  handleTokenExpired() {
    console.log('🔑 处理Token过期...');
    
    // 清除登录状态
    this.setData({
      isLoggedIn: false,
      userInfo: {}
    });
    
    // 提示用户重新登录
    wx.showModal({
      title: '登录已过期',
      content: '请重新登录以获取最新信息',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/login/index'
          });
        }
      }
    });
  },

  /**
   * 跳转到订单页面
   */
  goToOrderPage: function(e) {
    const type = e.currentTarget.dataset.type;
    
    if (!checkLoginStatus()) {
      return;
    }
    
    let url = '/pages/order/list/index';
    if (type && type !== 'all') {
      url += `?type=${type}`;
    }
    
    wx.navigateTo({ 
      url,
      fail: (error) => {
        console.error('跳转订单页面失败:', error);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 查看全部订单
   */
  viewAllOrders: function() {
    if (!checkLoginStatus()) {
      return;
    }
    
    wx.navigateTo({
      url: '/pages/order/list/index'
    });
  },

  /**
   * 工具菜单点击事件
   */
  onToolMenuTap: function(e) {
    const menu = e.currentTarget.dataset.menu;
    
    if (!menu) {
      console.error('菜单数据为空');
      return;
    }
    
    console.log('🔧 点击工具菜单:', menu.name);
    
    // 检查是否需要登录
    if (menu.needLogin && !checkLoginStatus()) {
      return;
    }
    
    // 如果有自定义动作
    if (menu.action) {
      if (typeof this[menu.action] === 'function') {
        this[menu.action]();
      } else {
        console.error('自定义动作不存在:', menu.action);
        wx.showToast({
          title: '功能暂未开放',
          icon: 'none'
        });
      }
      return;
    }
    
    // 跳转页面
    if (menu.url) {
      wx.navigateTo({
        url: menu.url,
        fail: (error) => {
          console.error('页面跳转失败:', error);
          wx.showToast({
            title: '页面暂未开放',
            icon: 'none'
          });
        }
      });
    }
  },

  /**
   * 联系客服
   */
  contactUs: function() {
    wx.showActionSheet({
      itemList: ['拨打客服电话', '在线客服', '意见反馈'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拨打电话
          wx.showModal({
            title: '客服电话',
            content: '400-000-0000\n工作时间：9:00-18:00',
            confirmText: '拨打',
            success: (res) => {
              if (res.confirm) {
                wx.makePhoneCall({
                  phoneNumber: '4000000000',
                  fail: (error) => {
                    wx.showToast({
                      title: '拨打失败',
                      icon: 'none'
                    });
                  }
                });
              }
            }
          });
        } else if (res.tapIndex === 1) {
          // 在线客服 
          wx.showToast({
            title: '在线客服功能开发中',
            icon: 'none'
          });
        } else if (res.tapIndex === 2) {
          // 意见反馈
          wx.showToast({
            title: '意见反馈功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 退出登录
   */
  logout: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '您还未登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          this.performLogout();
        }
      }
    });
  },

  /**
   * 执行退出登录
   */
  performLogout() {
    try {
      console.log('👋 执行退出登录...');
      
      // 调用退出登录函数
      logout();
      
      // 重置页面状态
      this.setData({
        isLoggedIn: false,
        userInfo: {},
        orderStats: {
          unpaid: 0, unshipped: 0, shipped: 0, completed: 0, refund: 0
        },
        unreadCount: 0,
        userStats: {
          favoriteCount: 0, reviewCount: 0, couponCount: 0,
          points: 0, level: 1, levelName: '普通会员'
        },
        'debugInfo.localStorage': null,
        'debugInfo.apiResponse': null
      });
      
      // 重置工具菜单徽章
      const toolMenus = this.data.toolMenus.map(menu => ({
        ...menu,
        badge: 0
      }));
      this.setData({ toolMenus });
      
      wx.showToast({
        title: '已退出登录',
        icon: 'success'
      });
      
      console.log('✅ 退出登录完成');
      
    } catch (error) {
      console.error('❌ 退出登录失败:', error);
      wx.showToast({
        title: '退出失败',
        icon: 'none'
      });
    }
  }
});