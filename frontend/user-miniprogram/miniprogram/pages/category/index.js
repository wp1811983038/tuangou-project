// pages/category/index.js - 完善的分类页面（支持商户分类）
import { getLocation } from '../../utils/location';
import { 
  getCategoriesForCurrentContext,
  getProductsForCurrentContext,
  getMerchantsByCategory,
  getProductsByCategory
} from '../../services/category';

Page({
  data: {
    // 分类数据
    categories: [],                    // 所有分类
    currentCategory: null,             // 当前选中分类
    
    // 当前商户信息
    currentMerchant: null,             // 当前选中商户
    isMerchantMode: false,             // 是否为商户模式
    
    // 位置信息
    location: null,                    // 用户位置
    
    // 显示模式：'merchants' | 'products'
    displayMode: 'products',           // 默认显示商品（商户模式下只显示商品）
    
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
      { value: 'sales', label: '销量最高' },
      { value: 'price_asc', label: '价格从低到高' },
      { value: 'price_desc', label: '价格从高到低' },
      { value: 'rating', label: '评分最高' },
      { value: 'created_at', label: '最新上架' }
    ],
    
    // UI状态
    loading: false,                    // 页面主加载状态
    showSortPanel: false,              // 显示排序面板
    refreshing: false,                 // 下拉刷新状态
    
    // 分页配置
    pageSize: 10
  },

  onLoad: function(options) {
    console.log('🏷️ 分类页面加载，参数:', options);
    
    // 获取传入的分类ID
    if (options.category_id) {
      this.setData({ 
        preSelectedCategoryId: parseInt(options.category_id) 
      });
    }
    
    // 检测当前商户状态
    this.checkCurrentMerchant();
    
    // 初始化页面
    this.initPage();
  },

  onShow: function() {
    // 页面显示时重新检查商户状态（可能从其他页面返回）
    this.checkCurrentMerchant();
    
    // 检查位置权限
    this.checkLocationPermission();
  },

  // 检测当前选中商户
  checkCurrentMerchant() {
    try {
      const currentMerchant = wx.getStorageSync('currentMerchant');
      const isMerchantMode = !!(currentMerchant && currentMerchant.id);
      
      console.log('🏪 当前商户状态:', {
        merchant: currentMerchant?.name || '未选择',
        merchantId: currentMerchant?.id || null,
        isMerchantMode
      });
      
      this.setData({
        currentMerchant: currentMerchant || null,
        isMerchantMode
      });
      
      // 商户模式下只显示商品
      if (isMerchantMode) {
        this.setData({ displayMode: 'products' });
      }
      
      // 更新页面标题
      this.updatePageTitle();
      
    } catch (error) {
      console.error('检测商户状态失败', error);
      this.setData({
        currentMerchant: null,
        isMerchantMode: false
      });
    }
  },

  // 更新页面标题
  updatePageTitle() {
    const { currentMerchant, isMerchantMode } = this.data;
    
    let title = '商品分类';
    if (isMerchantMode && currentMerchant) {
      title = `${currentMerchant.name} - 分类`;
    }
    
    wx.setNavigationBarTitle({ title });
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
      console.log('📍 获取到用户位置:', location);
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
      const { currentMerchant } = this.data;
      
      console.log('🏷️ 开始加载分类数据，商户模式:', !!currentMerchant?.id);
      
      // 使用上下文感知的分类加载
      const categories = await getCategoriesForCurrentContext(currentMerchant);
      
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
      
      console.log(`✅ 加载了 ${categories.length} 个分类`);
      
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
    
    console.log(`🏷️ 切换到分类: ${category.name}`);
    
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
    const { displayMode, isMerchantMode } = this.data;
    
    console.log(`📦 加载分类数据: categoryId=${categoryId}, mode=${displayMode}, merchantMode=${isMerchantMode}`);
    
    // 商户模式下只加载商品
    if (isMerchantMode) {
      await this.loadProducts(categoryId, reset);
    } else {
      // 非商户模式下根据显示模式加载
      if (displayMode === 'merchants') {
        await this.loadMerchants(categoryId, reset);
      } else {
        await this.loadProducts(categoryId, reset);
      }
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
        if (sortBy === 'rating') {
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
      sortBy,
      currentMerchant
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
        } else if (sortBy === 'rating') {
          params.sort_by = 'rating';
          params.sort_order = 'desc';
        } else if (sortBy === 'created_at') {
          params.sort_by = 'created_at';
          params.sort_order = 'desc';
        }
      }
      
      console.log('🛍️ 加载商品参数:', params);
      
      // 使用上下文感知的商品加载
      const result = await getProductsForCurrentContext(params, currentMerchant);
      
      this.setData({
        products: reset ? result.items : [...this.data.products, ...result.items],
        productsPage: (reset ? 1 : productsPage) + 1,
        productsHasMore: result.items.length === pageSize,
        productsLoading: false
      });
      
      console.log(`✅ 加载商品完成: ${result.items.length} 个商品`);
      
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
    const { displayMode, currentCategory, isMerchantMode } = this.data;
    
    // 商户模式下不允许切换到商户视图
    if (isMerchantMode && mode === 'merchants') {
      wx.showToast({
        title: '当前为商户模式，只能查看商品',
        icon: 'none'
      });
      return;
    }
    
    if (displayMode === mode) return;
    
    console.log(`🔄 切换显示模式: ${displayMode} -> ${mode}`);
    
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
    
    console.log(`📊 切换排序: ${sortBy} -> ${value}`);
    
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
      // 重新检测商户状态
      this.checkCurrentMerchant();
      
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

  // 返回全局分类模式
  backToGlobal() {
    console.log('🌍 返回全局分类模式');
    
    wx.showModal({
      title: '提示',
      content: '是否退出商户模式，查看全部商户分类？',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 清除当前商户
          wx.removeStorageSync('currentMerchant');
          
          // 重置页面状态
          this.setData({
            currentMerchant: null,
            isMerchantMode: false,
            displayMode: 'products', // 重置为商品模式
            categories: [],
            currentCategory: null,
            products: [],
            merchants: [],
            searchKeyword: '',
            sortBy: 'default'
          });
          
          // 更新页面标题
          wx.setNavigationBarTitle({ title: '商品分类' });
          
          // 重新初始化页面
          this.initPage();
          
          wx.showToast({
            title: '已切换到全局分类',
            icon: 'success'
          });
        }
      }
    });
  },

  // 获取当前排序名称
  get currentSortName() {
    const { sortBy, sortOptions } = this.data;
    const option = sortOptions.find(opt => opt.value === sortBy);
    return option ? option.label : '默认排序';
  }
});