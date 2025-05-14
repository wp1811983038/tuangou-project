// pages/merchant/list/index.js
import { getAvailableMerchants } from '../../../utils/location';

Page({
  data: {
    merchants: [],
    loading: true,
    latitude: null,
    longitude: null,
    title: '商户列表',
    serviceOnly: false, // 是否只显示服务范围内的商户
    pageNum: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad(options) {
    // 获取传递的参数
    const { latitude, longitude, title, serviceOnly } = options;
    
    if (title) {
      this.setData({ title });
      wx.setNavigationBarTitle({ title });
    }
    
    if (serviceOnly === 'true') {
      this.setData({ serviceOnly: true });
    }
    
    if (latitude && longitude) {
      this.setData({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      });
      
      this.loadMerchants(true);
    }
  },
  
  // 加载商户数据
  async loadMerchants(reset = false) {
    const { latitude, longitude, pageNum, pageSize, hasMore, serviceOnly } = this.data;
    
    if (!latitude || !longitude || !hasMore) return;
    
    this.setData({ loading: true });
    
    try {
      let merchants = [];
      
      if (serviceOnly) {
        // 获取服务范围内的商户
        merchants = await getAvailableMerchants(
          { latitude, longitude },
          pageNum,
          pageSize
        );
      } else {
        // 获取所有商户
        const params = {
          latitude,
          longitude,
          page: pageNum,
          page_size: pageSize
        };
        
        const response = await get('/merchants', params, {
          showLoading: false
        });
        
        merchants = response.data?.items || [];
      }
      
      this.setData({
        merchants: reset ? merchants : [...this.data.merchants, ...merchants],
        loading: false,
        pageNum: pageNum + 1,
        hasMore: merchants.length === pageSize
      });
    } catch (error) {
      console.error('加载商户失败', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },
  
  // 其他方法...
});