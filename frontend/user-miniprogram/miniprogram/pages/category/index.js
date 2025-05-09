// pages/category/index.js
import { getLocation } from '../../utils/location';

Page({
  data: {
    categories: [],            // 分类列表
    merchants: [],             // 商户列表
    currentCategory: null,     // 当前选中的分类
    location: null,            // 当前位置
    loading: false,            // 加载状态
    pageNum: 1,                // 当前页码
    pageSize: 10,              // 每页数量
    hasMore: true              // 是否有更多数据
  },

  onLoad: function(options) {
    // 加载分类数据
    this.loadCategories();
  },

  onShow: function() {
    // 获取当前位置
    this.getCurrentLocation();
  },

  // 获取当前位置
  async getCurrentLocation() {
    try {
      const location = await getLocation();
      this.setData({ location });
    } catch (error) {
      console.error('获取位置失败', error);
    }
  },

  // 加载分类数据
  loadCategories() {
    this.setData({ loading: true });
    
    // 模拟加载分类数据
    setTimeout(() => {
      const categories = [
        { id: 1, name: '全部' },
        { id: 2, name: '美食' },
        { id: 3, name: '生鲜' },
        { id: 4, name: '甜点' },
        { id: 5, name: '饮品' },
        { id: 6, name: '服装' },
        { id: 7, name: '日用品' },
        { id: 8, name: '电子产品' }
      ];
      
      this.setData({
        categories,
        currentCategory: categories[0],
        loading: false
      });
      
      // 加载商户数据
      this.loadMerchants(true);
    }, 500);
  },

  // 加载商户数据
  loadMerchants(reset = false) {
    if (this.data.loading || (!this.data.hasMore && !reset)) return;
    
    this.setData({ 
      loading: true,
      pageNum: reset ? 1 : this.data.pageNum
    });
    
    // 模拟请求参数
    const params = {
      categoryId: this.data.currentCategory.id,
      pageNum: this.data.pageNum,
      pageSize: this.data.pageSize
    };
    
    // 如果有位置信息，添加位置参数
    if (this.data.location) {
      params.latitude = this.data.location.latitude;
      params.longitude = this.data.location.longitude;
    }
    
    // 模拟加载商户数据
    setTimeout(() => {
      // 模拟数据
      const mockData = [
        {
          id: 1,
          name: '优果水果店',
          logo: '/assets/images/logo.png',
          rating: 4.8,
          distance: 1.2,
          brief: '新鲜水果，当季蔬菜'
        },
        {
          id: 2,
          name: '好味面包坊',
          logo: '/assets/images/logo.png',
          rating: 4.5,
          distance: 2.5,
          brief: '手工面包，新鲜出炉'
        },
        {
          id: 3,
          name: '鲜吧生鲜超市',
          logo: '/assets/images/logo.png',
          rating: 4.6,
          distance: 1.8,
          brief: '生鲜蔬果，送货上门'
        },
        {
          id: 4,
          name: '甜蜜烘焙坊',
          logo: '/assets/images/logo.png',
          rating: 4.7,
          distance: 3.2,
          brief: '甜品蛋糕，精致可口'
        }
      ];
      
      // 模拟分页
      const total = 10;
      const pageNum = this.data.pageNum;
      const hasMore = pageNum * this.data.pageSize < total;
      
      // 随机筛选2-4个商户，模拟不同分类下的商户
      const count = Math.floor(Math.random() * 3) + 2;
      const result = mockData.slice(0, count);
      
      this.setData({
        merchants: reset ? result : [...this.data.merchants, ...result],
        loading: false,
        hasMore,
        pageNum: pageNum + 1
      });
    }, 800);
  },

  // 切换分类
  switchCategory(e) {
    const { id } = e.currentTarget.dataset;
    const { categories, currentCategory } = this.data;
    
    // 如果点击的是当前分类，不做处理
    if (currentCategory && currentCategory.id === id) return;
    
    // 找到对应分类
    const category = categories.find(item => item.id === id);
    
    this.setData({
      currentCategory: category,
      merchants: [],
      pageNum: 1,
      hasMore: true
    });
    
    // 加载新分类的商户数据
    this.loadMerchants(true);
  },

  // 加载更多
  loadMore() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadMerchants();
    }
  },

  // 跳转到搜索页
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/index'
    });
  },

  // 跳转到商户详情页
  goToMerchant(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/merchant/detail/index?id=${id}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMerchants(true);
    wx.stopPullDownRefresh();
  }
})