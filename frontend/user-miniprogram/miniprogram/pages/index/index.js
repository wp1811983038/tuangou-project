// pages/index/index.js - 集成分类功能的增强版首页
import { getLocation } from '../../utils/location';
import { get, post } from '../../utils/request';
import { apiPath } from '../../config/api';
import { checkLoginStatus } from '../../utils/auth';
import { 
  getCategories, 
  getHotCategories,
  getMerchantsByCategory 
} from '../../services/category';
import { CategoryUtils, CategoryNavigationUtils } from '../../utils/category';

Page({
  data: {
    // 位置和商户数据
    location: null,
    inBoundaryMerchants: [],
    allMerchants: [],
    hasNearbyMerchant: false,
    currentMerchant: {},
    showMerchantPanel: false,
    
    // 分类数据
    categories: [],                    // 所有分类
    hotCategories: [],                 // 热门分类
    showAllCategories: false,          // 是否显示全部分类
    
    // 商品相关数据
    products: [],
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
    productPageSize: 10,
    
    // 轮播图和推荐
    banners: [],                       // 轮播图
    recommendMerchants: [],            // 推荐商户
    
    // UI状态
    loading: false,
    showLocationTip: false,
    refreshing: false
  },

  // 初始化标志
  merchantsLoading: false,
  productLoadingKey: null,

  onLoad: function(options) {
    // 加载缓存数据
    this.loadCachedData();
    
    // 处理分享进入的分类参数
    if (options.category_id) {
      this.handleCategoryShare(parseInt(options.category_id));
    }
  },

  onReady: function() {
    wx.nextTick(() => {
      this.initializePage();
    });
  },

  onShow: function() {
    if (!this.data.location) {
      setTimeout(() => {
        this.getCurrentLocation();
      }, 100);
    }
    
    // 刷新分类数据（如果缓存过期）
    this.refreshCategoriesIfNeeded();
  },

  onUnload: function() {
    this.merchantsLoading = false;
    this.productLoadingKey = null;
  },

  // 加载缓存数据
  loadCachedData() {
    try {
      const cachedLocation = wx.getStorageSync('location');
      const currentMerchant = wx.getStorageSync('currentMerchant');
      const cachedCategories = CategoryUtils.getCachedCategories();
      
      if (cachedLocation) {
        this.setData({ location: cachedLocation });
      }
      
      if (currentMerchant) {
        this.setData({ currentMerchant });
      }
      
      if (cachedCategories) {
        this.setData({ 
          categories: cachedCategories,
          hotCategories: CategoryUtils.getHotCategories(cachedCategories, 8)
        });
      }
    } catch (error) {
      console.error('加载缓存数据失败', error);
    }
  },

  // 初始化页面数据
  async initializePage() {
    this.setData({ loading: true });
    
    try {
      await Promise.all([
        this.getCurrentLocation(),
        this.loadCategories(),
        this.loadBanners(),
        this.loadRecommendMerchants()
      ]);
      
      // 如果有选中商户，加载商品
      const { currentMerchant } = this.data;
      if (currentMerchant && currentMerchant.id) {
        this.loadMerchantProducts(currentMerchant.id, true);
      }
      
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

  // 处理分类分享进入
  handleCategoryShare(categoryId) {
    // 延迟跳转到分类页面，让首页先加载完成
    setTimeout(() => {
      CategoryNavigationUtils.navigateToCategory(categoryId);
    }, 1000);
  },

  // 刷新分类数据（如果需要）
  async refreshCategoriesIfNeeded() {
    const cachedCategories = CategoryUtils.getCachedCategories();
    if (!cachedCategories) {
      await this.loadCategories();
    }
  },

  // 获取当前位置
  async getCurrentLocation() {
    try {
      if (this.data.loading) return;
      
      this.setData({ loading: true });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const location = await getLocation();
      
      console.log('========= 用户当前坐标 =========');
      console.log(`纬度(latitude): ${location.latitude}`);
      console.log(`经度(longitude): ${location.longitude}`);
      console.log('================================');
      
      this.setData({ 
        location,
        showLocationTip: false
      });
      
      try {
        wx.setStorageSync('location', location);
      } catch (e) {
        console.warn('存储位置信息失败', e);
      }
      
      await this.loadMerchants(location);
    } catch (error) {
      console.error('获取位置失败', error);
      this.setData({ 
        showLocationTip: true,
        loading: false
      });
    }
  },

  // 加载分类数据
  async loadCategories() {
    try {
      const categories = await getCategories({ is_active: true });
      const formattedCategories = CategoryUtils.formatCategories(categories);
      const sortedCategories = CategoryUtils.sortCategories(formattedCategories);
      const hotCategories = CategoryUtils.getHotCategories(sortedCategories, 8);
      
      this.setData({
        categories: sortedCategories,
        hotCategories
      });
      
      // 缓存分类数据
      CategoryUtils.cacheCategories(sortedCategories);
      
      console.log(`加载了${sortedCategories.length}个分类，其中${hotCategories.length}个热门分类`);
      
    } catch (error) {
      console.error('加载分类失败', error);
      // 如果网络请求失败，尝试使用缓存数据
      const cachedCategories = CategoryUtils.getCachedCategories();
      if (cachedCategories) {
        this.setData({
          categories: cachedCategories,
          hotCategories: CategoryUtils.getHotCategories(cachedCategories, 8)
        });
      }
    }
  },

  // 加载轮播图
  async loadBanners() {
    try {
      // 这里可以调用轮播图API
      // 暂时使用模拟数据
      const banners = [
        {
          id: 1,
          image: '/assets/images/banner1.jpg',
          title: '新用户专享优惠',
          link_type: 'category',
          link_value: '1',
          sort_order: 1
        },
        {
          id: 2,
          image: '/assets/images/banner2.jpg', 
          title: '生鲜特惠周',
          link_type: 'category',
          link_value: '2',
          sort_order: 2
        }
      ];
      
      this.setData({ banners });
    } catch (error) {
      console.error('加载轮播图失败', error);
    }
  },

  // 加载推荐商户
  async loadRecommendMerchants() {
    try {
      const { location } = this.data;
      const params = {
        limit: 6,
        is_recommend: true,
        status: 1
      };
      
      if (location) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
      }
      
      const result = await get(apiPath.merchant.list, params);
      const merchants = result.data?.items || [];
      
      this.setData({ recommendMerchants: merchants.slice(0, 6) });
    } catch (error) {
      console.error('加载推荐商户失败', error);
    }
  },

  // 加载商户数据（保持原有逻辑）
  async loadMerchants(location) {
    try {
      if (!location || !location.latitude || !location.longitude) {
        console.warn('位置信息不完整，跳过商户加载');
        this.setData({ loading: false });
        return;
      }
      
      if (this.merchantsLoading) return;
      this.merchantsLoading = true;
      
      const result = await get(apiPath.merchant.list, { limit: 100 });
      const merchants = result.data?.items || [];
      
      console.log('========= 商户边界范围信息 =========');
      console.log(`获取到商户数量: ${merchants.length}`);
      
      const allMerchants = merchants.map(merchant => {
        let inRange = false;
        
        if (merchant.north_boundary && merchant.south_boundary && 
            merchant.east_boundary && merchant.west_boundary) {
          
          console.log(`\n商户ID: ${merchant.id}, 名称: ${merchant.name}`);
          console.log(`北边界(north): ${merchant.north_boundary}`);
          console.log(`南边界(south): ${merchant.south_boundary}`);
          console.log(`东边界(east): ${merchant.east_boundary}`);
          console.log(`西边界(west): ${merchant.west_boundary}`);
          
          inRange = this.isPointInBoundary(location, {
            north: merchant.north_boundary,
            south: merchant.south_boundary,
            east: merchant.east_boundary,
            west: merchant.west_boundary
          });
          
          console.log(`用户是否在该商户边界内: ${inRange ? '是' : '否'}`);
        }
        
        return { ...merchant, inRange };
      });
      
      const inBoundaryMerchants = allMerchants.filter(merchant => merchant.inRange);
      
      console.log(`\n用户在边界范围内的商户数量: ${inBoundaryMerchants.length}`);
      console.log('====================================');
      
      const { currentMerchant } = this.data;
      if (currentMerchant && currentMerchant.id) {
        const updatedMerchant = allMerchants.find(merchant => merchant.id === currentMerchant.id);
        if (updatedMerchant) {
          this.setData({ currentMerchant: updatedMerchant });
          try {
            wx.setStorageSync('currentMerchant', updatedMerchant);
          } catch (e) {
            console.warn('保存商户信息失败', e);
          }
        }
      }
      
      this.setData({
        allMerchants,
        inBoundaryMerchants,
        hasNearbyMerchant: inBoundaryMerchants.length > 0,
        loading: false
      });
      
    } catch (error) {
      console.error('加载商户数据失败', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: '加载商户信息失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.merchantsLoading = false;
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

  // 点击分类导航
  onCategoryTap(e) {
    const { id, name } = e.currentTarget.dataset;
    CategoryNavigationUtils.navigateToCategory(parseInt(id), name);
  },

  // 查看全部分类
  viewAllCategories() {
    wx.switchTab({
      url: '/pages/category/index'
    });
  },

  // 切换分类显示
  toggleCategoriesDisplay() {
    this.setData({
      showAllCategories: !this.data.showAllCategories
    });
  },

  // 点击轮播图
  onBannerTap(e) {
    const { item } = e.currentTarget.dataset;
    
    if (!item) return;
    
    switch (item.link_type) {
      case 'category':
        CategoryNavigationUtils.navigateToCategory(parseInt(item.link_value));
        break;
      case 'merchant':
        wx.navigateTo({
          url: `/pages/merchant/detail/index?id=${item.link_value}`
        });
        break;
      case 'product':
        wx.navigateTo({
          url: `/pages/product/detail/index?id=${item.link_value}`
        });
        break;
      case 'url':
        wx.navigateTo({
          url: `/pages/webview/index?url=${encodeURIComponent(item.link_value)}`
        });
        break;
      default:
        console.log('未知链接类型:', item.link_type);
    }
  },

  // 点击推荐商户
  onRecommendMerchantTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/merchant/detail/index?id=${id}`
    });
  },

  // 搜索分类
  searchCategory(e) {
    const { keyword } = e.detail;
    CategoryNavigationUtils.navigateToSearchWithCategory(0, keyword);
  },

  // 切换商户面板显示
  toggleMerchantPanel() {
    this.setData({
      showMerchantPanel: !this.data.showMerchantPanel
    });
  },
  
  // 关闭商户面板
  closeMerchantPanel() {
    this.setData({
      showMerchantPanel: false
    });
  },
  
  // 选择当前位置（取消商户选择）
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
  },
  
  // 跳转到搜索页
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/index'
    });
  },
  
  // 选择商户
  selectMerchant(e) {
    const { id } = e.currentTarget.dataset;
    const { allMerchants, currentMerchant } = this.data;
    
    if (currentMerchant.id === id) {
      this.closeMerchantPanel();
      return;
    }
    
    const selectedMerchant = allMerchants.find(item => item.id === id);
    if (selectedMerchant) {
      this.setData({
        currentMerchant: selectedMerchant,
        showMerchantPanel: false
      });
      
      wx.setStorageSync('currentMerchant', selectedMerchant);
      
      wx.showToast({
        title: '已切换到' + selectedMerchant.name,
        icon: 'success'
      });
      
      this.loadMerchantProducts(selectedMerchant.id, true);
      
      if (!selectedMerchant.inRange) {
        setTimeout(() => {
          wx.showToast({
            title: '该商户不在您的服务范围内',
            icon: 'none',
            duration: 2000
          });
        }, 1500);
      }
    }
  },

  // 加载商户商品（保持原有逻辑）
  async loadMerchantProducts(merchantId, reset = false) {
    if (!merchantId) {
      console.warn('商户ID不存在，跳过商品加载');
      return;
    }
    
    const requestKey = `${merchantId}_${this.data.currentCategory}_${reset}`;
    if (this.productLoadingKey === requestKey) {
      return;
    }
    this.productLoadingKey = requestKey;
    
    try {
      if (reset) {
        this.setData({
          productPage: 1,
          hasMoreProducts: true
        });
        
        if (reset && this.data.currentCategory === 'all') {
          const productCategories = this.data.productCategories.map(cat => ({
            ...cat,
            active: cat.key === 'all'
          }));
          this.setData({ 
            productCategories,
            currentCategory: 'all'
          });
        }
      }
      
      this.setData({ loadingProducts: true });
      
      const params = {
        merchant_id: merchantId,
        page: this.data.productPage,
        page_size: this.data.productPageSize,
        status: 1
      };
      
      const { currentCategory } = this.data;
      if (currentCategory === 'recommend') {
        params.is_recommend = true;
      } else if (currentCategory === 'hot') {
        params.is_hot = true;
      } else if (currentCategory === 'new') {
        params.is_new = true;
      }
      
      console.log('请求商品参数:', params);
      
      const result = await get(apiPath.product.list, params);
      const newProducts = result.data?.items || [];
      
      console.log(`获取到${newProducts.length}个商品`);
      
      const products = reset ? newProducts : [...this.data.products, ...newProducts];
      
      this.setData({
        products,
        hasMoreProducts: newProducts.length === this.data.productPageSize,
        productPage: this.data.productPage + 1,
        loadingProducts: false
      });
      
      console.log(`加载商户${merchantId}的商品，当前${currentCategory}分类，共${products.length}个商品`);
      
    } catch (error) {
      console.error('加载商户商品失败', error);
      this.setData({ loadingProducts: false });
      
      wx.showToast({
        title: '加载商品失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.productLoadingKey = null;
    }
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
    
    if (currentMerchant.id) {
      this.loadMerchantProducts(currentMerchant.id, true);
    }
  },
  
  // 跳转到商户详情页
  goToMerchantDetail() {
    const { currentMerchant } = this.data;
    if (currentMerchant.id) {
      wx.navigateTo({
        url: `/pages/merchant/detail/index?id=${currentMerchant.id}`
      });
    }
  },
  
  // 跳转到商品列表页
  goToProductList() {
    const { currentMerchant } = this.data;
    if (currentMerchant.id) {
      wx.navigateTo({
        url: `/pages/product/list/index?merchant_id=${currentMerchant.id}`
      });
    }
  },

  // 商品卡片点击事件
  onProductTap(e) {
    const { product, productId } = e.detail;
    console.log('点击商品:', product);
    
    if (productId) {
      wx.navigateTo({
        url: `/pages/product/detail/index?id=${productId}`
      });
    }
  },

  // 商品收藏事件
  async onProductFavorite(e) {
    const { product, productId, isFavorite } = e.detail;
    
    if (!checkLoginStatus()) {
      return;
    }
    
    try {
      const result = await post(`/users/favorites/${productId}`, {}, {
        showLoading: false
      });
      
      const { products } = this.data;
      const updatedProducts = products.map(item => {
        if (item.id === productId) {
          return {
            ...item,
            is_favorite: result.data,
            favorite_count: result.data ? item.favorite_count + 1 : Math.max(0, item.favorite_count - 1)
          };
        }
        return item;
      });
      
      this.setData({ products: updatedProducts });
      
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

  // 商品购买事件
  onProductBuy(e) {
    const { product, productId } = e.detail;
    
    if (!checkLoginStatus()) {
      return;
    }
    
    if (product.stock === 0) {
      wx.showToast({
        title: '商品暂时缺货',
        icon: 'none'
      });
      return;
    }
    
    const { currentMerchant } = this.data;
    if (currentMerchant && !currentMerchant.inRange) {
      wx.showModal({
        title: '提示',
        content: '该商户不在您的服务范围内，无法购买商品',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }
    
    if (product.has_group && product.group_price) {
      wx.showModal({
        title: '发现团购活动',
        content: `该商品有团购活动，团购价¥${product.group_price}，是否查看团购详情？`,
        confirmText: '查看团购',
        cancelText: '直接购买',
        success: (res) => {
          if (res.confirm) {
            this.goToGroupPage(productId);
          } else {
            this.goToBuyPage(productId);
          }
        }
      });
    } else {
      this.goToBuyPage(productId);
    }
  },

  // 跳转到团购页面
  goToGroupPage(productId) {
    wx.navigateTo({
      url: `/pages/group/list/index?product_id=${productId}`
    });
  },

  // 跳转到购买页面
  goToBuyPage(productId) {
    wx.navigateTo({
      url: `/pages/order/create/index?product_id=${productId}&type=direct`
    });
  },

  // 页面上拉触底事件的处理函数
  onReachBottom() {
    const { currentMerchant, hasMoreProducts, loadingProducts } = this.data;
    
    if (currentMerchant.id && hasMoreProducts && !loadingProducts) {
      this.loadMerchantProducts(currentMerchant.id, false);
    }
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    const { currentMerchant } = this.data;
    
    Promise.all([
      this.getCurrentLocation(),
      this.loadCategories(),
      this.loadRecommendMerchants(),
      currentMerchant.id ? this.loadMerchantProducts(currentMerchant.id, true) : Promise.resolve()
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 关闭位置提示
  closeLocationTip() {
    this.setData({ showLocationTip: false });
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '发现身边好商户，享受便民团购服务',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-index.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '团购小程序 - 让团购更简单',
      imageUrl: '/assets/images/share-timeline.png'
    };
  }
});