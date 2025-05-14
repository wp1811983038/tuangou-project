/**
 * config/api.js - API 配置
 */

// API基础URL - 根据环境切换
const MODE = 'dev'; // 'dev' | 'test' | 'prod'

// 不同环境的URL配置
const BASE_URLS = {
  dev: 'http://10.255.61.255:8000',
  test: 'https://api-test.example.com',
  prod: 'https://api.example.com'
};

// 导出API基础URL
export const apiBaseUrl = BASE_URLS[MODE] + '/api/v1';

// API路径定义
export const apiPath = {
  // 认证相关
  auth: {
    wxLogin: '/auth/wx-login',
    refresh: '/auth/refresh-token',
    logout: '/auth/logout',
    phoneLogin: '/auth/phone-login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password'
  },
  
  // 用户相关
  user: {
    profile: '/users/me',
    update: '/users/me',
    addresses: '/users/addresses',
    favorites: '/users/favorites'
  },
  
  // 商户相关
  merchant: {
    list: '/merchants',
    detail: '/merchants/{id}',
    categories: '/merchants/categories/all'
  },
  
  // 商品相关
  product: {
    list: '/products',
    detail: '/products/{id}',
    related: '/products/{id}/related'
  },
  
  // 团购相关
  group: {
    list: '/groups',
    detail: '/groups/{id}',
    join: '/groups/{id}/join',
    cancel: '/groups/{id}/cancel',
    joined: '/groups/my/joined'
  },
  
  // 订单相关
  order: {
    create: '/orders',
    list: '/orders',
    detail: '/orders/{id}',
    pay: '/orders/{id}/pay',
    cancel: '/orders/{id}/cancel',
    refund: '/orders/{id}/refund',
    receipt: '/orders/{id}/receipt',
    statistics: '/orders/statistics'
  },
  
  // 评价相关
  review: {
    create: '/reviews',
    list: '/reviews',
    product: '/reviews/product/{id}/stats'
  },
  
  // 上传相关
  upload: {
    file: '/uploads/file',
    images: '/uploads/images'
  },
  
  // 位置相关
  location: {
    search: '/locations/search',
    address: '/locations/address',
    distance: '/locations/distance',
    deliveryFee: '/locations/delivery-fee'
  },
  
  // 支付相关
  payment: {
    create: '/payments/wechat/create',
    status: '/payments/order/{id}/status'
  },
  
  // 消息相关
  message: {
    list: '/messages',
    detail: '/messages/{id}',
    read: '/messages/{id}/read',
    readAll: '/messages/read-all',
    count: '/messages/count'
  }
};

/**
 * 格式化URL, 替换路径参数
 * @param {string} url - 包含路径参数的URL
 * @param {object} params - 参数对象
 * @returns {string} 替换后的URL
 */
export const formatUrl = (url, params = {}) => {
  let formattedUrl = url;
  
  Object.keys(params).forEach(key => {
    formattedUrl = formattedUrl.replace(`{${key}}`, params[key]);
  });
  
  return formattedUrl;
};

/**
 * 构建完整API URL
 * @param {string} path - API路径
 * @param {object} pathParams - 路径参数
 * @returns {string} 完整URL
 */
export const buildUrl = (path, pathParams = {}) => {
  return apiBaseUrl + formatUrl(path, pathParams);
};

export default {
  apiBaseUrl,
  apiPath,
  formatUrl,
  buildUrl
};