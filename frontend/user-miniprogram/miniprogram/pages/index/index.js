// pages/index/index.js
import { checkLoginStatus } from '../../utils/auth';
import { getLocation } from '../../utils/location';

Page({
  data: {
    banners: [],           // 轮播图
    merchants: [],         // 推荐商户
    groups: [],            // 热门团购
    products: [],          // 推荐商品
    categories: [],        // 商户分类
    location: null,        // 当前位置
    loading: true          // 加载状态
  },

  onLoad: function(options) {
    // 加载模拟数据
    this.loadMockData();
  },

  onShow: function() {
    // 检查登录状态但不强制跳转
    checkLoginStatus(false);
    
    // 获取当前位置
    this.getCurrentLocation();
  },

  // 获取当前位置
  async getCurrentLocation() {
    try {
      const location = await getLocation();
      this.setData({ location });
    } catch (error) {
      console.error('获取位置失败', error);
    }
  },

  // 加载模拟数据（实际项目中会从API获取数据）
  loadMockData() {
    this.setData({ loading: true });
    
    // 模拟延迟加载
    setTimeout(() => {
      // 轮播图模拟数据
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
      
      // 分类模拟数据
      const categories = [
        { id: 1, name: '美食', icon: '/assets/images/logo.png' },
        { id: 2, name: '蔬果', icon: '/assets/images/logo.png' },
        { id: 3, name: '生鲜', icon: '/assets/images/logo.png' },
        { id: 4, name: '甜点', icon: '/assets/images/logo.png' },
        { id: 5, name: '饮品', icon: '/assets/images/logo.png' }
      ];
      
      // 商户模拟数据
      const merchants = [
        {
          id: 1,
          name: '鲜果连锁超市',
          logo: '/assets/images/logo.png',
          rating: 4.8,
          distance: 1.2,
          brief: '新鲜水果，当季蔬菜'
        },
        {
          id: 2,
          name: '好味面包坊',
          logo: '/assets/images/logo.png',
          rating: 4.5,
          distance: 2.5,
          brief: '手工面包，新鲜出炉'
        }
      ];
      
      // 团购模拟数据
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
      
      // 商品模拟数据
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
        banners,
        categories,
        merchants,
        groups,
        products,
        loading: false
      });
    }, 500);
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.loadMockData();
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

  // 查看全部团购
  viewAllGroups() {
    wx.navigateTo({ url: '/pages/group/list/index' });
  },

  // 查看全部商品
  viewAllProducts() {
    wx.navigateTo({ url: '/pages/product/list/index' });
  }
})