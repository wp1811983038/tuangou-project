// pages/category/index.js - 完善的分类页面
import { getLocation } from '../../utils/location';
import { 
  getCategories,
  getMerchantsByCategory,
  getProductsByCategory,
  getCategoryStats
} from '../../services/category';

Page({
  data: {
    // 分类数据
    categories: [],                    // 所有分类
    currentCategory: null,             // 当前选中分类
    
    // 位置信息
    location: null,                    // 用户位置
    
    // 显示模式：'merchants' | 'products'
    displayMode: 'merchants',
    
    // 商户数据
    merchants: [],                     // 商户列表
    merchantsLoading: false,           // 商户加载状态
    merchantsPage: 1,                  // 商户页码
    merchantsHasMore: true,            // 是否有更多商户
    
    // 商品数据
    products: [],                      // 商品列表
    productsLoading: false,            // 商品加载状态
    productsPage: 1,                   // 商品页码
    productsHasMore: true,             // 是否有更多商品
    
    // 搜索和筛选
    searchKeyword: '',                 // 搜索关键词
    sortBy: 'default',                 // 排序方式
    sortOptions: [                     // 排序选项
      { value: 'default', label: '默认排序' },
      { value: 'distance', label: '距离最近' },
      { value: 'rating', label: '评分最高' },
      { value: 'sales', label: '销量最高' },
      { value: 'price_asc', label: '价格从低到高' },
      { value: 'price_desc', label: '价格从高到低' }
    ],
    
    // UI状态
    loading: false,                    // 页面主加载状态
    showSortPanel: false,              // 显示排序面板
    refreshing: false,                 // 下拉刷新状态
    
    // 分页配置
    pageSize: 10
  },

  onLoad: function(options) {
    console.log('分类页面加载，参数:', options);
    
    // 获取传入的分类ID
    if (options.category_id) {
      this.setData({ 
        preSelectedCategoryId: parseInt(options.category_id) 
      });
    }
    
    // 初始化页面
    this.initPage();
  },

  onShow: function() {
    // 页面显示时检查位置权限
    this.checkLocationPermission();
  },

  // 初始化页面
  async initPage() {
    this.setData({ loading: true });
    
    try {
      // 并行加载位置和分类数据
      await Promise.all([
        this.getCurrentLocation(),
        this.loadCategories()
      ]);
      
    } catch (error) {
      console.error('页面初始化失败', error);
      wx.showToast({
        title: '页面加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取当前位置
  async getCurrentLocation() {
    try {
      const location = await getLocation();
      this.setData({ location });
      console.log('获取到用户位置:', location);
    } catch (error) {
      console.error('获取位置失败', error);
      // 位置获取失败不阻塞页面加载
    }
  },

  // 检查位置权限
  checkLocationPermission() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.showModal({
            title: '位置权限',
            content: '为了提供更好的服务，请允许获取您的位置信息',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  // 加载分类数据
  async loadCategories() {
    try {
      const categories = await getCategories({ is_active: true });
      
      // 添加"全部"分类
      const allCategories = [
        { 
          id: 0, 
          name: '全部', 
          icon: '',
          merchant_count: 0,
          product_count: 0
        },
        ...categories
      ];
      
      // 设置默认选中分类
      let currentCategory = allCategories[0];
      const { preSelectedCategoryId } = this.data;
      
      if (preSelectedCategoryId) {
        const targetCategory = allCategories.find(cat => cat.id === preSelectedCategoryId);
        if (targetCategory) {
          currentCategory = targetCategory;
        }
      }
      
      this.setData({
        categories: allCategories,
        currentCategory
      });
      
      // 加载当前分类的数据
      await this.loadCategoryData(currentCategory.id, true);
      
    } catch (error) {
      console.error('加载分类失败', error);
      wx.showToast({
        title: '加载分类失败',
        icon: 'none'
      });
    }
  },

  // 切换分类
  async switchCategory(e) {
    const { id } = e.currentTarget.dataset;
    const { categories, currentCategory } = this.data;
    
    // 如果点击的是当前分类，不做处理
    if (currentCategory && currentCategory.id === parseInt(id)) return;
    
    // 找到对应分类
    const category = categories.find(item => item.id === parseInt(id));
    if (!category) return;
    
    this.setData({
      currentCategory: category,
      merchants: [],
      products: [],
      merchantsPage: 1,
      productsPage: 1,
      merchantsHasMore: true,
      productsHasMore: true
    });
    
    // 加载新分类的数据
    await this.loadCategoryData(category.id, true);
  },

  // 加载分类数据（商户或商品）
  async loadCategoryData(categoryId, reset = false) {
    const { displayMode } = this.data;
    
    if (displayMode === 'merchants') {
      await this.loadMerchants(categoryId, reset);
    } else {
      await this.loadProducts(categoryId, reset);
    }
  },

  // 加载商户数据
  async loadMerchants(categoryId, reset = false) {
    const { 
      merchantsLoading, 
      merchantsHasMore, 
      merchantsPage, 
      pageSize,
      location,
      searchKeyword,
      sortBy
    } = this.data;
    
    if (merchantsLoading || (!merchantsHasMore && !reset)) return;
    
    this.setData({ merchantsLoading: true });
    
    try {
      const params = {
        page: reset ? 1 : merchantsPage,
        page_size: pageSize,
        status: 1 // 只获取营业中的商户
      };
      
      // 添加分类筛选
      if (categoryId > 0) {
        params.category_id = categoryId;
      }
      
      // 添加位置参数
      if (location && location.latitude && location.longitude) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
      }
      
      // 添加搜索关键词
      if (searchKeyword) {
        params.keyword = searchKeyword;
      }
      
      // 添加排序参数
      if (sortBy !== 'default') {
        if (sortBy === 'distance') {
          params.sort_by = 'distance';
          params.sort_order = 'asc';
        } else if (sortBy === 'rating') {
          params.sort_by = 'rating';
          params.sort_order = 'desc';
        }
      }
      
      const result = await getMerchantsByCategory(params);
      
      // 处理距离计算
      if (location) {
        result.items.forEach(merchant => {
          if (merchant.latitude && merchant.longitude) {
            const { calculateDistance, formatDistance } = require('../../utils/location');
            const distance = calculateDistance(
              location.latitude,
              location.longitude,
              merchant.latitude,
              merchant.longitude
            );
            merchant.distance = formatDistance(distance);
            merchant.distanceValue = distance; // 用于排序
          }
        });
        
        // 按距离排序
        if (sortBy === 'distance') {
          result.items.sort((a, b) => (a.distanceValue || 999999) - (b.distanceValue || 999999));
        }
      }
      
      this.setData({
        merchants: reset ? result.items : [...this.data.merchants, ...result.items],
        merchantsPage: (reset ? 1 : merchantsPage) + 1,
        merchantsHasMore: result.items.length === pageSize,
        merchantsLoading: false
      });
      
    } catch (error) {
      console.error('加载商户失败', error);
      this.setData({ merchantsLoading: false });
      
      if (reset) {
        wx.showToast({
          title: '加载商户失败',
          icon: 'none'
        });
      }
    }
  },

  // 加载商品数据
  async loadProducts(categoryId, reset = false) {
    const { 
      productsLoading, 
      productsHasMore, 
      productsPage, 
      pageSize,
      searchKeyword,
      sortBy
    } = this.data;
    
    if (productsLoading || (!productsHasMore && !reset)) return;
    
    this.setData({ productsLoading: true });
    
    try {
      const params = {
        page: reset ? 1 : productsPage,
        page_size: pageSize,
        status: 1 // 只获取上架商品
      };
      
      // 添加分类筛选
      if (categoryId > 0) {
        params.category_id = categoryId;
      }
      
      // 添加搜索关键词
      if (searchKeyword) {
        params.keyword = searchKeyword;
      }
      
      // 添加排序参数
      if (sortBy !== 'default') {
        if (sortBy === 'sales') {
          params.sort_by = 'sales';
          params.sort_order = 'desc';
        } else if (sortBy === 'price_asc') {
          params.sort_by = 'current_price';
          params.sort_order = 'asc';
        } else if (sortBy === 'price_desc') {
          params.sort_by = 'current_price';
          params.sort_order = 'desc';
        }
      }
      
      const result = await getProductsByCategory(params);
      
      this.setData({
        products: reset ? result.items : [...this.data.products, ...result.items],
        productsPage: (reset ? 1 : productsPage) + 1,
        productsHasMore: result.items.length === pageSize,
        productsLoading: false
      });
      
    } catch (error) {
      console.error('加载商品失败', error);
      this.setData({ productsLoading: false });
      
      if (reset) {
        wx.showToast({
          title: '加载商品失败',
          icon: 'none'
        });
      }
    }
  },

  // 切换显示模式
  switchDisplayMode(e) {
    const { mode } = e.currentTarget.dataset;
    const { displayMode, currentCategory } = this.data;
    
    if (displayMode === mode) return;
    
    this.setData({
      displayMode: mode,
      merchants: [],
      products: [],
      merchantsPage: 1,
      productsPage: 1,
      merchantsHasMore: true,
      productsHasMore: true
    });
    
    // 加载对应模式的数据
    if (currentCategory) {
      this.loadCategoryData(currentCategory.id, true);
    }
  },

  // 搜索功能
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    
    // 防抖搜索
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.performSearch();
    }, 500);
  },

  // 执行搜索
  async performSearch() {
    const { currentCategory } = this.data;
    if (currentCategory) {
      await this.loadCategoryData(currentCategory.id, true);
    }
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.performSearch();
  },

  // 显示排序面板
  showSortPanel() {
    this.setData({ showSortPanel: true });
  },

  // 隐藏排序面板
  hideSortPanel() {
    this.setData({ showSortPanel: false });
  },

  // 选择排序方式
  selectSort(e) {
    const { value } = e.currentTarget.dataset;
    const { sortBy, currentCategory } = this.data;
    
    if (sortBy === value) {
      this.hideSortPanel();
      return;
    }
    
    this.setData({
      sortBy: value,
      showSortPanel: false
    });
    
    // 重新加载数据
    if (currentCategory) {
      this.loadCategoryData(currentCategory.id, true);
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

  // 跳转到商品详情页
  goToProduct(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/product/detail/index?id=${id}`
    });
  },

  // 上拉加载更多
  loadMore() {
    const { displayMode, currentCategory } = this.data;
    
    if (!currentCategory) return;
    
    if (displayMode === 'merchants') {
      this.loadMerchants(currentCategory.id, false);
    } else {
      this.loadProducts(currentCategory.id, false);
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    this.setData({ refreshing: true });
    
    try {
      const { currentCategory } = this.data;
      if (currentCategory) {
        await this.loadCategoryData(currentCategory.id, true);
      }
    } catch (error) {
      console.error('刷新失败', error);
    } finally {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    }
  },

  // 页面触底事件
  onReachBottom() {
    this.loadMore();
  },

  // 获取当前分类名称
  get currentCategoryName() {
    const { currentCategory } = this.data;
    return currentCategory ? currentCategory.name : '全部';
  },

  // 获取当前排序名称
  get currentSortName() {
    const { sortBy, sortOptions } = this.data;
    const option = sortOptions.find(opt => opt.value === sortBy);
    return option ? option.label : '默认排序';
  }
});