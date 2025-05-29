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
    allMerchants: [],                  // 所有商户列表（用于切换面板）
    
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
    loadingMore: false,                // 加载更多状态
    showSortPanel: false,              // 显示排序面板
    showMerchantSwitchPanel: false,    // 显示商户切换面板
    refreshing: false,                 // 下拉刷新状态
    pageLoading: false,                // 页面初始加载状态
    
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
    this.setData({ loading: true, pageLoading: true });
    
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
      this.setData({ loading: false, pageLoading: false });
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
    
    this.setData({ productsLoading: true, loadingMore: !reset });
    
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
        productsLoading: false,
        loadingMore: false
      });
      
      console.log(`✅ 商品加载完成: 当前页 ${result.items.length} 个，总计 ${reset ? result.items.length : this.data.products.length} 个`);
      
    } catch (error) {
      console.error('❌ 加载商品失败', error);
      this.setData({ productsLoading: false, loadingMore: false });
      
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

  // 商品卡片事件处理
  onProductTap(e) {
    const { product, productId } = e.detail;
    console.log('🛍️ 点击商品:', product?.name || productId);
    
    wx.navigateTo({
      url: `/pages/product/detail/index?id=${productId}`
    });
  },

  // 商品收藏事件处理
  async onProductFavorite(e) {
    const { product, productId, isFavorite } = e.detail;
    
    // 检查登录状态
    const { checkLoginStatus } = require('../../utils/auth');
    if (!checkLoginStatus()) return;
    
    try {
      // 调用收藏接口
      const { post } = require('../../utils/request');
      const { formatUrl } = require('../../config/api');
      
      await post(formatUrl('/users/favorites/{product_id}', { product_id: productId }));
      
      // 更新商品列表中的收藏状态
      const { products } = this.data;
      const updatedProducts = products.map(item => {
        if (item.id === productId) {
          return { ...item, is_favorite: !isFavorite };
        }
        return item;
      });
      
      this.setData({ products: updatedProducts });
      
      wx.showToast({
        title: !isFavorite ? '收藏成功' : '取消收藏',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('❌ 收藏操作失败', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  // 商品购买事件处理
  onProductBuy(e) {
    const { product, productId } = e.detail;
    
    // 检查登录状态
    const { checkLoginStatus } = require('../../utils/auth');
    if (!checkLoginStatus()) return;
    
    console.log('🛒 购买商品:', product?.name || productId);
    
    // 检查库存
    if (product && product.stock <= 0) {
      wx.showToast({
        title: '该商品暂时缺货',
        icon: 'none'
      });
      return;
    }
    
    // 如果商品有规格选择，跳转到商品详情页选择规格
    if (product && product.specifications && product.specifications.length > 0) {
      wx.navigateTo({
        url: `/pages/product/detail/index?id=${productId}`
      });
      return;
    }
    
    // 直接购买（构建订单数据）
    const orderData = {
      items: [{
        product_id: productId,
        quantity: 1,
        specifications: {}
      }]
    };
    
    wx.navigateTo({
      url: `/pages/order/create/index?data=${encodeURIComponent(JSON.stringify(orderData))}`
    });
  },

  // 选择商户事件处理
  selectMerchant(e) {
    const merchant = e.currentTarget.dataset.merchant;
    console.log('🏪 选择商户:', merchant.name);
    
    // 保存选中商户到缓存
    wx.setStorageSync('currentMerchant', merchant);
    
    // 跳转到商户详情页或切换到商户模式
    wx.showActionSheet({
      itemList: ['查看商户详情', '进入商户专属模式'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 查看商户详情
          wx.navigateTo({
            url: `/pages/merchant/detail/index?id=${merchant.id}`
          });
        } else if (res.tapIndex === 1) {
          // 进入商户专属模式
          this.setData({
            currentMerchant: merchant,
            isMerchantMode: true,
            lastMerchantId: merchant.id,
            displayMode: 'products', // 商户模式只显示商品
            categories: [],
            products: [],
            currentCategory: null
          });
          
          // 更新页面标题
          wx.setNavigationBarTitle({
            title: `${merchant.name} - 分类`
          });
          
          // 重新加载分类数据
          this.loadCategories();
          
          wx.showToast({
            title: `已进入${merchant.name}专属模式`,
            icon: 'success'
          });
        }
      }
    });
  },

  // 显示商户切换面板
  showMerchantSwitchPanel() {
    // 首先加载商户列表
    this.loadNearbyMerchants();
    this.setData({ showMerchantSwitchPanel: true });
  },

  // 隐藏商户切换面板
  hideMerchantSwitchPanel() {
    this.setData({ showMerchantSwitchPanel: false });
  },

  // 加载附近商户
  async loadNearbyMerchants() {
    try {
      const { location } = this.data;
      
      const params = {
        page_size: 20,
        status: 1
      };
      
      if (location && location.latitude && location.longitude) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
        params.distance = 10; // 10公里范围内
      }
      
      const result = await getMerchantsByCategory(params);
      this.setData({ allMerchants: result.items });
      
    } catch (error) {
      console.error('❌ 加载附近商户失败', error);
    }
  },

  // 切换到其他商户
  switchToMerchant(e) {
    const merchant = e.currentTarget.dataset.merchant;
    console.log('🔄 切换到商户:', merchant.name);
    
    // 保存到缓存
    wx.setStorageSync('currentMerchant', merchant);
    
    // 更新当前状态
    this.setData({
      currentMerchant: merchant,
      isMerchantMode: true,
      lastMerchantId: merchant.id,
      showMerchantSwitchPanel: false,
      categories: [],
      products: [],
      currentCategory: null
    });
    
    // 更新页面标题
    wx.setNavigationBarTitle({
      title: `${merchant.name} - 分类`
    });
    
    // 重新加载数据
    this.loadCategories();
    
    wx.showToast({
      title: `已切换到${merchant.name}`,
      icon: 'success'
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

  // 获取分类表情符号
  getCategoryEmoji(categoryName) {
    const emojiMap = {
      '全部': '🏪',
      '美食': '🍜',
      '生鲜': '🥬',
      '甜品': '🍰',
      '饮品': '🧃',
      '服装': '👕',
      '日用品': '🧴',
      '电子产品': '📱',
      '图书': '📚',
      '运动': '⚽',
      '美妆': '💄'
    };
    
    return emojiMap[categoryName] || '📦';
  },

  // 获取空状态文本
  getEmptyText() {
    const { displayMode, isMerchantMode, currentMerchant, currentCategory, searchKeyword } = this.data;
    
    if (searchKeyword) {
      return `未找到包含"${searchKeyword}"的${displayMode === 'merchants' ? '商户' : '商品'}`;
    }
    
    if (isMerchantMode && currentMerchant) {
      if (currentCategory && currentCategory.id > 0) {
        return `${currentMerchant.name}在"${currentCategory.name}"分类下暂无商品`;
      }
      return `${currentMerchant.name}暂无商品`;
    }
    
    if (displayMode === 'merchants') {
      if (currentCategory && currentCategory.id > 0) {
        return `"${currentCategory.name}"分类下暂无商户`;
      }
      return '暂无商户';
    } else {
      if (currentCategory && currentCategory.id > 0) {
        return `"${currentCategory.name}"分类下暂无商品`;
      }
      return '暂无商品';
    }
  },

  // 获取排序选项
  getSortOptions() {
    const { displayMode, isMerchantMode } = this.data;
    
    if (isMerchantMode || displayMode === 'products') {
      // 商品排序选项
      return [
        { value: 'default', label: '默认排序' },
        { value: 'sales', label: '销量最高' },
        { value: 'price_asc', label: '价格从低到高' },
        { value: 'price_desc', label: '价格从高到低' },
        { value: 'rating', label: '评分最高' },
        { value: 'created_at', label: '最新上架' }
      ];
    } else {
      // 商户排序选项
      return [
        { value: 'default', label: '默认排序' },
        { value: 'rating', label: '评分最高' },
        { value: 'distance', label: '距离最近' },
        { value: 'created_at', label: '最新入驻' }
      ];
    }
  },

  // 获取当前排序名称
  getCurrentSortName() {
    const { sortBy } = this.data;
    const sortOptions = this.getSortOptions();
    const option = sortOptions.find(opt => opt.value === sortBy);
    return option ? option.label : '默认排序';
  },

  // 获取当前分类名称
  getCurrentCategoryName() {
    const { currentCategory } = this.data;
    return currentCategory ? currentCategory.name : '全部';
  },

  // 检查是否有更多数据
  getHasMore() {
    const { displayMode, isMerchantMode, productsHasMore, merchantsHasMore } = this.data;
    
    if (isMerchantMode || displayMode === 'products') {
      return productsHasMore;
    } else {
      return merchantsHasMore;
    }
  }
});