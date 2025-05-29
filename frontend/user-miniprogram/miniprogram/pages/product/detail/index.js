// pages/product/detail/index.js - 微信小程序兼容版
import { get, post } from '../../../utils/request';
import { apiPath, formatUrl } from '../../../config/api';
import { checkLoginStatus } from '../../../utils/auth';
import { getLocation } from '../../../utils/location';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 基础数据
    productId: null,
    product: null,
    loading: true,
    loadStartTime: null,
    
    // 商品图片轮播
    currentImageIndex: 0,
    previewImages: [],
    imageLoadErrors: {},
    
    // 规格选择
    selectedSpecs: {},
    showSpecPanel: false,
    specMode: 'buy', // 'buy' | 'cart'
    selectedQuantity: 1,
    
    // 用户相关
    isFavorite: false,
    userLocation: null,
    
    // 团购信息
    activeGroups: [],
    showGroupPanel: false,
    
    // 评价信息
    reviews: [],
    reviewStats: null,
    showAllReviews: false,
    
    // 相关商品
    relatedProducts: [],
    
    // UI状态
    showSharePanel: false,
    cartCount: 0,
    
    // 商户信息
    merchant: null,
    deliveryInfo: null,
    
    // 悬浮购买栏
    showFloatingBar: false,
    
    // 加载状态跟踪
    loadingStates: {
      product: false,
      reviews: false,
      groups: false,
      related: false
    },
    
    // 默认商品数据，防止页面崩溃
    defaultProduct: {
      id: 0,
      name: '加载中...',
      current_price: 0,
      original_price: 0,
      stock: 0,
      sales: 0,
      description: '',
      thumbnail: '/assets/images/logo.png',
      status: 1
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    console.log('🛍️ 商品详情页加载，参数:', options);
    
    // 记录加载开始时间
    this.setData({ loadStartTime: Date.now() });
    
    if (!options.id) {
      this.showError('商品ID不能为空');
      return;
    }

    const productId = parseInt(options.id);
    if (isNaN(productId) || productId <= 0) {
      this.showError('商品ID格式错误');
      return;
    }

    this.setData({
      productId: productId,
      // 先设置默认数据，避免页面空白
      product: this.mergeObject({}, this.data.defaultProduct, { id: productId })
    });

    // 初始化页面
    this.initPage();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 更新购物车数量
    this.updateCartCount();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {
    // 页面渲染完成后进行性能监控
    setTimeout(() => {
      this.measurePagePerformance();
      this.validatePageData();
    }, 100);
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {
    console.log('🔄 下拉刷新商品详情');
    this.initPage().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面滚动事件
   */
  onPageScroll: function(e) {
    // 控制悬浮购买栏显示
    const showFloatingBar = e.scrollTop > 600;
    if (this.data.showFloatingBar !== showFloatingBar) {
      this.setData({ showFloatingBar: showFloatingBar });
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
    const { product } = this.data;
    return {
      title: product && product.name ? product.name : '精选好商品',
      path: `/pages/product/detail/index?id=${this.data.productId}`,
      imageUrl: product && product.thumbnail ? product.thumbnail : ''
    };
  },

  // ==================== 核心业务方法 ====================

  /**
   * 显示错误信息并返回
   */
  showError(message) {
    wx.showModal({
      title: '错误',
      content: message,
      showCancel: false,
      success: () => {
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      }
    });
  },

  /**
   * 初始化页面
   */
  async initPage() {
    console.log('🚀 开始初始化页面');
    
    try {
      // 显示加载状态
      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      // 并行加载基础数据
      await Promise.all([
        this.loadProductDetail(),
        this.getCurrentLocation(),
        this.updateCartCount()
      ]);

      // 异步加载其他数据
      this.loadAdditionalDataSafely();

    } catch (error) {
      console.error('❌ 页面初始化失败', error);
      
      // 显示错误，但提供重试选项
      wx.showModal({
        title: '加载失败',
        content: '商品信息加载失败，是否重试？',
        success: (res) => {
          if (res.confirm) {
            this.initPage(); // 重试
          } else {
            wx.navigateBack();
          }
        }
      });
    } finally {
      wx.hideLoading();
      this.setData({ loading: false });
    }
  },

  /**
   * 加载商品详情 - 核心方法
   */
  async loadProductDetail() {
    try {
      const { productId } = this.data;
      console.log('📦 加载商品详情，ID:', productId);

      // 更新加载状态
      this.setData({ 
        'loadingStates.product': true 
      });

      const product = await get(
        formatUrl(apiPath.product.detail, { id: productId })
      );

      console.log('📦 原始商品数据:', JSON.stringify(product, null, 2));
      console.log('📦 商品数据类型:', typeof product);

      // 验证商品数据
      if (!product || !product.id) {
        throw new Error('商品数据无效');
      }

      console.log('📦 商品字段检查:', {
        name: product.name,
        current_price: product.current_price,
        original_price: product.original_price,
        thumbnail: product.thumbnail,
        images: product.images,
        description: product.description,
        stock: product.stock,
        status: product.status
      });

      // 🔧 关键修复：处理商品图片数据
      const previewImages = this.processProductImages(product);
      console.log('🖼️ 处理后的图片列表:', previewImages);

      // 🔧 数据安全处理
      const processedProduct = this.processProductData(product);

      // 设置页面标题
      if (processedProduct.name) {
        wx.setNavigationBarTitle({
          title: processedProduct.name
        });
      }

      // 更新页面数据
      this.safeSetData({
        product: processedProduct,
        previewImages: previewImages,
        isFavorite: processedProduct.is_favorite || false,
        merchant: processedProduct.merchant || null,
        'loadingStates.product': false
      });

      console.log('✅ 商品详情设置完成');
      console.log('📊 页面数据状态:', {
        productSet: !!this.data.product,
        previewImagesCount: this.data.previewImages.length,
        productName: this.data.product && this.data.product.name ? this.data.product.name : 'N/A'
      });

      // 如果有商户信息，计算配送费
      if (processedProduct.merchant_id) {
        this.calculateDeliveryFee(processedProduct.merchant_id);
      }

    } catch (error) {
      console.error('❌ 加载商品详情失败', error);
      console.error('❌ 错误详情:', {
        message: error.message,
        stack: error.stack,
        productId: this.data.productId
      });
      
      this.setData({ 'loadingStates.product': false });
      throw error;
    }
  },

  /**
   * 🔧 处理商品数据 - 数据标准化和安全处理
   */
  processProductData(rawProduct) {
    return {
      id: rawProduct.id || 0,
      name: rawProduct.name || '商品名称',
      description: rawProduct.description || '',
      detail_description: rawProduct.detail_description || rawProduct.detail || '',
      thumbnail: rawProduct.thumbnail || '/assets/images/logo.png',
      current_price: this.safeNumber(rawProduct.current_price, 0),
      original_price: this.safeNumber(rawProduct.original_price, 0),
      group_price: rawProduct.group_price ? this.safeNumber(rawProduct.group_price, 0) : null,
      stock: this.safeNumber(rawProduct.stock, 0),
      unit: rawProduct.unit || '件',
      sales: this.safeNumber(rawProduct.sales, 0),
      views: this.safeNumber(rawProduct.views, 0),
      status: this.safeNumber(rawProduct.status, 1),
      is_hot: Boolean(rawProduct.is_hot),
      is_new: Boolean(rawProduct.is_new),
      is_recommend: Boolean(rawProduct.is_recommend),
      is_favorite: Boolean(rawProduct.is_favorite),
      has_group: Boolean(rawProduct.has_group),
      merchant_id: rawProduct.merchant_id || null,
      merchant_name: rawProduct.merchant_name || '',
      merchant: rawProduct.merchant || null,
      images: Array.isArray(rawProduct.images) ? rawProduct.images : [],
      specifications: Array.isArray(rawProduct.specifications) ? rawProduct.specifications : [],
      categories: Array.isArray(rawProduct.categories) ? rawProduct.categories : [],
      parameters: Array.isArray(rawProduct.parameters) ? rawProduct.parameters : [],
      detail_images: Array.isArray(rawProduct.detail_images) ? rawProduct.detail_images : [],
      favorite_count: this.safeNumber(rawProduct.favorite_count, 0),
      created_at: rawProduct.created_at,
      updated_at: rawProduct.updated_at
    };
  },

  /**
   * 🔧 处理商品图片 - 兼容不同字段名
   */
  processProductImages(product) {
    const images = [];
    
    // 添加缩略图
    if (product.thumbnail) {
      images.push(product.thumbnail);
    }
    
    // 🚨 关键修复：处理商品图片数组，同时支持 url 和 image_url 字段
    if (product.images && Array.isArray(product.images)) {
      for (let i = 0; i < product.images.length; i++) {
        const img = product.images[i];
        let imageUrl = null;
        
        if (typeof img === 'string') {
          imageUrl = img;
        } else if (img && (img.url || img.image_url)) {
          // 🔧 修复：同时支持 url 和 image_url 字段
          imageUrl = img.url || img.image_url;
        }
        
        if (imageUrl && images.indexOf(imageUrl) === -1) {
          images.push(imageUrl);
        } else if (!imageUrl) {
          console.warn('⚠️ 无效的图片数据:', img);
        }
      }
    }
    
    // 如果没有图片，使用默认图片
    if (images.length === 0) {
      images.push('/assets/images/logo.png');
    }
    
    return images;
  },

  /**
   * 获取当前位置
   */
  async getCurrentLocation() {
    try {
      const location = await getLocation();
      this.setData({ userLocation: location });
      console.log('📍 获取位置成功:', location);
    } catch (error) {
      console.warn('⚠️ 获取位置失败', error);
    }
  },

  /**
   * 计算配送费
   */
  async calculateDeliveryFee(merchantId) {
    try {
      const { userLocation } = this.data;
      if (!userLocation) return;

      // 简化处理，设置默认配送信息
      const deliveryInfo = {
        fee: 0, // 假设免配送费
        time: '30-45分钟',
        distance: '2.5km'
      };

      this.setData({ deliveryInfo: deliveryInfo });
    } catch (error) {
      console.error('计算配送费失败', error);
    }
  },

  /**
   * 🔧 安全加载额外数据
   */
  async loadAdditionalDataSafely() {
    // 并行加载，每个都有独立的错误处理
    const tasks = [
      this.loadActiveGroupsSafe(),
      this.loadProductReviewsSafe(), 
      this.loadRelatedProductsSafe()
    ];

    // 使用 Promise.allSettled 确保部分失败不影响其他功能
    const results = await Promise.allSettled(tasks);
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const taskNames = ['团购', '评价', '相关商品'];
      if (result.status === 'rejected') {
        console.warn(`⚠️ ${taskNames[i]}加载失败:`, result.reason);
      }
    }
  },

  /**
   * 🔧 安全加载活跃团购
   */
  async loadActiveGroupsSafe() {
    try {
      const { productId } = this.data;
      console.log('🎯 加载活跃团购...');
      
      this.setData({ 'loadingStates.groups': true });
      
      const result = await get(apiPath.group.list, {
        product_id: productId,
        status: 1, // 进行中的团购
        page_size: 5
      });

      // 🔧 安全处理返回数据
      const items = (result && result.data && result.data.items) || (result && result.items) || [];
      
      this.setData({
        activeGroups: Array.isArray(items) ? items : [],
        'loadingStates.groups': false
      });

      console.log(`🎯 加载到 ${items.length} 个活跃团购`);
    } catch (error) {
      console.error('❌ 加载团购信息失败', error);
      this.setData({ 
        activeGroups: [],
        'loadingStates.groups': false
      });
    }
  },

  /**
   * 🔧 安全加载商品评价
   */
  async loadProductReviewsSafe() {
    try {
      const { productId } = this.data;
      console.log('⭐ 加载商品评价...');

      this.setData({ 'loadingStates.reviews': true });

      // 并行获取评价统计和列表
      const [statsResult, reviewsResult] = await Promise.allSettled([
        get(formatUrl(apiPath.review.product, { id: productId })),
        get(apiPath.review.list, {
          product_id: productId,
          page_size: 5
        })
      ]);

      // 🔧 安全处理评价统计数据
      let reviewStats = {
        total_count: 0,
        average_rating: 0,
        rating_distribution: []
      };

      if (statsResult.status === 'fulfilled') {
        const stats = statsResult.value;
        reviewStats = {
          total_count: this.safeNumber(stats.total_count, 0),
          average_rating: this.safeNumber(stats.average_rating, 0),
          rating_distribution: Array.isArray(stats.rating_distribution) ? stats.rating_distribution : []
        };
      } else {
        console.warn('⚠️ 获取评价统计失败:', statsResult.reason);
      }

      // 🔧 安全处理评价列表数据
      let reviews = [];
      if (reviewsResult.status === 'fulfilled') {
        const reviewData = reviewsResult.value;
        reviews = (reviewData && reviewData.data && reviewData.data.items) || (reviewData && reviewData.items) || [];
      } else {
        console.warn('⚠️ 获取评价列表失败:', reviewsResult.reason);
      }

      this.setData({
        reviewStats: reviewStats,
        reviews: Array.isArray(reviews) ? reviews : [],
        'loadingStates.reviews': false
      });

      console.log(`⭐ 加载评价: ${reviewStats.total_count} 条评价，平均 ${reviewStats.average_rating} 分`);
    } catch (error) {
      console.error('❌ 加载评价失败', error);
      // 设置默认值
      this.setData({
        reviewStats: { total_count: 0, average_rating: 0, rating_distribution: [] },
        reviews: [],
        'loadingStates.reviews': false
      });
    }
  },

  /**
   * 🔧 安全加载相关商品
   */
  async loadRelatedProductsSafe() {
    try {
      const { productId } = this.data;
      console.log('🔗 加载相关商品...');
      
      this.setData({ 'loadingStates.related': true });
      
      const result = await get(
        formatUrl(apiPath.product.related, { id: productId }),
        { limit: 6 }
      );

      // 🔧 安全处理相关商品数据
      let relatedProducts = [];
      
      if (Array.isArray(result)) {
        relatedProducts = result;
      } else if (result && result.data && Array.isArray(result.data)) {
        relatedProducts = result.data;
      } else if (result && result.items && Array.isArray(result.items)) {
        relatedProducts = result.items;
      }

      // 过滤掉无效数据
      const validProducts = [];
      for (let i = 0; i < relatedProducts.length; i++) {
        const product = relatedProducts[i];
        if (product && product.id && product.name) {
          validProducts.push(product);
        }
      }

      this.setData({ 
        relatedProducts: validProducts,
        'loadingStates.related': false
      });
      
      console.log(`🔗 加载到 ${validProducts.length} 个相关商品`);
    } catch (error) {
      console.error('❌ 加载相关商品失败', error);
      this.setData({ 
        relatedProducts: [],
        'loadingStates.related': false
      });
    }
  },

  /**
   * 更新购物车数量
   */
  updateCartCount() {
    try {
      const cart = wx.getStorageSync('cart') || [];
      let count = 0;
      for (let i = 0; i < cart.length; i++) {
        count += cart[i].quantity || 0;
      }
      this.setData({ cartCount: count });
    } catch (error) {
      console.error('更新购物车数量失败', error);
    }
  },

  // ==================== 用户交互处理 ====================

  /**
   * 图片轮播变化
   */
  onImageChange(e) {
    this.setData({
      currentImageIndex: e.detail.current
    });
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { index } = e.currentTarget.dataset;
    const { previewImages } = this.data;
    
    wx.previewImage({
      current: previewImages[index],
      urls: previewImages
    });
  },

  /**
   * 🔧 图片加载错误处理
   */
  onImageLoadError(e) {
    const { src } = e.detail;
    console.warn('📸 图片加载失败:', src);
    
    // 记录错误
    const imageLoadErrors = this.mergeObject({}, this.data.imageLoadErrors);
    imageLoadErrors[src] = true;
    this.setData({ imageLoadErrors: imageLoadErrors });
  },

  /**
   * 图片加载成功处理
   */
  onImageLoad(e) {
    const { src } = e.detail;
    console.log('📸 图片加载成功:', src);
  },

  /**
   * 收藏/取消收藏
   */
  async toggleFavorite() {
    if (!checkLoginStatus()) return;

    try {
      const { productId, isFavorite } = this.data;
      
      await post(formatUrl('/users/favorites/{product_id}', { product_id: productId }));
      
      this.setData({ isFavorite: !isFavorite });
      
      wx.showToast({
        title: !isFavorite ? '收藏成功' : '取消收藏',
        icon: 'success'
      });
    } catch (error) {
      console.error('收藏操作失败', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 显示规格选择面板
   */
  showSpecSelector(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({
      showSpecPanel: true,
      specMode: mode || 'buy'
    });
  },

  /**
   * 隐藏规格选择面板
   */
  hideSpecPanel() {
    this.setData({ showSpecPanel: false });
  },

  /**
   * 选择规格
   */
  selectSpec(e) {
    const { specId, optionId } = e.currentTarget.dataset;
    const selectedSpecs = this.mergeObject({}, this.data.selectedSpecs);
    
    selectedSpecs[specId] = optionId;
    this.setData({ selectedSpecs: selectedSpecs });
  },

  /**
   * 修改数量
   */
  changeQuantity(e) {
    const { type } = e.currentTarget.dataset;
    let { selectedQuantity } = this.data;
    const { product } = this.data;
    
    if (type === 'minus' && selectedQuantity > 1) {
      selectedQuantity--;
    } else if (type === 'plus' && selectedQuantity < (product && product.stock ? product.stock : 999)) {
      selectedQuantity++;
    }
    
    this.setData({ selectedQuantity: selectedQuantity });
  },

  /**
   * 输入数量
   */
  inputQuantity(e) {
    const value = parseInt(e.detail.value) || 1;
    const { product } = this.data;
    const maxStock = product && product.stock ? product.stock : 999;
    
    const selectedQuantity = Math.min(Math.max(value, 1), maxStock);
    this.setData({ selectedQuantity: selectedQuantity });
  },

  /**
   * 立即购买
   */
  async buyNow() {
    if (!checkLoginStatus()) return;

    const { product, selectedSpecs, selectedQuantity } = this.data;
    
    // 检查库存
    if (product.stock < selectedQuantity) {
      wx.showToast({
        title: '库存不足',
        icon: 'none'
      });
      return;
    }

    // 构建订单数据
    const orderData = {
      items: [{
        product_id: product.id,
        quantity: selectedQuantity,
        specifications: selectedSpecs
      }]
    };

    // 跳转到订单确认页
    wx.navigateTo({
      url: `/pages/order/create/index?data=${encodeURIComponent(JSON.stringify(orderData))}`
    });
  },

  /**
   * 加入购物车
   */
  async addToCart() {
    const { product, selectedSpecs, selectedQuantity } = this.data;
    
    try {
      // 获取当前购物车
      let cart = wx.getStorageSync('cart') || [];
      
      // 构建商品项
      const cartItem = {
        product_id: product.id,
        product_name: product.name,
        product_image: product.thumbnail,
        product_price: product.current_price,
        merchant_id: product.merchant_id,
        merchant_name: product.merchant_name,
        quantity: selectedQuantity,
        specifications: selectedSpecs,
        added_time: Date.now()
      };

      // 检查是否已存在相同规格的商品
      let existingIndex = -1;
      for (let i = 0; i < cart.length; i++) {
        if (cart[i].product_id === product.id && 
            JSON.stringify(cart[i].specifications) === JSON.stringify(selectedSpecs)) {
          existingIndex = i;
          break;
        }
      }

      if (existingIndex >= 0) {
        // 更新数量
        cart[existingIndex].quantity += selectedQuantity;
      } else {
        // 添加新商品
        cart.push(cartItem);
      }

      // 保存购物车
      wx.setStorageSync('cart', cart);
      
      // 更新购物车数量显示
      this.updateCartCount();
      
      // 隐藏规格面板
      this.hideSpecPanel();
      
      wx.showToast({
        title: '已加入购物车',
        icon: 'success'
      });

    } catch (error) {
      console.error('加入购物车失败', error);
      wx.showToast({
        title: '加入购物车失败',
        icon: 'none'
      });
    }
  },

  /**
   * 参与团购
   */
  joinGroup(e) {
    if (!checkLoginStatus()) return;

    const { groupId } = e.currentTarget.dataset;
    
    if (!groupId || groupId <= 0) {
      console.warn('⚠️ 无效的团购ID:', groupId);
      return;
    }
    
    wx.navigateTo({
      url: `/pages/group/detail/index?id=${groupId}`,
      fail: (err) => {
        console.error('跳转团购详情失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 查看所有评价
   */
  viewAllReviews() {
    const { productId } = this.data;
    
    if (!productId || productId <= 0) {
      console.warn('⚠️ 无效的商品ID，无法查看评价');
      return;
    }
    
    wx.navigateTo({
      url: `/pages/review/list/index?product_id=${productId}`,
      fail: (err) => {
        console.error('跳转评价列表失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 查看商户
   */
  viewMerchant() {
    const { product } = this.data;
    if (product && product.merchant_id) {
      wx.navigateTo({
        url: `/pages/merchant/detail/index?id=${product.merchant_id}`,
        fail: (err) => {
          console.error('跳转商户详情失败:', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    }
  },

  /**
   * 查看相关商品
   */
  viewRelatedProduct(e) {
    const { productId } = e.currentTarget.dataset;
    
    if (!productId || productId <= 0) {
      console.warn('⚠️ 无效的相关商品ID:', productId);
      return;
    }
    
    console.log('🔗 点击相关商品:', productId);
    
    wx.redirectTo({
      url: `/pages/product/detail/index?id=${productId}`,
      fail: (err) => {
        console.error('跳转相关商品失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 跳转购物车
   */
  goToCart() {
    wx.switchTab({
      url: '/pages/cart/index'
    });
  },

  /**
   * 客服咨询
   */
  contactService() {
    wx.showModal({
      title: '客服咨询',
      content: '是否要联系商户客服？',
      success: (res) => {
        if (res.confirm) {
          // 这里可以集成客服功能
          wx.showToast({
            title: '客服功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 显示分享面板
   */
  showShare() {
    this.setData({ showSharePanel: true });
  },

  /**
   * 隐藏分享面板
   */
  hideShare() {
    this.setData({ showSharePanel: false });
  },

  /**
   * 生成商品海报
   */
  async generatePoster() {
    wx.showLoading({
      title: '生成中...',
      mask: true
    });

    try {
      // 这里可以调用海报生成接口
      setTimeout(() => {
        wx.hideLoading();
        wx.showToast({
          title: '海报生成功能开发中',
          icon: 'none'
        });
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '生成失败',
        icon: 'none'
      });
    }
  },

  // ==================== 工具方法 ====================

  /**
   * 🔧 安全的数字转换
   */
  safeNumber(value, defaultValue) {
    defaultValue = defaultValue || 0;
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return defaultValue;
    }
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  },

  /**
   * 🔧 对象合并工具函数 - 替代Object.assign
   */
  mergeObject(target) {
    for (let i = 1; i < arguments.length; i++) {
      const source = arguments[i];
      if (source) {
        for (const key in source) {
          if (source.hasOwnProperty(key)) {
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  },

  /**
   * 格式化价格
   */
  formatPrice(price) {
    const safePrice = this.safeNumber(price, 0);
    return safePrice.toFixed(2);
  },

  /**
   * 格式化销量
   */
  formatSales(sales) {
    const safeSales = this.safeNumber(sales, 0);
    if (safeSales >= 10000) {
      return `${(safeSales / 10000).toFixed(1)}万`;
    }
    return safeSales;
  },

  /**
   * 获取规格描述
   */
  getSpecDescription() {
    const { product, selectedSpecs } = this.data;
    if (!product || !product.specifications || !selectedSpecs || this.getObjectKeys(selectedSpecs).length === 0) {
      return '请选择规格';
    }

    const descriptions = [];
    for (let i = 0; i < product.specifications.length; i++) {
      const spec = product.specifications[i];
      const selectedOptionId = selectedSpecs[spec.id];
      if (selectedOptionId) {
        for (let j = 0; j < spec.options.length; j++) {
          const option = spec.options[j];
          if (option.id === selectedOptionId) {
            descriptions.push(option.name);
            break;
          }
        }
      }
    }

    return descriptions.length > 0 ? descriptions.join('，') : '请选择规格';
  },

  /**
   * 获取对象的键数组 - 替代Object.keys
   */
  getObjectKeys(obj) {
    const keys = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    return keys;
  },

  /**
   * 检查是否可以购买
   */
  canBuy() {
    const { product, selectedQuantity } = this.data;
    return product && product.stock >= selectedQuantity && product.status === 1;
  },

  /**
   * 🔧 安全的数据更新 - 兼容版本
   */
  safeSetData(data, callback) {
    try {
      this.setData(data, callback);
    } catch (error) {
      console.error('❌ 数据更新失败:', error);
      // 尝试分批更新
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          try {
            const singleUpdate = {};
            singleUpdate[key] = data[key];
            this.setData(singleUpdate);
          } catch (e) {
            console.error(`❌ 更新字段 ${key} 失败:`, e);
          }
        }
      }
    }
  },

  /**
   * 🔧 页面数据验证
   */
  validatePageData() {
    const { product, previewImages, loading } = this.data;
    
    // 检查基本数据完整性
    const validations = [
      {
        condition: !loading && !product,
        message: '商品数据未加载',
        severity: 'error'
      },
      {
        condition: product && !product.name,
        message: '商品名称缺失',
        severity: 'warning'
      },
      {
        condition: product && (product.current_price === undefined || product.current_price === null),
        message: '商品价格缺失',
        severity: 'warning'
      },
      {
        condition: !previewImages || previewImages.length === 0,
        message: '商品图片缺失',
        severity: 'warning'
      }
    ];
    
    const errors = [];
    for (let i = 0; i < validations.length; i++) {
      if (validations[i].condition) {
        errors.push(validations[i]);
      }
    }
    
    if (errors.length > 0) {
      console.warn('📊 页面数据验证结果:', errors);
    }
    
    return errors;
  },

  /**
   * 🔧 页面性能监控
   */
  measurePagePerformance() {
    const performance = {
      loadStartTime: this.data.loadStartTime || Date.now(),
      loadEndTime: Date.now(),
      loadDuration: (Date.now() - (this.data.loadStartTime || Date.now())),
      imageCount: this.data.previewImages ? this.data.previewImages.length : 0,
      hasReviews: !!(this.data.reviews && this.data.reviews.length),
      hasGroups: !!(this.data.activeGroups && this.data.activeGroups.length),
      hasRelated: !!(this.data.relatedProducts && this.data.relatedProducts.length)
    };
    
    console.log('⚡ 页面性能监控:', performance);
    return performance;
  }
});