// pages/category/index.js - 完整修复版本
import { getLocation } from '../../utils/location';
import { 
  getCategories,
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
    lastMerchantId: null,              // 记录上次的商户ID，用于检测变化
    
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

  // 防抖计时器
  searchTimeout: null,

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
    
    // 记录初始商户ID
    const currentMerchant = wx.getStorageSync('currentMerchant');
    this.setData({ lastMerchantId: currentMerchant?.id || null });
    
    // 初始化页面
    this.initPage();
  },

  onShow: function() {
    console.log('👁️ 分类页面显示');
    
    // 检测商户是否发生变化
    const currentMerchant = wx.getStorageSync('currentMerchant');
    const currentMerchantId = currentMerchant?.id || null;
    const { lastMerchantId } = this.data;
    
    console.log('🔍 检测商户变化:', {
      last: lastMerchantId,
      current: currentMerchantId,
      changed: lastMerchantId !== currentMerchantId
    });
    
    // 如果商户发生了变化，需要重新加载分类和数据
    if (lastMerchantId !== currentMerchantId) {
      console.log('🔄 检测到商户变化，重新加载页面数据');
      
      // 更新商户状态
      this.checkCurrentMerchant();
      
      // 记录当前商户ID
      this.setData({ lastMerchantId: currentMerchantId });
      
      // 重新初始化页面（清空之前的数据）
      this.setData({
        categories: [],
        currentCategory: null,
        products: [],
        merchants: [],
        productsPage: 1,
        merchantsPage: 1,
        productsHasMore: true,
        merchantsHasMore: true,
        searchKeyword: '',
        sortBy: 'default'
      });
      
      // 重新加载分类数据
      setTimeout(() => {
        this.loadCategories();
      }, 100);
    } else {
      // 商户没有变化，只是普通的页面显示
      console.log('✅ 商户未变化，检查位置权限');
      this.checkLocationPermission();
    }
  },

  onUnload: function() {
    // 清理防抖计时器
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  },

  // 检测当前选中商户
  checkCurrentMerchant() {
    try {
      const currentMerchant = wx.getStorageSync('currentMerchant');
      const isMerchantMode = !!(currentMerchant && currentMerchant.id);
      
      console.log('🏪 检测商户状态:', {
        merchant: currentMerchant?.name || '未选择',
        merchantId: currentMerchant?.id || null,
        isMerchantMode,
        previousMode: this.data.isMerchantMode
      });
      
      // 检测模式是否发生变化
      const modeChanged = this.data.isMerchantMode !== isMerchantMode;
      
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
      
      // 如果模式发生了变化，给出日志提示
      if (modeChanged) {
        console.log(`🔄 模式变化: ${!isMerchantMode ? '商户' : '全局'} -> ${isMerchantMode ? '商户' : '全局'}`);
      }
      
    } catch (error) {
      console.error('❌ 检测商户状态失败', error);
      this.setData({
        currentMerchant: null,
        isMerchantMode: false,
        lastMerchantId: null
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
      console.error('❌ 页面初始化失败', error);
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
      const { currentMerchant, isMerchantMode } = this.data;
      
      console.log('🏷️ 开始加载分类数据');
      console.log('🏪 当前状态:', {
        merchantMode: isMerchantMode,
        merchantName: currentMerchant?.name || '无',
        merchantId: currentMerchant?.id || '无'
      });
      
      // 使用上下文感知的分类加载
      const categories = await getCategoriesForCurrentContext(currentMerchant);
      
      console.log('📋 获取到的分类数据:', {
        count: categories.length,
        names: categories.map(c => c.name).join(', ')
      });
      
      if (categories.length === 0) {
        console.warn('⚠️ 未获取到任何分类数据');
        
        if (isMerchantMode && currentMerchant) {
          wx.showToast({
            title: `${currentMerchant.name}暂无商品分类`,
            icon: 'none',
            duration: 3000
          });
        } else {
          wx.showToast({
            title: '分类数据加载失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
      
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
          console.log(`🎯 预选分类: ${targetCategory.name}`);
        }
      }
      
      this.setData({
        categories: allCategories,
        currentCategory
      });
      
      console.log(`✅ 分类加载完成: ${categories.length} 个分类，当前选中: ${currentCategory.name}`);
      
      // 加载当前分类的数据
      await this.loadCategoryData(currentCategory.id, true);
      
    } catch (error) {
      console.error('❌ 加载分类失败', error);
      
      // 显示具体错误信息
      let errorMessage = '加载分类失败';
      if (error.statusCode === 404) {
        errorMessage = '分类接口不存在';
      } else if (error.statusCode === 500) {
        errorMessage = '服务器错误';
      } else if (!error.statusCode) {
        errorMessage = '网络连接失败';
      }
      
      wx.showToast({
        title: errorMessage + '，请重试',
        icon: 'none',
        duration: 3000
      });
      
      // 设置默认的"全部"分类，避免页面崩溃
      this.setData({
        categories: [{ 
          id: 0, 
          name: '全部', 
          icon: '',
          merchant_count: 0,
          product_count: 0
        }],
        currentCategory: { 
          id: 0, 
          name: '全部', 
          icon: '',
          merchant_count: 0,
          product_count: 0
        }
      });
    }
  },

  // 切换分类
  async switchCategory(e) {
    const { id } = e.currentTarget.dataset;
    const { categories, currentCategory } = this.data;
    
    const categoryId = parseInt(id);
    
    // 如果点击的是当前分类，不做处理
    if (currentCategory && currentCategory.id === categoryId) {
      console.log('🏷️ 点击的是当前分类，忽略');
      return;
    }
    
    // 找到对应分类
    const category = categories.find(item => item.id === categoryId);
    if (!category) {
      console.error('❌ 找不到对应分类:', categoryId);
      return;
    }
    
    console.log(`🏷️ 切换到分类: ${category.name} (ID: ${categoryId})`);
    
    // 显示加载提示
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    this.setData({
      currentCategory: category,
      merchants: [],
      products: [],
      merchantsPage: 1,
      productsPage: 1,
      merchantsHasMore: true,
      productsHasMore: true
    });
    
    try {
      // 加载新分类的数据
      await this.loadCategoryData(categoryId, true);
    } catch (error) {
      console.error('切换分类失败', error);
      wx.showToast({
        title: '切换分类失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
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
    
    if (merchantsLoading || (!merchantsHasMore && !reset)) {
      console.log('⏭️ 跳过商户加载');
      return;
    }
    
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
        console.log(`🏷️ 商户分类筛选: ${categoryId}`);
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
      
      console.log('📤 商户请求参数:', params);
      
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
      
      console.log(`✅ 商户加载完成: ${result.items.length} 个商户`);
      
    } catch (error) {
      console.error('❌ 加载商户失败', error);
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
    
    if (productsLoading || (!productsHasMore && !reset)) {
      console.log('⏭️ 跳过商品加载：', { productsLoading, productsHasMore, reset });
      return;
    }
    
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
        console.log(`🏷️ 商品分类筛选: ${categoryId}`);
      }
      
      // 添加搜索关键词
      if (searchKeyword) {
        params.keyword = searchKeyword;
        console.log(`🔍 添加搜索关键词: ${searchKeyword}`);
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
        console.log(`📊 添加排序: ${sortBy}`);
      }
      
      console.log('📤 商品请求参数:', params);
      
      // 使用上下文感知的商品加载
      const result = await getProductsForCurrentContext(params, currentMerchant);
      
      console.log(`📥 获取商品结果: ${result.items.length} 个商品 (总计: ${result.total})`);
      
      // 如果是商户模式且选择了特定分类，但没有商品，给出友好提示
      if (currentMerchant && categoryId > 0 && result.items.length === 0 && reset) {
        const categoryName = this.data.currentCategory?.name || '该分类';
        console.log(`⚠️ 商户 "${currentMerchant.name}" 在 "${categoryName}" 下没有商品`);
        
        wx.showToast({
          title: `${currentMerchant.name}暂无${categoryName}商品`,
          icon: 'none',
          duration: 2000
        });
      }
      
      this.setData({
        products: reset ? result.items : [...this.data.products, ...result.items],
        productsPage: (reset ? 1 : productsPage) + 1,
        productsHasMore: result.items.length === pageSize,
        productsLoading: false
      });
      
      console.log(`✅ 商品加载完成: 当前页 ${result.items.length} 个，总计 ${reset ? result.items.length : this.data.products.length} 个`);
      
    } catch (error) {
      console.error('❌ 加载商品失败', error);
      this.setData({ productsLoading: false });
      
      if (reset) {
        let errorMessage = '加载商品失败';
        if (error.statusCode === 404) {
          errorMessage = '商品接口不存在';
        } else if (error.statusCode === 500) {
          errorMessage = '服务器错误';
        } else if (!error.statusCode) {
          errorMessage = '网络连接失败';
        }
        
        wx.showToast({
          title: errorMessage,
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
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.performSearch();
    }, 500);
  },

  // 执行搜索
  async performSearch() {
    const { currentCategory } = this.data;
    console.log('🔍 执行搜索，关键词:', this.data.searchKeyword);
    if (currentCategory) {
      await this.loadCategoryData(currentCategory.id, true);
    }
  },

  // 清除搜索
  clearSearch() {
    console.log('🗑️ 清除搜索');
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
    console.log('🔗 跳转到商户详情:', id);
    wx.navigateTo({
      url: `/pages/merchant/detail/index?id=${id}`
    });
  },

  // 跳转到商品详情页
  goToProduct(e) {
    const { id } = e.currentTarget.dataset;
    console.log('🔗 跳转到商品详情:', id);
    wx.navigateTo({
      url: `/pages/product/detail/index?id=${id}`
    });
  },

  // 上拉加载更多
  loadMore() {
    const { displayMode, currentCategory, isMerchantMode } = this.data;
    
    if (!currentCategory) return;
    
    console.log('📜 上拉加载更多');
    
    if (isMerchantMode || displayMode === 'products') {
      this.loadProducts(currentCategory.id, false);
    } else if (displayMode === 'merchants') {
      this.loadMerchants(currentCategory.id, false);
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    console.log('🔄 下拉刷新');
    this.setData({ refreshing: true });
    
    try {
      // 重新检测商户状态
      this.checkCurrentMerchant();
      
      // 更新商户ID记录
      const currentMerchant = wx.getStorageSync('currentMerchant');
      this.setData({ lastMerchantId: currentMerchant?.id || null });
      
      const { currentCategory } = this.data;
      if (currentCategory) {
        await this.loadCategoryData(currentCategory.id, true);
      } else {
        // 如果没有当前分类，重新加载分类
        await this.loadCategories();
      }
    } catch (error) {
      console.error('刷新失败', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    } finally {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    }
  },

  // 页面触底事件
  onReachBottom() {
    this.loadMore();
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
            lastMerchantId: null,
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

  // 调试当前状态
  debugCurrentState() {
    const { currentMerchant, isMerchantMode, categories, currentCategory, lastMerchantId } = this.data;
    
    console.log('🔧 当前页面状态调试信息:');
    console.log('- 商户模式:', isMerchantMode);
    console.log('- 当前商户:', currentMerchant?.name || '无');
    console.log('- 商户ID:', currentMerchant?.id || '无');
    console.log('- 上次商户ID:', lastMerchantId);
    console.log('- 分类数量:', categories.length);
    console.log('- 分类列表:', categories.map(c => `${c.id}:${c.name}`).join(', '));
    console.log('- 当前分类:', currentCategory?.name || '无');
    console.log('- 缓存商户:', wx.getStorageSync('currentMerchant')?.name || '无');
    
    return {
      currentMerchant,
      isMerchantMode,
      categories,
      currentCategory,
      lastMerchantId,
      cachedMerchant: wx.getStorageSync('currentMerchant')
    };
  },

  // 手动刷新方法
  manualRefresh() {
    console.log('🔄 手动刷新分类数据');
    this.checkCurrentMerchant();
    this.loadCategories();
  },

  // 获取当前排序名称
  get currentSortName() {
    const { sortBy, sortOptions } = this.data;
    const option = sortOptions.find(opt => opt.value === sortBy);
    return option ? option.label : '默认排序';
  },

  // 获取当前分类名称
  get currentCategoryName() {
    const { currentCategory } = this.data;
    return currentCategory ? currentCategory.name : '全部';
  }
});