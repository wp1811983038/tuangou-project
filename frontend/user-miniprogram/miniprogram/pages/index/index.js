// pages/index/index.js - 重新设计的现代化首页逻辑
import { getLocation } from '../../utils/location';
import { get, post } from '../../utils/request';
import { apiPath } from '../../config/api';
import { checkLoginStatus } from '../../utils/auth';

Page({
  data: {
    // 位置和商户数据
    location: null,
    inBoundaryMerchants: [],
    allMerchants: [],
    recommendMerchants: [],
    currentMerchant: {},
    showMerchantPanel: false,

    // 轮播数据
    banners: [],
    
    // 商品相关数据
    products: [],
    hotProducts: [],
    loadingProducts: false,
    productCategories: [
      { key: 'all', name: '全部', active: true },
      { key: 'recommend', name: '推荐', active: false },
      { key: 'hot', name: '热门', active: false },
      { key: 'new', name: '新品', active: false }
    ],
    currentCategory: 'all',
    hasMoreProducts: true,
    productPage: 1,
    productPageSize: 12,

    // UI状态
    loading: false,
    messageCount: 0,
    showLocationPanel: false
  },

  // 防重复请求标志
  merchantsLoading: false,
  productLoadingKey: null,

  onLoad: function (options) {
    console.log('🏠 首页加载开始');
    this.initPage();
  },

  onReady: function () {
    wx.nextTick(() => {
      this.loadInitialData();
    });
  },

  onShow: function () {
    // 检查登录状态和消息数量
    this.checkUserStatus();
    
    // 检查商户选择状态
    this.checkMerchantStatus();
  },

  onUnload: function () {
    this.merchantsLoading = false;
    this.productLoadingKey = null;
  },

  // 初始化页面
  initPage: function () {
    // 加载缓存数据
    this.loadCachedData();
    
    // 设置默认轮播图（可以替换为实际数据）
    this.setData({
      banners: [
        {
          id: 1,
          title: '新用户专享',
          description: '注册立享9折优惠',
          image: '/assets/images/banner1.jpg',
          url: '/pages/promotion/index'
        },
        {
          id: 2,
          title: '团购特惠',
          description: '多人成团更便宜',
          image: '/assets/images/banner2.jpg',
          url: '/pages/group/list/index'
        }
      ]
    });
  },

  // 加载缓存数据
  loadCachedData: function () {
    try {
      // 加载位置缓存
      const cachedLocation = wx.getStorageSync('location');
      if (cachedLocation) {
        this.setData({ location: cachedLocation });
      }

      // 加载商户缓存
      const currentMerchant = wx.getStorageSync('currentMerchant');
      if (currentMerchant && currentMerchant.id) {
        this.setData({ currentMerchant });
      }
    } catch (error) {
      console.error('加载缓存数据失败', error);
    }
  },

  // 加载初始数据
  async loadInitialData() {
    this.setData({ loading: true });

    try {
      // 并行加载位置和商户数据
      await Promise.all([
        this.getCurrentLocation(),
        this.loadBanners()
      ]);

      // 根据是否有选中商户加载不同数据
      const { currentMerchant } = this.data;
      if (currentMerchant && currentMerchant.id) {
        await this.loadMerchantProducts(currentMerchant.id, true);
      } else {
        await this.loadHotProducts();
      }

    } catch (error) {
      console.error('初始数据加载失败', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 检查用户状态
  checkUserStatus: function () {
    const isLoggedIn = checkLoginStatus(false);
    if (isLoggedIn) {
      this.getMessageCount();
    }
  },

  // 检查商户状态
  checkMerchantStatus: function () {
    try {
      const currentMerchant = wx.getStorageSync('currentMerchant');
      const hasCurrentMerchant = !!(currentMerchant && currentMerchant.id);
      
      // 如果商户状态发生变化，更新数据
      if (hasCurrentMerchant !== !!(this.data.currentMerchant && this.data.currentMerchant.id)) {
        this.setData({ currentMerchant: currentMerchant || {} });
        
        if (hasCurrentMerchant) {
          this.loadMerchantProducts(currentMerchant.id, true);
        } else {
          this.loadHotProducts();
        }
      }
    } catch (error) {
      console.error('检查商户状态失败', error);
    }
  },

  // 获取当前位置
  async getCurrentLocation() {
    try {
      const location = await getLocation();
      
      console.log('📍 获取到用户位置:', location);
      
      this.setData({ location });
      wx.setStorageSync('location', location);
      
      // 获取位置后加载商户数据
      await this.loadMerchants(location);
      
    } catch (error) {
      console.error('获取位置失败', error);
      // 位置获取失败，使用缓存商户数据
      this.loadCachedMerchants();
    }
  },

  // 加载商户数据
  async loadMerchants(location) {
    if (this.merchantsLoading || !location) return;
    
    this.merchantsLoading = true;

    try {
      const result = await get(apiPath.merchant.list, {
        latitude: location.latitude,
        longitude: location.longitude,
        limit: 50
      });

      const merchants = result.data?.items || [];
      console.log(`🏪 获取到 ${merchants.length} 个商户`);

      // 处理商户数据
      const processedMerchants = merchants.map(merchant => ({
        ...merchant,
        inRange: this.isPointInBoundary(location, {
          north: merchant.north_boundary,
          south: merchant.south_boundary,
          east: merchant.east_boundary,
          west: merchant.west_boundary
        })
      }));

      // 分类商户
      const inBoundaryMerchants = processedMerchants.filter(m => m.inRange);
      const recommendMerchants = processedMerchants
        .filter(m => m.is_recommend || m.rating >= 4.0)
        .slice(0, 10);

      this.setData({
        allMerchants: processedMerchants,
        inBoundaryMerchants,
        recommendMerchants
      });

      console.log(`✅ 边界内商户: ${inBoundaryMerchants.length}, 推荐商户: ${recommendMerchants.length}`);

    } catch (error) {
      console.error('加载商户数据失败', error);
      this.loadCachedMerchants();
    } finally {
      this.merchantsLoading = false;
    }
  },

  // 加载缓存商户数据
  loadCachedMerchants: function () {
    try {
      const cachedMerchants = wx.getStorageSync('merchants');
      if (cachedMerchants && cachedMerchants.length > 0) {
        this.setData({
          allMerchants: cachedMerchants,
          inBoundaryMerchants: cachedMerchants.filter(m => m.inRange),
          recommendMerchants: cachedMerchants.filter(m => m.is_recommend).slice(0, 10)
        });
      }
    } catch (error) {
      console.error('加载缓存商户失败', error);
    }
  },

  // 判断点是否在边界内
  isPointInBoundary(point, boundary) {
    if (!point || !boundary) return false;
    
    const { latitude, longitude } = point;
    const { north, south, east, west } = boundary;
    
    return latitude <= north && 
           latitude >= south && 
           longitude <= east && 
           longitude >= west;
  },

  // 加载轮播图数据
  async loadBanners() {
    try {
      // 这里可以调用实际的轮播图API
      // const result = await get('/banners');
      // this.setData({ banners: result.data });
    } catch (error) {
      console.error('加载轮播图失败', error);
    }
  },

  // 加载商户商品
  async loadMerchantProducts(merchantId, reset = false) {
    if (!merchantId) return;

    const requestKey = `${merchantId}_${this.data.currentCategory}_${reset}`;
    if (this.productLoadingKey === requestKey) return;
    
    this.productLoadingKey = requestKey;

    try {
      if (reset) {
        this.setData({
          productPage: 1,
          hasMoreProducts: true
        });
      }

      this.setData({ loadingProducts: true });

      const params = {
        merchant_id: merchantId,
        page: this.data.productPage,
        page_size: this.data.productPageSize,
        status: 1
      };

      // 添加分类筛选
      const { currentCategory } = this.data;
      if (currentCategory === 'recommend') {
        params.is_recommend = true;
      } else if (currentCategory === 'hot') {
        params.is_hot = true;
      } else if (currentCategory === 'new') {
        params.is_new = true;
      }

      console.log('🛍️ 加载商户商品:', params);

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

      const products = reset ? newProducts : [...this.data.products, ...newProducts];

      this.setData({
        products,
        hasMoreProducts: newProducts.length === this.data.productPageSize,
        productPage: this.data.productPage + 1,
        loadingProducts: false
      });

      console.log(`✅ 商品加载完成: ${products.length} 个商品`);

    } catch (error) {
      console.error('加载商户商品失败', error);
      this.setData({ loadingProducts: false });
      
      if (reset) {
        wx.showToast({
          title: '加载商品失败',
          icon: 'none'
        });
      }
    } finally {
      this.productLoadingKey = null;
    }
  },

  // 加载热门商品
  async loadHotProducts() {
    try {
      this.setData({ loadingProducts: true });

      const result = await get(apiPath.product.list, {
        is_hot: true,
        page: 1,
        page_size: 20,
        status: 1
      });

      const hotProducts = result.data?.items || [];
      
      // 数据修复
      hotProducts.forEach(product => {
        if (!product.current_price && product.current_price !== 0) {
          product.current_price = 9.99;
        }
        if (!product.sales && product.sales !== 0) {
          product.sales = Math.floor(Math.random() * 100) + 1;
        }
      });

      this.setData({
        hotProducts,
        loadingProducts: false
      });

      console.log(`✅ 热门商品加载完成: ${hotProducts.length} 个商品`);

    } catch (error) {
      console.error('加载热门商品失败', error);
      this.setData({ loadingProducts: false });
    }
  },

  // 获取消息数量
  async getMessageCount() {
    try {
      const result = await get(apiPath.message.count, {}, { showLoading: false });
      this.setData({ messageCount: result.unread || 0 });
    } catch (error) {
      console.error('获取消息数量失败', error);
    }
  },

  // 切换商户选择面板
  toggleLocationPanel() {
    this.setData({ showMerchantPanel: !this.data.showMerchantPanel });
  },

  // 关闭商户面板
  closeMerchantPanel() {
    this.setData({ showMerchantPanel: false });
  },

  // 选择商户
  selectMerchant(e) {
    const { merchant } = e.currentTarget.dataset;
    const { currentMerchant } = this.data;

    if (currentMerchant.id === merchant.id) {
      this.closeMerchantPanel();
      return;
    }

    this.setData({
      currentMerchant: merchant,
      showMerchantPanel: false,
      products: [],
      productPage: 1,
      hasMoreProducts: true
    });

    // 重置分类
    const productCategories = this.data.productCategories.map(cat => ({
      ...cat,
      active: cat.key === 'all'
    }));
    this.setData({ 
      productCategories,
      currentCategory: 'all'
    });

    // 缓存选中的商户
    wx.setStorageSync('currentMerchant', merchant);

    wx.showToast({
      title: `已切换到${merchant.name}`,
      icon: 'success'
    });

    // 加载商户商品
    this.loadMerchantProducts(merchant.id, true);

    // 服务范围提示
    if (!merchant.inRange) {
      setTimeout(() => {
        wx.showToast({
          title: '该商户不在您的服务范围内',
          icon: 'none',
          duration: 2000
        });
      }, 1500);
    }
  },

  // 选择当前位置
  selectCurrentLocation() {
    this.setData({
      currentMerchant: {},
      showMerchantPanel: false,
      products: [],
      currentCategory: 'all'
    });

    const productCategories = this.data.productCategories.map(cat => ({
      ...cat,
      active: cat.key === 'all'
    }));
    this.setData({ productCategories });

    wx.removeStorageSync('currentMerchant');
    
    wx.showToast({
      title: '已切换到当前位置',
      icon: 'success'
    });

    // 加载热门商品
    this.loadHotProducts();
  },

  // 切换商品分类
  switchProductCategory(e) {
    const { key } = e.currentTarget.dataset;
    const { currentCategory, currentMerchant } = this.data;

    if (currentCategory === key) return;

    const productCategories = this.data.productCategories.map(cat => ({
      ...cat,
      active: cat.key === key
    }));

    this.setData({
      productCategories,
      currentCategory: key
    });

    // 重新加载商品
    if (currentMerchant.id) {
      this.loadMerchantProducts(currentMerchant.id, true);
    }
  },

  // 轮播图点击
  onBannerTap(e) {
    const { item } = e.currentTarget.dataset;
    if (item.url) {
      wx.navigateTo({
        url: item.url,
        fail: () => {
          wx.switchTab({ url: item.url });
        }
      });
    }
  },

  // 商品卡片点击
  onProductTap(e) {
    const { productId } = e.detail;
    if (productId) {
      wx.navigateTo({
        url: `/pages/product/detail/index?id=${productId}`
      });
    }
  },

  // 商品收藏
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

  // 商品购买
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

    // 检查服务范围
    const { currentMerchant } = this.data;
    if (currentMerchant && !currentMerchant.inRange) {
      wx.showModal({
        title: '提示',
        content: '该商户不在您的服务范围内，无法购买商品',
        showCancel: false
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
    // 更新商品列表
    const products = this.data.products.map(item => {
      if (item.id === productId) {
        return { ...item, ...updates };
      }
      return item;
    });

    // 更新热门商品列表
    const hotProducts = this.data.hotProducts.map(item => {
      if (item.id === productId) {
        return { ...item, ...updates };
      }
      return item;
    });

    this.setData({ products, hotProducts });
  },

  // 页面跳转方法
  goToSearch() {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  goToMessages() {
    if (!checkLoginStatus()) return;
    wx.navigateTo({ url: '/pages/messages/index' });
  },

  goToCategory() {
    wx.switchTab({ url: '/pages/category/index' });
  },

  goToGroups() {
    wx.switchTab({ url: '/pages/my-groups/index' });
  },

  goToNearby() {
    wx.navigateTo({ url: '/pages/merchant/list/index' });
  },

  goToOrders() {
    if (!checkLoginStatus()) return;
    wx.navigateTo({ url: '/pages/order/list/index' });
  },

  goToMerchantDetail() {
    const { currentMerchant } = this.data;
    if (currentMerchant.id) {
      wx.navigateTo({
        url: `/pages/merchant/detail/index?id=${currentMerchant.id}`
      });
    }
  },

  goToProductList() {
    const { currentMerchant } = this.data;
    if (currentMerchant.id) {
      wx.navigateTo({
        url: `/pages/product/list/index?merchant_id=${currentMerchant.id}`
      });
    }
  },

  goToMerchantList() {
    wx.navigateTo({ url: '/pages/merchant/list/index' });
  },

  // 获取当前分类名称
  get currentCategoryName() {
    const { currentCategory, productCategories } = this.data;
    const category = productCategories.find(cat => cat.key === currentCategory);
    return category ? category.name : '全部';
  },

  // 页面事件处理
  onReachBottom() {
    const { currentMerchant, hasMoreProducts, loadingProducts } = this.data;
    
    if (currentMerchant.id && hasMoreProducts && !loadingProducts) {
      this.loadMerchantProducts(currentMerchant.id, false);
    }
  },

  onPullDownRefresh() {
    Promise.all([
      this.getCurrentLocation(),
      this.data.currentMerchant.id ? 
        this.loadMerchantProducts(this.data.currentMerchant.id, true) : 
        this.loadHotProducts()
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});