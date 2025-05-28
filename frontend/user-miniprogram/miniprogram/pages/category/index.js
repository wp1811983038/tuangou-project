// pages/category/index.js - 重新设计的分类页面逻辑
import { getLocation } from '../../utils/location';
import { get, post } from '../../utils/request';
import { apiPath } from '../../config/api';
import { checkLoginStatus } from '../../utils/auth';

Page({
  data: {
    // 商户模式相关
    isMerchantMode: false,           // 是否为商户模式
    currentMerchant: null,           // 当前商户信息
    allMerchants: [],                // 所有商户列表
    showMerchantSwitchPanel: false,  // 显示商户切换面板
    
    // 分类相关
    categories: [],                  // 分类列表
    currentCategory: null,           // 当前选中分类
    
    // 显示模式（仅全局模式使用）
    displayMode: 'products',         // 'merchants' | 'products'
    
    // 数据列表
    merchants: [],                   // 商户列表
    products: [],                    // 商品列表
    
    // 搜索和筛选
    searchKeyword: '',               // 搜索关键词
    sortBy: 'default',               // 排序方式
    showSortPanel: false,            // 显示排序面板
    
    // 分页和加载状态
    currentPage: 1,                  // 当前页码
    pageSize: 20,                    // 每页数量
    hasMore: true,                   // 是否有更多数据
    loading: false,                  // 主加载状态
    loadingMore: false,              // 加载更多状态
    pageLoading: false,              // 页面级加载状态
    refreshing: false,               // 下拉刷新状态
    
    // 位置信息
    location: null
  },

  // 防重复请求标志
  loadingFlag: false,

  onLoad: function(options) {
    console.log('🏷️ 分类页面加载，参数:', options);
    
    // 处理传入的分类ID
    if (options.category_id) {
      this.preSelectedCategoryId = parseInt(options.category_id);
    }
    
    // 检测商户模式
    this.checkMerchantMode();
    
    // 初始化页面
    this.initPage();
  },

  onShow: function() {
    console.log('🏷️ 分类页面显示');
    
    // 检查商户状态是否发生变化
    this.checkMerchantModeChange();
  },

  onReady: function() {
    // 页面渲染完成
    console.log('🏷️ 分类页面渲染完成');
  },

  // 检测商户模式
  checkMerchantMode: function() {
    try {
      const currentMerchant = wx.getStorageSync('currentMerchant');
      const isMerchantMode = !!(currentMerchant && currentMerchant.id);
      
      console.log('🏪 检测商户模式:', {
        isMerchantMode,
        merchantName: currentMerchant?.name || '无'
      });
      
      this.setData({
        isMerchantMode,
        currentMerchant: currentMerchant || null,
        displayMode: isMerchantMode ? 'products' : 'products' // 商户模式下只显示商品
      });
      
      // 更新页面标题
      this.updatePageTitle();
      
    } catch (error) {
      console.error('检测商户模式失败', error);
    }
  },

  // 检查商户模式变化
  checkMerchantModeChange: function() {
    const currentMerchant = wx.getStorageSync('currentMerchant');
    const newIsMerchantMode = !!(currentMerchant && currentMerchant.id);
    const { isMerchantMode, currentMerchant: oldMerchant } = this.data;
    
    // 检查是否发生变化
    const merchantChanged = newIsMerchantMode !== isMerchantMode || 
                           (currentMerchant?.id !== oldMerchant?.id);
    
    if (merchantChanged) {
      console.log('🔄 商户状态发生变化，重新初始化');
      
      this.setData({
        isMerchantMode: newIsMerchantMode,
        currentMerchant: currentMerchant || null,
        categories: [],
        products: [],
        merchants: [],
        currentCategory: null,
        searchKeyword: '',
        currentPage: 1,
        hasMore: true
      });
      
      this.updatePageTitle();
      this.initPage();
    }
  },

  // 更新页面标题
  updatePageTitle: function() {
    const { isMerchantMode, currentMerchant } = this.data;
    
    let title = '分类';
    if (isMerchantMode && currentMerchant) {
      title = `${currentMerchant.name} - 分类`;
    }
    
    wx.setNavigationBarTitle({ title });
  },

  // 初始化页面
  async initPage() {
    this.setData({ pageLoading: true });
    
    try {
      // 获取位置信息
      await this.getCurrentLocation();
      
      // 根据模式加载不同数据
      const { isMerchantMode } = this.data;
      
      if (isMerchantMode) {
        await this.loadMerchantMode();
      } else {
        await this.loadGlobalMode();
      }
      
    } catch (error) {
      console.error('页面初始化失败', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ pageLoading: false });
    }
  },

  // 获取当前位置
  async getCurrentLocation() {
    try {
      const location = await getLocation();
      this.setData({ location });
      wx.setStorageSync('location', location);
    } catch (error) {
      console.error('获取位置失败', error);
      // 使用缓存位置
      const cachedLocation = wx.getStorageSync('location');
      if (cachedLocation) {
        this.setData({ location: cachedLocation });
      }
    }
  },

  // 加载商户模式
  async loadMerchantMode() {
    const { currentMerchant } = this.data;
    
    if (!currentMerchant || !currentMerchant.id) {
      throw new Error('商户信息不完整');
    }
    
    console.log(`🏪 加载商户模式数据: ${currentMerchant.name}`);
    
    // 并行加载分类和商户列表
    await Promise.all([
      this.loadMerchantCategories(currentMerchant.id),
      this.loadAllMerchants()
    ]);
  },

  // 加载全局模式
  async loadGlobalMode() {
    console.log('🌍 加载全局模式数据');
    
    await Promise.all([
      this.loadGlobalCategories(),
      this.loadAllMerchants()
    ]);
  },

  // 加载商户的商品分类
  async loadMerchantCategories(merchantId) {
    try {
      console.log(`📋 加载商户分类: ${merchantId}`);
      
      // 调用API获取商户分类
      const result = await get(`/merchants/${merchantId}/categories`, {}, {
        showLoading: false
      });
      
      let categories = result.data || [];
      
      // 如果没有分类，创建一个默认分类
      if (categories.length === 0) {
        categories = [
          { id: 0, name: '全部商品', product_count: 0 }
        ];
      } else {
        // 在前面添加"全部"分类
        categories.unshift({
          id: 0,
          name: '全部商品',
          product_count: categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0)
        });
      }
      
      // 设置当前分类
      let currentCategory = categories[0];
      if (this.preSelectedCategoryId) {
        const targetCategory = categories.find(cat => cat.id === this.preSelectedCategoryId);
        if (targetCategory) {
          currentCategory = targetCategory;
        }
      }
      
      this.setData({
        categories,
        currentCategory
      });
      
      console.log(`✅ 加载了 ${categories.length} 个商户分类`);
      
      // 加载当前分类的商品
      await this.loadCategoryProducts(currentCategory.id, true);
      
    } catch (error) {
      console.error('加载商户分类失败', error);
      
      // 设置默认分类
      const defaultCategories = [
        { id: 0, name: '全部商品', product_count: 0 }
      ];
      
      this.setData({
        categories: defaultCategories,
        currentCategory: defaultCategories[0]
      });
      
      // 仍然尝试加载商品
      await this.loadCategoryProducts(0, true);
    }
  },

  // 加载全局分类
  async loadGlobalCategories() {
    try {
      console.log('📋 加载全局分类');
      
      const result = await get(apiPath.merchant.categories, {
        is_active: true
      });
      
      let categories = result || [];
      
      // 添加"全部"分类
      categories.unshift({
        id: 0,
        name: '全部',
        merchant_count: 0,
        product_count: 0
      });
      
      // 设置当前分类
      let currentCategory = categories[0];
      if (this.preSelectedCategoryId) {
        const targetCategory = categories.find(cat => cat.id === this.preSelectedCategoryId);
        if (targetCategory) {
          currentCategory = targetCategory;
        }
      }
      
      this.setData({
        categories,
        currentCategory
      });
      
      console.log(`✅ 加载了 ${categories.length} 个全局分类`);
      
      // 加载当前分类的数据
      await this.loadCategoryData(currentCategory.id, true);
      
    } catch (error) {
      console.error('加载全局分类失败', error);
    }
  },

  // 加载所有商户
  async loadAllMerchants() {
    try {
      const { location } = this.data;
      const params = { limit: 100 };
      
      if (location) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
      }
      
      const result = await get(apiPath.merchant.list, params, {
        showLoading: false
      });
      
      const allMerchants = result.data?.items || [];
      this.setData({ allMerchants });
      
      console.log(`📋 加载了 ${allMerchants.length} 个商户`);
      
    } catch (error) {
      console.error('加载商户列表失败', error);
    }
  },

  // 切换分类
  async switchCategory(e) {
    const { id } = e.currentTarget.dataset;
    const { categories, currentCategory } = this.data;
    
    const categoryId = parseInt(id);
    
    if (currentCategory && currentCategory.id === categoryId) return;
    
    const category = categories.find(item => item.id === categoryId);
    if (!category) return;
    
    console.log(`🔄 切换到分类: ${category.name}`);
    
    this.setData({
      currentCategory: category,
      products: [],
      merchants: [],
      currentPage: 1,
      hasMore: true,
      searchKeyword: ''
    });
    
    // 加载新分类的数据
    const { isMerchantMode } = this.data;
    if (isMerchantMode) {
      await this.loadCategoryProducts(categoryId, true);
    } else {
      await this.loadCategoryData(categoryId, true);
    }
  },

  // 加载分类数据（全局模式）
  async loadCategoryData(categoryId, reset = false) {
    const { displayMode } = this.data;
    
    if (displayMode === 'merchants') {
      await this.loadCategoryMerchants(categoryId, reset);
    } else {
      await this.loadCategoryProducts(categoryId, reset);
    }
  },

  // 加载分类商户
  async loadCategoryMerchants(categoryId, reset = false) {
    if (this.loadingFlag) return;
    
    this.loadingFlag = true;
    this.setData({ loading: reset, loadingMore: !reset });
    
    try {
      const { currentPage, pageSize, location, searchKeyword, sortBy } = this.data;
      
      const params = {
        page: reset ? 1 : currentPage,
        page_size: pageSize,
        status: 1
      };
      
      if (categoryId > 0) {
        params.category_id = categoryId;
      }
      
      if (location) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
      }
      
      if (searchKeyword) {
        params.keyword = searchKeyword;
      }
      
      if (sortBy !== 'default') {
        // 设置排序参数
        params.sort_by = this.getSortField(sortBy);
        params.sort_order = this.getSortOrder(sortBy);
      }
      
      const result = await get(apiPath.merchant.list, params);
      const newMerchants = result.data?.items || [];
      
      this.setData({
        merchants: reset ? newMerchants : [...this.data.merchants, ...newMerchants],
        currentPage: (reset ? 1 : currentPage) + 1,
        hasMore: newMerchants.length === pageSize
      });
      
    } catch (error) {
      console.error('加载分类商户失败', error);
    } finally {
      this.setData({ loading: false, loadingMore: false });
      this.loadingFlag = false;
    }
  },

  // 加载分类商品
  async loadCategoryProducts(categoryId, reset = false) {
    if (this.loadingFlag) return;
    
    this.loadingFlag = true;
    this.setData({ loading: reset, loadingMore: !reset });
    
    try {
      const { 
        currentPage, 
        pageSize, 
        searchKeyword, 
        sortBy, 
        isMerchantMode,
        currentMerchant 
      } = this.data;
      
      const params = {
        page: reset ? 1 : currentPage,
        page_size: pageSize,
        status: 1
      };
      
      // 商户模式下添加商户ID
      if (isMerchantMode && currentMerchant) {
        params.merchant_id = currentMerchant.id;
      }
      
      // 分类筛选
      if (categoryId > 0) {
        params.category_id = categoryId;
      }
      
      // 搜索关键词
      if (searchKeyword) {
        params.keyword = searchKeyword;
      }
      
      // 排序参数
      if (sortBy !== 'default') {
        params.sort_by = this.getSortField(sortBy);
        params.sort_order = this.getSortOrder(sortBy);
      }
      
      console.log('🛍️ 加载商品参数:', params);
      
      const result = await get(apiPath.product.list, params);
      const newProducts = result.data?.items || [];
      
      // 数据修复
      newProducts.forEach(product => {
        if (!product.current_price && product.current_price !== 0) {
          product.current_price = 9.99;
        }
        if (!product.sales && product.sales !== 0) {
          product.sales = Math.floor(Math.random() * 100) + 1;
        }
      });
      
      this.setData({
        products: reset ? newProducts : [...this.data.products, ...newProducts],
        currentPage: (reset ? 1 : currentPage) + 1,
        hasMore: newProducts.length === pageSize
      });
      
      console.log(`✅ 加载商品完成: ${newProducts.length} 个商品`);
      
    } catch (error) {
      console.error('加载分类商品失败', error);
      
      if (reset) {
        wx.showToast({
          title: '加载商品失败',
          icon: 'none'
        });
      }
    } finally {
      this.setData({ loading: false, loadingMore: false });
      this.loadingFlag = false;
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
    const { currentCategory, isMerchantMode } = this.data;
    
    if (currentCategory) {
      if (isMerchantMode) {
        await this.loadCategoryProducts(currentCategory.id, true);
      } else {
        await this.loadCategoryData(currentCategory.id, true);
      }
    }
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.performSearch();
  },

  // 切换显示模式
  switchDisplayMode(e) {
    const { mode } = e.currentTarget.dataset;
    const { displayMode, currentCategory } = this.data;
    
    if (displayMode === mode) return;
    
    console.log(`🔄 切换显示模式: ${displayMode} -> ${mode}`);
    
    this.setData({
      displayMode: mode,
      merchants: [],
      products: [],
      currentPage: 1,
      hasMore: true
    });
    
    if (currentCategory) {
      this.loadCategoryData(currentCategory.id, true);
    }
  },

  // 排序相关
  showSortPanel() {
    this.setData({ showSortPanel: true });
  },

  hideSortPanel() {
    this.setData({ showSortPanel: false });
  },

  selectSort(e) {
    const { value } = e.currentTarget.dataset;
    const { sortBy, currentCategory, isMerchantMode } = this.data;
    
    if (sortBy === value) {
      this.hideSortPanel();
      return;
    }
    
    this.setData({
      sortBy: value,
      showSortPanel: false
    });
    
    if (currentCategory) {
      if (isMerchantMode) {
        this.loadCategoryProducts(currentCategory.id, true);
      } else {
        this.loadCategoryData(currentCategory.id, true);
      }
    }
  },

  // 商户切换面板
  showMerchantSwitchPanel() {
    this.setData({ showMerchantSwitchPanel: true });
  },

  hideMerchantSwitchPanel() {
    this.setData({ showMerchantSwitchPanel: false });
  },

  // 切换到其他商户
  switchToMerchant(e) {
    const { merchant } = e.currentTarget.dataset;
    const { currentMerchant } = this.data;
    
    if (currentMerchant.id === merchant.id) {
      this.hideMerchantSwitchPanel();
      return;
    }
    
    console.log(`🔄 切换到商户: ${merchant.name}`);
    
    // 更新商户信息
    wx.setStorageSync('currentMerchant', merchant);
    
    // 重置页面状态
    this.setData({
      currentMerchant: merchant,
      showMerchantSwitchPanel: false,
      categories: [],
      products: [],
      currentCategory: null,
      searchKeyword: '',
      currentPage: 1,
      hasMore: true
    });
    
    this.updatePageTitle();
    
    wx.showToast({
      title: `已切换到${merchant.name}`,
      icon: 'success'
    });
    
    // 重新初始化
    this.loadMerchantMode();
  },

  // 选择商户（从商户列表）
  selectMerchant(e) {
    const { merchant } = e.currentTarget.dataset;
    
    // 保存选中的商户
    wx.setStorageSync('currentMerchant', merchant);
    
    wx.showToast({
      title: `已选择${merchant.name}`,
      icon: 'success'
    });
    
    // 延迟跳转，让用户看到提示
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 1000);
  },

  // 返回全局模式
  backToGlobal() {
    wx.showModal({
      title: '提示',
      content: '是否退出商户模式，浏览全部商户？',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 清除商户选择
          wx.removeStorageSync('currentMerchant');
          
          // 重置状态
          this.setData({
            isMerchantMode: false,
            currentMerchant: null,
            displayMode: 'products',
            categories: [],
            products: [],
            merchants: [],
            currentCategory: null,
            searchKeyword: '',
            showMerchantSwitchPanel: false
          });
          
          // 更新标题
          wx.setNavigationBarTitle({ title: '分类' });
          
          wx.showToast({
            title: '已切换到全局模式',
            icon: 'success'
          });
          
          // 重新初始化
          this.initPage();
        }
      }
    });
  },

  // 商品操作
  onProductTap(e) {
    const { productId } = e.detail;
    if (productId) {
      wx.navigateTo({
        url: `/pages/product/detail/index?id=${productId}`
      });
    }
  },

  async onProductFavorite(e) {
    const { productId } = e.detail;
    
    if (!checkLoginStatus()) return;

    try {
      const result = await post(`/users/favorites/${productId}`, {}, {
        showLoading: false
      });

      // 更新本地数据
      this.updateProductInList(productId, {
        is_favorite: result.data,
        favorite_count: result.data ? 
          (e.detail.product.favorite_count || 0) + 1 : 
          Math.max(0, (e.detail.product.favorite_count || 0) - 1)
      });

      wx.showToast({
        title: result.data ? '已添加到收藏' : '已取消收藏',
        icon: 'success',
        duration: 1500
      });

    } catch (error) {
      console.error('收藏操作失败', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  onProductBuy(e) {
    const { product, productId } = e.detail;
    
    if (!checkLoginStatus()) return;

    if (product.stock === 0) {
      wx.showToast({
        title: '商品暂时缺货',
        icon: 'none'
      });
      return;
    }

    // 团购检查
    if (product.has_group && product.group_price) {
      wx.showModal({
        title: '发现团购活动',
        content: `该商品有团购活动，团购价¥${product.group_price}，是否查看团购详情？`,
        confirmText: '查看团购',
        cancelText: '直接购买',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: `/pages/group/list/index?product_id=${productId}`
            });
          } else {
            wx.navigateTo({
              url: `/pages/order/create/index?product_id=${productId}&type=direct`
            });
          }
        }
      });
    } else {
      wx.navigateTo({
        url: `/pages/order/create/index?product_id=${productId}&type=direct`
      });
    }
  },

  // 更新商品列表中的单个商品
  updateProductInList(productId, updates) {
    const products = this.data.products.map(item => {
      if (item.id === productId) {
        return { ...item, ...updates };
      }
      return item;
    });

    this.setData({ products });
  },

  // 加载更多
  loadMore() {
    const { hasMore, loading, loadingMore, currentCategory, isMerchantMode } = this.data;
    
    if (!hasMore || loading || loadingMore || !currentCategory) return;
    
    if (isMerchantMode) {
      this.loadCategoryProducts(currentCategory.id, false);
    } else {
      this.loadCategoryData(currentCategory.id, false);
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    this.setData({ refreshing: true });
    
    try {
      const { currentCategory, isMerchantMode } = this.data;
      
      if (currentCategory) {
        if (isMerchantMode) {
          await this.loadCategoryProducts(currentCategory.id, true);
        } else {
          await this.loadCategoryData(currentCategory.id, true);
        }
      }
    } catch (error) {
      console.error('刷新失败', error);
    } finally {
      this.setData({ refreshing: false });
    }
  },

  // 工具函数
  getSortField(sortBy) {
    const sortMap = {
      'price_asc': 'current_price',
      'price_desc': 'current_price',
      'sales': 'sales',
      'rating': 'rating',
      'created_at': 'created_at'
    };
    return sortMap[sortBy] || 'created_at';
  },

  getSortOrder(sortBy) {
    if (sortBy === 'price_asc') return 'asc';
    return 'desc';
  },

  getSortOptions() {
    const { isMerchantMode, displayMode } = this.data;
    
    if (isMerchantMode || displayMode === 'products') {
      return [
        { value: 'default', label: '默认排序' },
        { value: 'sales', label: '销量最高' },
        { value: 'price_asc', label: '价格从低到高' },
        { value: 'price_desc', label: '价格从高到低' },
        { value: 'rating', label: '评分最高' },
        { value: 'created_at', label: '最新上架' }
      ];
    } else {
      return [
        { value: 'default', label: '默认排序' },
        { value: 'rating', label: '评分最高' },
        { value: 'created_at', label: '最新开店' }
      ];
    }
  },

  get currentSortName() {
    const { sortBy } = this.data;
    const options = this.getSortOptions();
    const option = options.find(opt => opt.value === sortBy);
    return option ? option.label : '默认排序';
  },

  getCategoryEmoji(categoryName) {
    const emojiMap = {
      '全部商品': '🛍️',
      '全部': '🛍️',
      '美食': '🍔',
      '生鲜': '🥬',
      '甜品': '🧁',
      '饮品': '🧃',
      '服装': '👕',
      '日用品': '🧴',
      '电子产品': '📱',
      '图书': '📚',
      '运动': '⚽',
      '美妆': '💄'
    };
    
    // 直接匹配
    if (emojiMap[categoryName]) {
      return emojiMap[categoryName];
    }
    
    // 模糊匹配
    for (const [name, emoji] of Object.entries(emojiMap)) {
      if (categoryName.includes(name) || name.includes(categoryName)) {
        return emoji;
      }
    }
    
    return '📦';
  },

  getEmptyText() {
    const { 
      isMerchantMode, 
      currentMerchant, 
      currentCategory, 
      displayMode, 
      searchKeyword 
    } = this.data;
    
    if (searchKeyword) {
      return `没有找到"${searchKeyword}"相关的${displayMode === 'merchants' && !isMerchantMode ? '商户' : '商品'}`;
    }
    
    if (isMerchantMode) {
      const categoryName = currentCategory?.name === '全部商品' ? '' : currentCategory?.name;
      return `${currentMerchant?.name || '该商户'}暂无${categoryName}商品`;
    }
    
    if (displayMode === 'merchants') {
      const categoryName = currentCategory?.name === '全部' ? '' : currentCategory?.name;
      return `暂无${categoryName}商户`;
    } else {
      const categoryName = currentCategory?.name === '全部' ? '' : currentCategory?.name;
      return `暂无${categoryName}商品`;
    }
  },

  // 页面事件
  onReachBottom() {
    this.loadMore();
  }
});