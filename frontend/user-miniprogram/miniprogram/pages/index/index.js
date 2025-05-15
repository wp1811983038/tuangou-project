// pages/index/index.js
import { getLocation } from '../../utils/location';
import { get } from '../../utils/request';
import { apiPath } from '../../config/api';

Page({
  data: {
    location: null,                 // 用户位置
    inBoundaryMerchants: [],        // 在边界范围内的商户
    allMerchants: [],               // 所有商户
    hasNearbyMerchant: false,       // 是否有边界范围内的商户
    loading: true,                  // 加载状态
    showLocationTip: false,         // 位置提示
    currentMerchant: {},            // 当前选中的商户
    showMerchantPanel: false        // 是否显示商户面板
  },

  onLoad: function(options) {
    // 加载缓存的位置
    const cachedLocation = wx.getStorageSync('location');
    if (cachedLocation) {
      this.setData({ location: cachedLocation });
    }
    
    // 加载缓存的当前商户
    const currentMerchant = wx.getStorageSync('currentMerchant');
    if (currentMerchant) {
      this.setData({ currentMerchant });
    }
  },

  onShow: function() {
    // 获取当前位置
    this.getCurrentLocation();
  },

  // 获取当前位置并检查商户边界
  async getCurrentLocation() {
    try {
      this.setData({ loading: true });
      
      const location = await getLocation();
      
      // 打印用户当前坐标
      console.log('========= 用户当前坐标 =========');
      console.log(`纬度(latitude): ${location.latitude}`);
      console.log(`经度(longitude): ${location.longitude}`);
      console.log('================================');
      
      // 更新位置信息
      this.setData({ 
        location,
        showLocationTip: false
      });
      
      // 存储位置到本地缓存
      wx.setStorageSync('location', location);
      
      // 获取位置后加载商户
      await this.loadMerchants(location);
    } catch (error) {
      console.error('获取位置失败', error);
      this.setData({ 
        showLocationTip: true,
        loading: false
      });
    }
  },
  
  // 加载商户数据
  async loadMerchants(location) {
    try {
      if (!location || !location.latitude || !location.longitude) return;
      
      // 获取所有商户信息，包括边界信息
      const result = await get(apiPath.merchant.list, {
        limit: 100  // 获取足够数量的商户
      });
      
      const merchants = result.data?.items || [];
      
      console.log('========= 商户边界范围信息 =========');
      console.log(`获取到商户数量: ${merchants.length}`);
      
      // 处理商户数据，判断用户是否在边界内
      const allMerchants = merchants.map(merchant => {
        // 默认不在范围内
        let inRange = false;
        
        // 检查商户是否有完整的边界信息
        if (merchant.north_boundary && merchant.south_boundary && 
            merchant.east_boundary && merchant.west_boundary) {
          
          // 打印商户边界范围
          console.log(`\n商户ID: ${merchant.id}, 名称: ${merchant.name}`);
          console.log(`北边界(north): ${merchant.north_boundary}`);
          console.log(`南边界(south): ${merchant.south_boundary}`);
          console.log(`东边界(east): ${merchant.east_boundary}`);
          console.log(`西边界(west): ${merchant.west_boundary}`);
          
          // 判断用户位置是否在边界内
          inRange = this.isPointInBoundary(location, {
            north: merchant.north_boundary,
            south: merchant.south_boundary,
            east: merchant.east_boundary,
            west: merchant.west_boundary
          });
          
          console.log(`用户是否在该商户边界内: ${inRange ? '是' : '否'}`);
        }
        
        // 返回带有范围标记的商户
        return {
          ...merchant,
          inRange
        };
      });
      
      // 筛选边界内的商户
      const inBoundaryMerchants = allMerchants.filter(merchant => merchant.inRange);
      
      console.log(`\n用户在边界范围内的商户数量: ${inBoundaryMerchants.length}`);
      console.log('====================================');
      
      // 如果有缓存的当前商户，检查是否在边界内
      const { currentMerchant } = this.data;
      if (currentMerchant.id) {
        // 在全部商户中找到当前商户并更新信息
        const updatedMerchant = allMerchants.find(merchant => merchant.id === currentMerchant.id);
        if (updatedMerchant) {
          this.setData({ currentMerchant: updatedMerchant });
          wx.setStorageSync('currentMerchant', updatedMerchant);
        }
      }
      
      // 更新数据
      this.setData({
        allMerchants,
        inBoundaryMerchants,
        hasNearbyMerchant: inBoundaryMerchants.length > 0,
        loading: false
      });
      
    } catch (error) {
      console.error('加载商户数据失败', error);
      this.setData({ loading: false });
    }
  },
  
  // 判断点是否在边界范围内
  isPointInBoundary(point, boundary) {
    if (!point || !boundary) return false;
    
    const { latitude, longitude } = point;
    const { north, south, east, west } = boundary;
    
    return latitude <= north && 
           latitude >= south && 
           longitude <= east && 
           longitude >= west;
  },
  
  // 切换商户面板显示
  toggleMerchantPanel() {
    this.setData({
      showMerchantPanel: !this.data.showMerchantPanel
    });
  },
  
  // 关闭商户面板
  closeMerchantPanel() {
    this.setData({
      showMerchantPanel: false
    });
  },
  
  // 选择当前位置（取消商户选择）
  selectCurrentLocation() {
    this.setData({
      currentMerchant: {},
      showMerchantPanel: false
    });
    
    // 清除缓存的商户
    wx.removeStorageSync('currentMerchant');
    
    wx.showToast({
      title: '已切换到当前位置',
      icon: 'success'
    });
  },
  
  // 跳转到搜索页
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/index'
    });
  },
  
  // 选择商户
  selectMerchant(e) {
    const { id } = e.currentTarget.dataset;
    const { allMerchants, currentMerchant } = this.data;
    
    // 如果点击的是当前商户，关闭面板
    if (currentMerchant.id === id) {
      this.closeMerchantPanel();
      return;
    }
    
    // 查找选中的商户
    const selectedMerchant = allMerchants.find(item => item.id === id);
    if (selectedMerchant) {
      // 更新当前选中的商户
      this.setData({
        currentMerchant: selectedMerchant,
        showMerchantPanel: false
      });
      
      // 缓存选中的商户
      wx.setStorageSync('currentMerchant', selectedMerchant);
      
      // 提示用户已切换商户
      wx.showToast({
        title: '已切换到' + selectedMerchant.name,
        icon: 'success'
      });
      
      // 如果选中的商户不在服务范围内，提示用户
      if (!selectedMerchant.inRange) {
        setTimeout(() => {
          wx.showToast({
            title: '该商户不在您的服务范围内',
            icon: 'none',
            duration: 2000
          });
        }, 1500);
      }
    }
  },
  
  // 跳转到商户详情页
  goToMerchantDetail() {
    const { currentMerchant } = this.data;
    if (currentMerchant.id) {
      wx.navigateTo({
        url: `/pages/merchant/detail/index?id=${currentMerchant.id}`
      });
    }
  },
  
  // 关闭位置提示
  closeLocationTip() {
    this.setData({ showLocationTip: false });
  }
});