// pages/index/index.js
import { getLocation, getAvailableMerchants, isInMerchantServiceArea } from '../../utils/location';
import { checkLoginStatus } from '../../utils/auth';

Page({
  data: {
    banners: [],           // 轮播图
    merchants: [],         // 推荐商户
    groups: [],            // 热门团购
    products: [],          // 推荐商品
    categories: [],        // 商户分类
    location: null,        // 当前位置
    loading: true,         // 加载状态
    availableMerchants: [],// 可服务的商户列表
    hasServiceMerchant: false, // 是否有可服务商户
    refreshingLocation: false,  // 是否正在刷新位置
    showLocationTip: false      // 是否显示位置提示
  },

  onLoad: function(options) {
    // 加载缓存的位置
    const cachedLocation = wx.getStorageSync('location');
    if (cachedLocation) {
      this.setData({ location: cachedLocation });
    }
    
    // 加载页面数据
    this.loadPageData();
  },

  onShow: function() {
    // 检查登录状态但不强制跳转
    checkLoginStatus(false);
    
    // 获取当前位置
    this.getCurrentLocation();
  },

  // 加载页面数据
  loadPageData() {
    // 显示加载状态
    this.setData({ loading: true });
    
    // 加载轮播图
    this.loadBanners();
    
    // 加载分类
    this.loadCategories();
    
    // 加载热门团购
    this.loadGroups();
    
    // 加载推荐商品
    this.loadProducts();
  },

  // 获取当前位置并判断服务范围
// 在 pages/index/index.js 的 getCurrentLocation 方法中添加
async getCurrentLocation() {
  try {
    this.setData({ refreshingLocation: true });
    
    const location = await getLocation();
    
    // 更新位置信息
    this.setData({ 
      location,
      refreshingLocation: false
    });
    
    // 存储位置到本地缓存
    wx.setStorageSync('location', location);
    
    // 获取位置后检查可服务商户
    await this.checkServiceAreaMerchants(location);
  } catch (error) {
    console.error('获取位置失败', error);
    this.setData({ 
      refreshingLocation: false,
      showLocationTip: true,
      // 添加默认位置信息，避免空指针
      location: {
        latitude: 34.8637,
        longitude: 113.652,
        name: '默认位置'
      }
    });
    
    // 即使位置获取失败，也加载基本数据
    this.loadMerchants();
    
    wx.showToast({
      title: '位置获取失败，将使用默认数据',
      icon: 'none',
      duration: 2000
    });
  }
},
  
  // 检查可服务商户
  async checkServiceAreaMerchants(location) {
    try {
      if (!location) return;
      
      // 设置加载状态
      if (!this.data.loading) {
        this.setData({ loading: true });
      }
      
      // 获取可服务商户
      const merchants = await getAvailableMerchants(location);
      
      // 判断是否有可服务商户
      const hasServiceMerchant = merchants.length > 0;
      
      this.setData({
        hasServiceMerchant,
        availableMerchants: merchants,
        loading: false
      });
      
      // 如果有可服务商户，更新推荐商户列表
      if (hasServiceMerchant) {
        this.setData({
          merchants: merchants.slice(0, 3) // 最多显示3个
        });
      } else {
        // 没有可服务商户时，加载所有商户
        this.loadMerchants();
      }
    } catch (error) {
      console.error('检查商户服务范围失败', error);
      this.setData({ loading: false });
      
      // 发生错误时，加载所有商户
      this.loadMerchants();
    }
  },
  
  // 选择位置
  chooseLocation() {
    wx.chooseLocation({
      success: async (res) => {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude,
          name: res.name || res.address,
          address: res.address
        };
        
        // 更新位置并检查商户服务范围
        this.setData({ 
          location,
          showLocationTip: false 
        });
        
        // 保存位置到缓存
        wx.setStorageSync('location', location);
        
        // 检查服务范围
        await this.checkServiceAreaMerchants(location);
      },
      fail: (err) => {
        console.error('选择位置失败', err);
        
        // 如果是用户取消，不提示错误
        if (err.errMsg !== "chooseLocation:fail cancel") {
          wx.showToast({
            title: '选择位置失败',
            icon: 'none'
          });
        }
      }
    });
  },
  
  // 加载轮播图
  loadBanners() {
    // 模拟轮播图数据
    setTimeout(() => {
      const banners = [
        {
          id: 1,
          image_url: '/assets/images/logo.png',
          link_url: '1',
          link_type: 'product'
        },
        {
          id: 2,
          image_url: '/assets/images/logo.png',
          link_url: '2',
          link_type: 'merchant'
        },
        {
          id: 3,
          image_url: '/assets/images/logo.png',
          link_url: '3',
          link_type: 'group'
        }
      ];
      
      this.setData({ banners });
    }, 300);
  },
  
  // 加载分类
  loadCategories() {
    // 模拟分类数据
    setTimeout(() => {
      const categories = [
        { id: 1, name: '美食', icon: '/assets/images/logo.png' },
        { id: 2, name: '蔬果', icon: '/assets/images/logo.png' },
        { id: 3, name: '生鲜', icon: '/assets/images/logo.png' },
        { id: 4, name: '甜点', icon: '/assets/images/logo.png' },
        { id: 5, name: '饮品', icon: '/assets/images/logo.png' }
      ];
      
      this.setData({ categories });
    }, 300);
  },
  
  // 加载商户数据
  loadMerchants() {
    // 模拟商户数据
    setTimeout(() => {
      const merchants = [
        {
          id: 1,
          name: '鲜果连锁超市',
          logo: '/assets/images/logo.png',
          rating: 4.8,
          distance: 1.2,
          brief: '新鲜水果，当季蔬菜',
          latitude: 34.8637,
          longitude: 113.652,
          service_radius: 2.5
        },
        {
          id: 2,
          name: '好味面包坊',
          logo: '/assets/images/logo.png',
          rating: 4.5,
          distance: 2.5,
          brief: '手工面包，新鲜出炉',
          latitude: 34.8630,
          longitude: 113.650,
          service_radius: 3.0
        }
      ];
      
      this.setData({ merchants });
    }, 300);
  },
  
  // 加载团购数据
  loadGroups() {
    // 模拟团购数据
    setTimeout(() => {
      const groups = [
        {
          id: 1,
          title: '新鲜草莓限时团',
          group_price: 29.9,
          target_count: 10,
          current_count: 6,
          product: {
            cover_image: '/assets/images/logo.png',
            price: 39.9
          }
        },
        {
          id: 2,
          title: '进口牛奶特惠团',
          group_price: 49.9,
          target_count: 20,
          current_count: 12,
          product: {
            cover_image: '/assets/images/logo.png',
            price: 69.9
          }
        },
        {
          id: 3,
          title: '有机蔬菜套餐',
          group_price: 99.9,
          target_count: 15,
          current_count: 8,
          product: {
            cover_image: '/assets/images/logo.png',
            price: 129.9
          }
        }
      ];
      
      this.setData({ groups });
    }, 400);
  },
  
  // 加载商品数据
  loadProducts() {
    // 模拟商品数据
    setTimeout(() => {
      const products = [
        {
          id: 1,
          name: '新鲜草莓',
          brief: '当季甜草莓，500g装',
          price: 39.9,
          cover_image: '/assets/images/logo.png',
          sales_count: 152,
          is_hot: true
        },
        {
          id: 2,
          name: '进口牛奶',
          brief: '澳洲进口，全脂，1L装',
          price: 69.9,
          cover_image: '/assets/images/logo.png',
          sales_count: 87,
          is_new: true
        },
        {
          id: 3,
          name: '有机蔬菜套餐',
          brief: '5种当季有机蔬菜',
          price: 129.9,
          cover_image: '/assets/images/logo.png',
          sales_count: 63,
          is_hot: true,
          is_new: true
        },
        {
          id: 4,
          name: '手工面包',
          brief: '法式烤制，250g',
          price: 13.9,
          cover_image: '/assets/images/logo.png',
          sales_count: 231
        }
      ];
      
      this.setData({
        products,
        loading: false
      });
    }, 500);
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    // 获取最新位置
    this.getCurrentLocation();
    
    // 重新加载数据
    this.loadPageData();
    
    // 停止下拉刷新
    wx.stopPullDownRefresh();
  },

  // 点击轮播图
  onBannerTap(e) {
    const { url, type } = e.currentTarget.dataset;
    
    // 根据类型跳转不同页面
    switch(type) {
      case 'product':
        wx.navigateTo({ url: `/pages/product/detail/index?id=${url}` });
        break;
      case 'merchant':
        wx.navigateTo({ url: `/pages/merchant/detail/index?id=${url}` });
        break;
      case 'group':
        wx.navigateTo({ url: `/pages/group/detail/index?id=${url}` });
        break;
      case 'web':
        // 打开 web-view 页面
        wx.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(url)}` });
        break;
      default:
        console.log('未知的轮播图类型', type);
    }
  },

  // 点击搜索栏
  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  // 点击分类
  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ 
      url: `/pages/category/index?categoryId=${id}` 
    });
  },

  // 点击商户
  onMerchantTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ 
      url: `/pages/merchant/detail/index?id=${id}` 
    });
  },

  // 点击商品
  onProductTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ 
      url: `/pages/product/detail/index?id=${id}` 
    });
  },

  // 点击团购
  onGroupTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ 
      url: `/pages/group/detail/index?id=${id}` 
    });
  },

  // 查看全部商户
  viewAllMerchants() {
    wx.switchTab({ url: '/pages/category/index' });
  },
  
  // 查看全部可服务商户
  viewAllServiceMerchants() {
    // 如果没有位置信息，先获取位置
    if (!this.data.location) {
      this.getCurrentLocation();
      return;
    }
    
    // 跳转到商户列表页，传递位置参数
    const { latitude, longitude } = this.data.location;
    wx.navigateTo({ 
      url: `/pages/merchant/list/index?latitude=${latitude}&longitude=${longitude}&title=可服务商户&serviceOnly=true` 
    });
  },

  // 查看全部团购
  viewAllGroups() {
    wx.navigateTo({ url: '/pages/group/list/index' });
  },

  // 查看全部商品
  viewAllProducts() {
    wx.navigateTo({ url: '/pages/product/list/index' });
  },
  
  // 关闭位置提示
  closeLocationTip() {
    this.setData({ showLocationTip: false });
  },
  
  // 刷新位置
  refreshLocation() {
    this.getCurrentLocation();
  }
});