// pages/search/index.js - 增强的搜索页面
import { getLocation } from '../../utils/location';
import { 
  getCategories,
  getMerchantsByCategory,
  getProductsByCategory,
  searchCategories
} from '../../services/category';
import { get } from '../../utils/request';
import { apiPath } from '../../config/api';

Page({
  data: {
    // 搜索状态
    searchKeyword: '',           // 搜索关键词
    searchHistory: [],           // 搜索历史
    hotKeywords: [],             // 热门搜索词
    
    // 分类数据
    categories: [],              // 所有分类
    hotCategories: [],           // 热门分类
    
    // 搜索结果
    searchResults: {
      merchants: [],             // 商户结果
      products: [],              // 商品结果
      categories: []             // 分类结果
    },
    
    // 搜索配置
    searchType: 'all',           // 搜索类型：all/merchants/products/categories
    searchTabs: [
      { key: 'all', name: '综合', count: 0 },
      { key: 'merchants', name: '商户', count: 0 },
      { key: 'products', name: '商品', count: 0 },
      { key: 'categories', name: '分类', count: 0 }
    ],
    
    // 位置信息
    location: null,
    
    // UI状态
    showSuggestions: false,      // 显示搜索建议
    loading: false,              // 搜索加载状态
    hasSearched: false,          // 是否已搜索
    
    // 分页
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    
    // 排序筛选
    sortBy: 'relevance',         // 排序方式
    sortOptions: [
      { value: 'relevance', label: '相关度' },
      { value: 'distance', label: '距离最近' },
      { value: 'rating', label: '评分最高' },
      { value: 'sales', label: '销量最高' },
      { value: 'price_asc', label: '价格从低到高' },
      { value: 'price_desc', label: '价格从高到低' }
    ],
    showSortPanel: false
  },

  onLoad: function(options) {
    // 获取传入的搜索词
    if (options.keyword) {
      this.setData({ 
        searchKeyword: decodeURIComponent(options.keyword) 
      });
      this.performSearch();
    }
    
    // 初始化页面
    this.initPage();
  },

  onShow: function() {
    // 获取当前位置
    this.getCurrentLocation();
  },

  // 初始化页面
  async initPage() {
    try {
      await Promise.all([
        this.loadSearchHistory(),
        this.loadHotKeywords(), 
        this.loadHotCategories()
      ]);
    } catch (error) {
      console.error('页面初始化失败', error);
    }
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

  // 加载搜索历史
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync('searchHistory') || [];
      this.setData({ searchHistory: history.slice(0, 10) });
    } catch (error) {
      console.error('加载搜索历史失败', error);
    }
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    try {
      if (!keyword || keyword.trim() === '') return;
      
      let history = wx.getStorageSync('searchHistory') || [];
      
      // 移除重复项
      history = history.filter(item => item !== keyword);
      
      // 添加到开头
      history.unshift(keyword);
      
      // 限制数量
      history = history.slice(0, 20);
      
      wx.setStorageSync('searchHistory', history);
      this.setData({ searchHistory: history.slice(0, 10) });
    } catch (error) {
      console.error('保存搜索历史失败', error);
    }
  },

  // 加载热门搜索词
  async loadHotKeywords() {
    try {
      // 这里可以调用API获取热门搜索词
      // 暂时使用模拟数据
      const hotKeywords = [
        '美食', '生鲜', '甜品', '饮品', '水果', 
        '蔬菜', '肉类', '海鲜', '面包', '咖啡'
      ];
      
      this.setData({ hotKeywords });
    } catch (error) {
      console.error('加载热门搜索词失败', error);
    }
  },

  // 加载热门分类
  async loadHotCategories() {
    try {
      const categories = await getCategories({ is_active: true });
      const hotCategories = categories.slice(0, 8); // 取前8个作为热门分类
      
      this.setData({ 
        categories,
        hotCategories 
      });
    } catch (error) {
      console.error('加载热门分类失败', error);
    }
  },

  // 搜索输入处理
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ 
      searchKeyword: keyword,
      showSuggestions: keyword.length > 0
    });
    
    // 防抖搜索建议
    clearTimeout(this.suggestionTimeout);
    if (keyword.length > 0) {
      this.suggestionTimeout = setTimeout(() => {
        this.loadSearchSuggestions(keyword);
      }, 300);
    }
  },

  // 搜索确认
  onSearchConfirm() {
    const { searchKeyword } = this.data;
    if (searchKeyword.trim()) {
      this.performSearch();
    }
  },

  // 执行搜索
  async performSearch(reset = true) {
    const { searchKeyword, searchType, location } = this.data;
    
    if (!searchKeyword.trim()) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }
    
    // 保存搜索历史
    this.saveSearchHistory(searchKeyword);
    
    this.setData({ 
      loading: true,
      showSuggestions: false,
      hasSearched: true,
      pageNum: reset ? 1 : this.data.pageNum
    });
    
    try {
      const searchPromises = [];
      
      // 根据搜索类型决定搜索内容
      if (searchType === 'all' || searchType === 'merchants') {
        searchPromises.push(this.searchMerchants(searchKeyword, reset));
      }
      
      if (searchType === 'all' || searchType === 'products') {
        searchPromises.push(this.searchProducts(searchKeyword, reset));
      }
      
      if (searchType === 'all' || searchType === 'categories') {
        searchPromises.push(this.searchCategoriesFunc(searchKeyword, reset));
      }
      
      await Promise.all(searchPromises);
      
      // 更新标签页计数
      this.updateTabCounts();
      
    } catch (error) {
      console.error('搜索失败', error);
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 搜索商户
  async searchMerchants(keyword, reset = true) {
    const { location, sortBy, pageNum, pageSize } = this.data;
    
    try {
      const params = {
        keyword,
        page: reset ? 1 : pageNum,
        page_size: pageSize,
        status: 1
      };
      
      // 添加位置参数
      if (location) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
      }
      
      // 添加排序参数
      if (sortBy === 'distance' && location) {
        params.sort_by = 'distance';
        params.sort_order = 'asc';
      } else if (sortBy === 'rating') {
        params.sort_by = 'rating';
        params.sort_order = 'desc';
      }
      
      const result = await get(apiPath.merchant.search, params);
      const merchants = result.data?.items || [];
      
      // 计算距离
      if (location) {
        merchants.forEach(merchant => {
          if (merchant.latitude && merchant.longitude) {
            const { calculateDistance, formatDistance } = require('../../utils/location');
            const distance = calculateDistance(
              location.latitude, location.longitude,
              merchant.latitude, merchant.longitude
            );
            merchant.distance = formatDistance(distance);
            merchant.distanceValue = distance;
          }
        });
      }
      
      const currentResults = this.data.searchResults;
      this.setData({
        searchResults: {
          ...currentResults,
          merchants: reset ? merchants : [...currentResults.merchants, ...merchants]
        },
        hasMore: merchants.length === pageSize
      });
      
    } catch (error) {
      console.error('搜索商户失败', error);
    }
  },

  // 搜索商品
  async searchProducts(keyword, reset = true) {
    const { sortBy, pageNum, pageSize } = this.data;
    
    try {
      const params = {
        keyword,
        page: reset ? 1 : pageNum,
        page_size: pageSize,
        status: 1
      };
      
      // 添加排序参数
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
      
      const result = await get(apiPath.product.list, params);
      const products = result.data?.items || [];
      
      const currentResults = this.data.searchResults;
      this.setData({
        searchResults: {
          ...currentResults,
          products: reset ? products : [...currentResults.products, ...products]
        },
        hasMore: products.length === pageSize
      });
      
    } catch (error) {
      console.error('搜索商品失败', error);
    }
  },

  // 搜索分类
  async searchCategoriesFunc(keyword, reset = true) {
    try {
      const categories = await searchCategories(keyword);
      
      const currentResults = this.data.searchResults;
      this.setData({
        searchResults: {
          ...currentResults,
          categories: reset ? categories : [...currentResults.categories, ...categories]
        }
      });
      
    } catch (error) {
      console.error('搜索分类失败', error);
    }
  },

  // 更新标签页计数
  updateTabCounts() {
    const { searchResults, searchTabs } = this.data;
    const total = searchResults.merchants.length + searchResults.products.length + searchResults.categories.length;
    
    const updatedTabs = searchTabs.map(tab => {
      switch (tab.key) {
        case 'all':
          return { ...tab, count: total };
        case 'merchants':
          return { ...tab, count: searchResults.merchants.length };
        case 'products':
          return { ...tab, count: searchResults.products.length };
        case 'categories':
          return { ...tab, count: searchResults.categories.length };
        default:
          return tab;
      }
    });
    
    this.setData({ searchTabs: updatedTabs });
  },

  // 加载搜索建议
  async loadSearchSuggestions(keyword) {
    try {
      // 这里可以调用API获取搜索建议
      // 暂时使用简单的关键词匹配
      const { hotKeywords, categories } = this.data;
      
      const suggestions = [
        ...hotKeywords.filter(item => item.includes(keyword)),
        ...categories.filter(cat => cat.name.includes(keyword)).map(cat => cat.name)
      ].slice(0, 10);
      
      this.setData({ suggestions });
    } catch (error) {
      console.error('加载搜索建议失败', error);
    }
  },

  // 选择搜索建议
  selectSuggestion(e) {
    const { keyword } = e.currentTarget.dataset;
    this.setData({ 
      searchKeyword: keyword,
      showSuggestions: false 
    });
    this.performSearch();
  },

  // 切换搜索标签页
  switchSearchTab(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ searchType: type });
  },

  // 选择热门关键词
  selectHotKeyword(e) {
    const { keyword } = e.currentTarget.dataset;
    this.setData({ searchKeyword: keyword });
    this.performSearch();
  },

  // 选择热门分类
  selectHotCategory(e) {
    const { id, name } = e.currentTarget.dataset;
    // 跳转到分类页面
    wx.navigateTo({
      url: `/pages/category/index?category_id=${id}`
    });
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      searchKeyword: '',
      showSuggestions: false,
      hasSearched: false,
      searchResults: {
        merchants: [],
        products: [],
        categories: []
      }
    });
  },

  // 清除搜索历史
  clearSearchHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清除所有搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('searchHistory');
          this.setData({ searchHistory: [] });
        }
      }
    });
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
    this.setData({
      sortBy: value,
      showSortPanel: false
    });
    
    // 重新搜索
    if (this.data.hasSearched) {
      this.performSearch(true);
    }
  },

  // 跳转到商户详情
  goToMerchant(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/merchant/detail/index?id=${id}`
    });
  },

  // 跳转到商品详情
  goToProduct(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/product/detail/index?id=${id}`
    });
  },

  // 跳转到分类页面
  goToCategory(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/category/index?category_id=${id}`
    });
  },

  // 上拉加载更多
  onReachBottom() {
    const { hasMore, loading, hasSearched } = this.data;
    
    if (hasMore && !loading && hasSearched) {
      this.setData({ pageNum: this.data.pageNum + 1 });
      this.performSearch(false);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    if (this.data.hasSearched) {
      this.performSearch(true);
    }
    wx.stopPullDownRefresh();
  }
});