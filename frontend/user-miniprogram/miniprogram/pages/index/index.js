// pages/index/index.js
import { getLocation } from '../../utils/location';
import { get, post } from '../../utils/request';
import { apiPath } from '../../config/api';
import { checkLoginStatus } from '../../utils/auth';

Page({
  data: {
    location: null,                 // 用户位置
    inBoundaryMerchants: [],        // 在边界范围内的商户
    allMerchants: [],               // 所有商户
    hasNearbyMerchant: false,       // 是否有边界范围内的商户
    loading: false,                 // 主加载状态
    showLocationTip: false,         // 位置提示
    currentMerchant: {},            // 当前选中的商户
    showMerchantPanel: false,       // 是否显示商户面板
    
    // 商品相关数据
    products: [],                   // 商品列表
    loadingProducts: false,         // 商品加载状态
    productCategories: [            // 商品分类筛选
      { key: 'all', name: '全部', active: true },
      { key: 'recommend', name: '推荐', active: false },
      { key: 'hot', name: '热门', active: false },
      { key: 'new', name: '新品', active: false }
    ],
    currentCategory: 'all',         // 当前选中的分类
    hasMoreProducts: true,          // 是否还有更多商品
    productPage: 1,                 // 商品页码
    productPageSize: 10             // 每页商品数量
  },

  // 初始化标志
  merchantsLoading: false,          // 商户加载标志
  productLoadingKey: null,          // 商品加载防重复标志

  onLoad: function(options) {
    // 加载缓存的位置
    const cachedLocation = wx.getStorageSync('location');
    if (cachedLocation) {
      this.setData({ location: cachedLocation });
    }
    
    // 加载缓存的当前商户
    const currentMerchant = wx.getStorageSync('currentMerchant');
    if (currentMerchant) {
      this.setData({ currentMerchant });
    }
  },

  onReady: function() {
    // 页面渲染完成后再进行初始化
    wx.nextTick(() => {
      this.initializePage();
    });
  },

  onShow: function() {
    // 页面显示时检查是否需要重新获取位置
    if (!this.data.location) {
      setTimeout(() => {
        this.getCurrentLocation();
      }, 100);
    }
  },

  onUnload: function() {
    // 页面卸载时清理状态
    this.merchantsLoading = false;
    this.productLoadingKey = null;
  },

  // 初始化页面数据
  initializePage: function() {
    // 如果有缓存的商户，加载其商品
    const { currentMerchant } = this.data;
    if (currentMerchant && currentMerchant.id) {
      this.loadMerchantProducts(currentMerchant.id, true);
    }
    
    // 延迟获取位置，避免过早调用
    setTimeout(() => {
      this.getCurrentLocation();
    }, 300);
  },

  // 获取当前位置并检查商户边界
  async getCurrentLocation() {
    try {
      // 检查是否已经在加载中，避免重复调用
      if (this.data.loading) {
        return;
      }
      
      this.setData({ loading: true });
      
      // 添加延迟，确保小程序完全初始化
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const location = await getLocation();
      
      // 打印用户当前坐标
      console.log('========= 用户当前坐标 =========');
      console.log(`纬度(latitude): ${location.latitude}`);
      console.log(`经度(longitude): ${location.longitude}`);
      console.log('================================');
      
      // 更新位置信息
      this.setData({ 
        location,
        showLocationTip: false
      });
      
      // 存储位置到本地缓存
      try {
        wx.setStorageSync('location', location);
      } catch (e) {
        console.warn('存储位置信息失败', e);
      }
      
      // 获取位置后加载商户
      await this.loadMerchants(location);
    } catch (error) {
      console.error('获取位置失败', error);
      this.setData({ 
        showLocationTip: true,
        loading: false
      });
    }
  },
  
  // 加载商户数据
  async loadMerchants(location) {
    try {
      if (!location || !location.latitude || !location.longitude) {
        console.warn('位置信息不完整，跳过商户加载');
        this.setData({ loading: false });
        return;
      }
      
      // 防重复请求
      if (this.merchantsLoading) {
        return;
      }
      this.merchantsLoading = true;
      
      // 获取所有商户信息，包括边界信息
      const result = await get(apiPath.merchant.list, {
        limit: 100  // 获取足够数量的商户
      });
      
      const merchants = result.data?.items || [];
      
      console.log('========= 商户边界范围信息 =========');
      console.log(`获取到商户数量: ${merchants.length}`);
      
      // 处理商户数据，判断用户是否在边界内
      const allMerchants = merchants.map(merchant => {
        // 默认不在范围内
        let inRange = false;
        
        // 检查商户是否有完整的边界信息
        if (merchant.north_boundary && merchant.south_boundary && 
            merchant.east_boundary && merchant.west_boundary) {
          
          // 打印商户边界范围
          console.log(`\n商户ID: ${merchant.id}, 名称: ${merchant.name}`);
          console.log(`北边界(north): ${merchant.north_boundary}`);
          console.log(`南边界(south): ${merchant.south_boundary}`);
          console.log(`东边界(east): ${merchant.east_boundary}`);
          console.log(`西边界(west): ${merchant.west_boundary}`);
          
          // 判断用户位置是否在边界内
          inRange = this.isPointInBoundary(location, {
            north: merchant.north_boundary,
            south: merchant.south_boundary,
            east: merchant.east_boundary,
            west: merchant.west_boundary
          });
          
          console.log(`用户是否在该商户边界内: ${inRange ? '是' : '否'}`);
        }
        
        // 返回带有范围标记的商户
        return {
          ...merchant,
          inRange
        };
      });
      
      // 筛选边界内的商户
      const inBoundaryMerchants = allMerchants.filter(merchant => merchant.inRange);
      
      console.log(`\n用户在边界范围内的商户数量: ${inBoundaryMerchants.length}`);
      console.log('====================================');
      
      // 如果有缓存的当前商户，检查是否在边界内
      const { currentMerchant } = this.data;
      if (currentMerchant && currentMerchant.id) {
        // 在全部商户中找到当前商户并更新信息
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
      
      // 更新数据
      this.setData({
        allMerchants,
        inBoundaryMerchants,
        hasNearbyMerchant: inBoundaryMerchants.length > 0,
        loading: false
      });
      
    } catch (error) {
      console.error('加载商户数据失败', error);
      this.setData({ loading: false });
      
      // 显示用户友好的错误提示
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
      products: [],  // 清空商品列表
      currentCategory: 'all'  // 重置分类
    });
    
    // 重置分类状态
    const productCategories = this.data.productCategories.map(cat => ({
      ...cat,
      active: cat.key === 'all'
    }));
    this.setData({ productCategories });
    
    // 清除缓存的商户
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
    
    // 如果点击的是当前商户，关闭面板
    if (currentMerchant.id === id) {
      this.closeMerchantPanel();
      return;
    }
    
    // 查找选中的商户
    const selectedMerchant = allMerchants.find(item => item.id === id);
    if (selectedMerchant) {
      // 更新当前选中的商户
      this.setData({
        currentMerchant: selectedMerchant,
        showMerchantPanel: false
      });
      
      // 缓存选中的商户
      wx.setStorageSync('currentMerchant', selectedMerchant);
      
      // 提示用户已切换商户
      wx.showToast({
        title: '已切换到' + selectedMerchant.name,
        icon: 'success'
      });
      
      // 加载该商户的商品
      this.loadMerchantProducts(selectedMerchant.id, true);
      
      // 如果选中的商户不在服务范围内，提示用户
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
  
  // 加载商户商品
  async loadMerchantProducts(merchantId, reset = false) {
    if (!merchantId) {
      console.warn('商户ID不存在，跳过商品加载');
      return;
    }
    
    // 防重复请求
    const requestKey = `${merchantId}_${this.data.currentCategory}_${reset}`;
    if (this.productLoadingKey === requestKey) {
      return;
    }
    this.productLoadingKey = requestKey;
    
    try {
      // 如果是重置加载，重置分页和分类
      if (reset) {
        this.setData({
          productPage: 1,
          hasMoreProducts: true
        });
        
        // 如果是重置且分类不是当前选中的，则重置分类
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
      
      // 构建请求参数
      const params = {
        merchant_id: merchantId,
        page: this.data.productPage,
        page_size: this.data.productPageSize,
        status: 1  // 只获取上架商品
      };
      
      // 根据当前分类添加筛选条件
      const { currentCategory } = this.data;
      if (currentCategory === 'recommend') {
        params.is_recommend = true;
      } else if (currentCategory === 'hot') {
        params.is_hot = true;
      } else if (currentCategory === 'new') {
        params.is_new = true;
      }
      
      console.log('请求商品参数:', params);
      
      // 请求商品数据
      const result = await get(apiPath.product.list, params);
      const newProducts = result.data?.items || [];
      
      console.log(`获取到${newProducts.length}个商品`);
      
      // 更新商品列表
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
    
    // 如果点击的是当前分类，不做处理
    if (currentCategory === key) return;
    
    // 更新分类状态
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
    
    // 检查登录状态
    if (!checkLoginStatus()) {
      return;
    }
    
    try {
      // 调用收藏/取消收藏接口
      const result = await post(`/users/favorites/${productId}`, {}, {
        showLoading: false
      });
      
      // 更新本地数据
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
    
    // 检查登录状态
    if (!checkLoginStatus()) {
      return;
    }
    
    // 检查库存
    if (product.stock === 0) {
      wx.showToast({
        title: '商品暂时缺货',
        icon: 'none'
      });
      return;
    }
    
    // 检查商户服务范围
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
    
    // 检查是否有团购活动
    if (product.has_group && product.group_price) {
      wx.showModal({
        title: '发现团购活动',
        content: `该商品有团购活动，团购价¥${product.group_price}，是否查看团购详情？`,
        confirmText: '查看团购',
        cancelText: '直接购买',
        success: (res) => {
          if (res.confirm) {
            // 跳转到团购页面
            this.goToGroupPage(productId);
          } else {
            // 直接购买
            this.goToBuyPage(productId);
          }
        }
      });
    } else {
      // 直接购买
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

  // 添加到购物车
  async addToCart(product, quantity = 1) {
    try {
      // 检查登录状态
      if (!checkLoginStatus()) {
        return false;
      }
      
      // 获取当前购物车数据
      let cart = wx.getStorageSync('cart') || [];
      
      // 查找是否已存在该商品
      const existingIndex = cart.findIndex(item => 
        item.product_id === product.id && 
        item.merchant_id === product.merchant_id
      );
      
      if (existingIndex >= 0) {
        // 更新数量
        cart[existingIndex].quantity += quantity;
        cart[existingIndex].updated_at = new Date().getTime();
      } else {
        // 添加新商品
        cart.push({
          product_id: product.id,
          merchant_id: product.merchant_id,
          product_name: product.name,
          product_image: product.thumbnail,
          price: product.current_price,
          group_price: product.group_price,
          quantity: quantity,
          selected: true,
          created_at: new Date().getTime(),
          updated_at: new Date().getTime()
        });
      }
      
      // 保存到本地存储
      wx.setStorageSync('cart', cart);
      
      // 更新全局购物车数量
      const app = getApp();
      if (app) {
        const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        app.globalData.cartCount = totalCount;
      }
      
      wx.showToast({
        title: '已添加到购物车',
        icon: 'success'
      });
      
      return true;
      
    } catch (error) {
      console.error('添加到购物车失败', error);
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none'
      });
      return false;
    }
  },
  
  // 页面上拉触底事件的处理函数
  onReachBottom() {
    const { currentMerchant, hasMoreProducts, loadingProducts } = this.data;
    
    // 如果有选中商户、还有更多商品且不在加载中，则加载更多
    if (currentMerchant.id && hasMoreProducts && !loadingProducts) {
      this.loadMerchantProducts(currentMerchant.id, false);
    }
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    const { currentMerchant } = this.data;
    
    Promise.all([
      this.getCurrentLocation(),
      currentMerchant.id ? this.loadMerchantProducts(currentMerchant.id, true) : Promise.resolve()
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 关闭位置提示
  closeLocationTip() {
    this.setData({ showLocationTip: false });
  }
});