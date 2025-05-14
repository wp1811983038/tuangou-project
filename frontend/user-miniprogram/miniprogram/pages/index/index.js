// pages/index/index.js
import { getLocation } from '../../utils/location';
import { get } from '../../utils/request';
import { apiPath } from '../../config/api';

Page({
  data: {
    location: null,                 // 用户位置
    inBoundaryMerchants: [],        // 在边界范围内的商户
    hasNearbyMerchant: false,       // 是否有边界范围内的商户
    loading: true,                  // 加载状态
    showLocationTip: false          // 位置提示
  },

  onLoad: function(options) {
    // 加载缓存的位置
    const cachedLocation = wx.getStorageSync('location');
    if (cachedLocation) {
      this.setData({ location: cachedLocation });
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
      
      // 获取位置后检查商户边界
      await this.checkMerchantsBoundary(location);
    } catch (error) {
      console.error('获取位置失败', error);
      this.setData({ 
        showLocationTip: true,
        loading: false
      });
    }
  },
  
  // 检查用户是否在商户边界范围内
  async checkMerchantsBoundary(location) {
    try {
      if (!location || !location.latitude || !location.longitude) return;
      
      // 获取所有商户信息，包括边界信息
      const result = await get(apiPath.merchant.list, {
        limit: 100  // 获取足够数量的商户
      });
      
      const merchants = result.data?.items || [];
      
      console.log('========= 商户边界范围信息 =========');
      console.log(`获取到商户数量: ${merchants.length}`);
      
      // 筛选出用户在边界范围内的商户
      const inBoundaryMerchants = merchants.filter(merchant => {
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
          const isInBoundary = this.isPointInBoundary(location, {
            north: merchant.north_boundary,
            south: merchant.south_boundary,
            east: merchant.east_boundary,
            west: merchant.west_boundary
          });
          
          console.log(`用户是否在该商户边界内: ${isInBoundary ? '是' : '否'}`);
          
          return isInBoundary;
        }
        return false;
      });
      
      console.log(`\n用户在边界范围内的商户数量: ${inBoundaryMerchants.length}`);
      console.log('====================================');
      
      // 更新数据
      this.setData({
        inBoundaryMerchants: inBoundaryMerchants,
        hasNearbyMerchant: inBoundaryMerchants.length > 0,
        loading: false
      });
      
    } catch (error) {
      console.error('检查商户边界失败', error);
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
  
  // 关闭位置提示
  closeLocationTip() {
    this.setData({ showLocationTip: false });
  },
  
  // 点击商户
  onMerchantTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ 
      url: `/pages/merchant/detail/index?id=${id}` 
    });
  }
});