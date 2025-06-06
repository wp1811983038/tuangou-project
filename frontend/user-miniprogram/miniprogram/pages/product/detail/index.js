// pages/product/detail/index.js - 完整的商品详情页
import { get, post } from '../../../utils/request';
import { apiPath, formatUrl } from '../../../config/api';
import { checkLoginStatus } from '../../../utils/auth';
import { getLocation } from '../../../utils/location';

Page({
  data: {
    // 商品基本信息
    productId: null,
    product: null,
    loading: true,
    
    // 商品图片轮播
    currentImageIndex: 0,
    
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
    
    // 预览模式
    previewImages: []
  },

  onLoad: function(options) {
    console.log('🛍️ 商品详情页加载，参数:', options);
    
    if (!options.id) {
      wx.showToast({
        title: '商品ID不能为空',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      productId: parseInt(options.id)
    });

    // 初始化页面
    this.initPage();
  },

  onShow: function() {
    // 更新购物车数量
    this.updateCartCount();
  },

  onPageScroll: function(e) {
    // 控制悬浮购买栏显示
    const showFloatingBar = e.scrollTop > 600;
    if (this.data.showFloatingBar !== showFloatingBar) {
      this.setData({ showFloatingBar });
    }
  },

  onShareAppMessage: function() {
    const { product } = this.data;
    return {
      title: product?.name || '精选好商品',
      path: `/pages/product/detail/index?id=${this.data.productId}`,
      imageUrl: product?.thumbnail || ''
    };
  },

  onPullDownRefresh: function() {
    this.initPage().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 初始化页面
  async initPage() {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      // 并行加载数据
      await Promise.all([
        this.loadProductDetail(),
        this.getCurrentLocation(),
        this.updateCartCount()
      ]);

      // 加载其他数据
      await Promise.all([
        this.loadActiveGroups(),
        this.loadProductReviews(),
        this.loadRelatedProducts()
      ]);

    } catch (error) {
      console.error('❌ 页面初始化失败', error);
      wx.showToast({
        title: '页面加载失败',
        icon: 'none'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    } finally {
      wx.hideLoading();
      this.setData({ loading: false });
    }
  },

  // 加载商品详情
  async loadProductDetail() {
    try {
      const { productId } = this.data;
      console.log('📦 加载商品详情，ID:', productId);

      const product = await get(
        formatUrl(apiPath.product.detail, { id: productId })
      );

      console.log('✅ 商品详情加载成功:', product.name);

      // 处理商品数据
      const processedProduct = this.processProductData(product);

      // 处理商品图片
      const previewImages = [
        processedProduct.thumbnail,
        ...(processedProduct.images || []).map(img => img.url)
      ].filter(Boolean);

      // 设置页面标题
      wx.setNavigationBarTitle({
        title: processedProduct.name || '商品详情'
      });

      this.setData({
        product: processedProduct,
        previewImages,
        isFavorite: processedProduct.is_favorite || false,
        merchant: processedProduct.merchant || null
      });

      // 如果有商户信息，计算配送费
      if (processedProduct.merchant_id) {
        this.calculateDeliveryFee(processedProduct.merchant_id);
      }

    } catch (error) {
      console.error('❌ 加载商品详情失败', error);
      throw error;
    }
  },

  // 处理商品数据
  processProductData(rawProduct) {
    const processed = { ...rawProduct };
    
    // 价格数据处理和容错
    console.log('🔧 处理价格数据:', {
      current_price: rawProduct.current_price,
      price: rawProduct.price,
      original_price: rawProduct.original_price,
      group_price: rawProduct.group_price
    });

    // 确保价格字段存在且为数字
    processed.current_price = this.ensureNumberField(rawProduct.current_price, rawProduct.price, 0);
    processed.original_price = this.ensureNumberField(rawProduct.original_price, null, processed.current_price);
    processed.group_price = this.ensureNumberField(rawProduct.group_price, null, null);
    
    // 预计算折扣显示
    processed.discount_display = this.calculateDiscount(processed.original_price, processed.current_price);
    
    // 其他字段容错处理
    processed.name = rawProduct.name || '商品名称';
    processed.description = rawProduct.description || '';
    processed.stock = parseInt(rawProduct.stock) || 0;
    processed.sales = parseInt(rawProduct.sales) || 0;
    processed.status = parseInt(rawProduct.status) || 1;
    
    // 布尔字段处理
    processed.is_hot = Boolean(rawProduct.is_hot);
    processed.is_new = Boolean(rawProduct.is_new);
    processed.is_recommend = Boolean(rawProduct.is_recommend);
    processed.is_favorite = Boolean(rawProduct.is_favorite);

    console.log('✅ 价格处理结果:', {
      current_price: processed.current_price,
      original_price: processed.original_price,
      group_price: processed.group_price,
      discount_display: processed.discount_display
    });

    return processed;
  },

  // 确保数字字段的辅助方法
  ensureNumberField(primary, fallback, defaultValue) {
    // 尝试主要字段
    if (primary !== null && primary !== undefined && !isNaN(primary)) {
      const num = parseFloat(primary);
      if (num >= 0) return num;
    }
    
    // 尝试备用字段
    if (fallback !== null && fallback !== undefined && !isNaN(fallback)) {
      const num = parseFloat(fallback);
      if (num >= 0) return num;
    }
    
    // 返回默认值
    return defaultValue;
  },

  // 获取当前位置
  async getCurrentLocation() {
    try {
      const location = await getLocation();
      this.setData({ userLocation: location });
      console.log('📍 获取位置成功:', location);
    } catch (error) {
      console.warn('⚠️ 获取位置失败', error);
    }
  },

  // 计算配送费
  async calculateDeliveryFee(merchantId) {
    try {
      const { userLocation } = this.data;
      if (!userLocation) return;

      // 简化处理，使用默认配送信息
      const deliveryInfo = {
        fee: 0,
        time: '30-45分钟',
        distance: '2.5km'
      };

      this.setData({ deliveryInfo });
    } catch (error) {
      console.error('计算配送费失败', error);
    }
  },

  // 加载活跃团购
  async loadActiveGroups() {
    try {
      const { productId } = this.data;
      
      const result = await get(apiPath.group.list, {
        product_id: productId,
        status: 1,
        page_size: 5
      });

      this.setData({
        activeGroups: result.data?.items || []
      });

      console.log(`🎯 加载到 ${result.data?.items?.length || 0} 个活跃团购`);
    } catch (error) {
      console.error('加载团购信息失败', error);
    }
  },

  // 加载商品评价
  async loadProductReviews() {
    try {
      const { productId } = this.data;

      // 获取评价统计
      const reviewStats = await get(
        formatUrl(apiPath.review.product, { id: productId })
      );

      // 获取评价列表
      const reviewsResult = await get(apiPath.review.list, {
        product_id: productId,
        page_size: 5
      });

      // 处理评价数据，添加星级显示
      const processedReviews = this.processReviewData(reviewsResult.data?.items || []);

      this.setData({
        reviewStats,
        reviews: processedReviews
      });

      console.log(`⭐ 加载评价: ${reviewStats.total_count} 条评价，平均 ${reviewStats.average_rating} 分`);
    } catch (error) {
      console.error('加载评价失败', error);
    }
  },

  // 处理评价数据
  processReviewData(reviews) {
    if (!Array.isArray(reviews)) return [];
    
    return reviews.map(review => ({
      ...review,
      star_display: this.generateStarDisplay(review.rating)
    }));
  },

  // 生成星级显示
  generateStarDisplay(rating) {
    if (!rating || rating < 1) return '☆☆☆☆☆';
    
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;
    
    return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
  },

  // 加载相关商品
  async loadRelatedProducts() {
    try {
      const { productId } = this.data;
      
      const relatedProducts = await get(
        formatUrl(apiPath.product.related, { id: productId }),
        { limit: 6 }
      );

      this.setData({ relatedProducts });
      console.log(`🔗 加载到 ${relatedProducts.length} 个相关商品`);
    } catch (error) {
      console.error('加载相关商品失败', error);
    }
  },

  // 更新购物车数量
  updateCartCount() {
    try {
      const cart = wx.getStorageSync('cart') || [];
      const count = cart.reduce((total, item) => total + item.quantity, 0);
      this.setData({ cartCount: count });
    } catch (error) {
      console.error('更新购物车数量失败', error);
    }
  },

  // 图片轮播变化
  onImageChange(e) {
    this.setData({
      currentImageIndex: e.detail.current
    });
  },

  // 预览图片
  previewImage(e) {
    const { index } = e.currentTarget.dataset;
    const { previewImages } = this.data;
    
    wx.previewImage({
      current: previewImages[index],
      urls: previewImages
    });
  },

  // 收藏/取消收藏
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

  // 显示规格选择面板
  showSpecSelector(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({
      showSpecPanel: true,
      specMode: mode || 'buy'
    });
  },

  // 隐藏规格选择面板
  hideSpecPanel() {
    this.setData({ showSpecPanel: false });
  },

  // 选择规格
  selectSpec(e) {
    const { specId, optionId } = e.currentTarget.dataset;
    const { selectedSpecs } = this.data;
    
    selectedSpecs[specId] = optionId;
    this.setData({ selectedSpecs });
  },

  // 修改数量
  changeQuantity(e) {
    const { type } = e.currentTarget.dataset;
    let { selectedQuantity } = this.data;
    const { product } = this.data;
    
    if (type === 'minus' && selectedQuantity > 1) {
      selectedQuantity--;
    } else if (type === 'plus' && selectedQuantity < (product?.stock || 999)) {
      selectedQuantity++;
    }
    
    this.setData({ selectedQuantity });
  },

  // 输入数量
  inputQuantity(e) {
    const value = parseInt(e.detail.value) || 1;
    const { product } = this.data;
    const maxStock = product?.stock || 999;
    
    const selectedQuantity = Math.min(Math.max(value, 1), maxStock);
    this.setData({ selectedQuantity });
  },

  // 立即购买
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

  // 加入购物车
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
      const existingIndex = cart.findIndex(item => 
        item.product_id === product.id && 
        JSON.stringify(item.specifications) === JSON.stringify(selectedSpecs)
      );

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

  // 参与团购
  joinGroup(e) {
    if (!checkLoginStatus()) return;

    const { groupId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/group/detail/index?id=${groupId}`
    });
  },

  // 查看所有评价
  viewAllReviews() {
    const { productId } = this.data;
    wx.navigateTo({
      url: `/pages/review/list/index?product_id=${productId}`
    });
  },

  // 查看商户
  viewMerchant() {
    const { product } = this.data;
    if (product?.merchant_id) {
      wx.navigateTo({
        url: `/pages/merchant/detail/index?id=${product.merchant_id}`
      });
    }
  },

  // 查看相关商品
  viewRelatedProduct(e) {
    const { productId } = e.currentTarget.dataset;
    wx.redirectTo({
      url: `/pages/product/detail/index?id=${productId}`
    });
  },

  // 跳转购物车
  goToCart() {
    wx.switchTab({
      url: '/pages/cart/index'
    });
  },

  // 客服咨询
  contactService() {
    wx.showModal({
      title: '客服咨询',
      content: '是否要联系商户客服？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '客服功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  // 显示分享面板
  showShare() {
    this.setData({ showSharePanel: true });
  },

  // 隐藏分享面板
  hideShare() {
    this.setData({ showSharePanel: false });
  },

  // 生成商品海报
  async generatePoster() {
    wx.showLoading({
      title: '生成中...',
      mask: true
    });

    try {
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

  // 返回上页
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  // 格式化价格
  formatPrice(price) {
    if (!price && price !== 0) return '0.00';
    const num = parseFloat(price);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  },

  // 格式化销量
  formatSales(sales) {
    const numSales = parseInt(sales) || 0;
    if (numSales === 0) return 0;
    if (numSales >= 10000) {
      return `${(numSales / 10000).toFixed(1)}万`;
    }
    return numSales;
  },

  // 计算折扣
  calculateDiscount(originalPrice, currentPrice) {
    if (!originalPrice || !currentPrice || currentPrice >= originalPrice) {
      return '';
    }
    
    const discount = Math.floor((1 - currentPrice / originalPrice) * 10);
    return discount > 0 ? discount : '';
  },

  // 获取规格描述
  getSpecDescription() {
    const { product, selectedSpecs } = this.data;
    if (!product?.specifications || Object.keys(selectedSpecs).length === 0) {
      return '请选择规格';
    }

    const descriptions = [];
    product.specifications.forEach(spec => {
      const selectedOptionId = selectedSpecs[spec.id];
      if (selectedOptionId) {
        const option = spec.options.find(opt => opt.id === selectedOptionId);
        if (option) {
          descriptions.push(option.name);
        }
      }
    });

    return descriptions.length > 0 ? descriptions.join('，') : '请选择规格';
  },

  // 检查是否可以购买
  canBuy() {
    const { product, selectedQuantity } = this.data;
    return product && product.stock >= selectedQuantity && product.status === 1;
  }
});