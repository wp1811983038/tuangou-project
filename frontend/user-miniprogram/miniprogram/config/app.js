/**
 * config/app.js - 应用配置
 */

// 应用基础配置
export const appConfig = {
  // 应用名称
  appName: '团购小程序',
  
  // 应用版本
  version: '1.0.0',
  
  // 缓存键
  cacheKeys: {
    token: 'token',
    userInfo: 'userInfo',
    cart: 'cart',
    location: 'location',
    searchHistory: 'searchHistory',
    lastAddress: 'lastAddress',
    browseHistory: 'browseHistory'
  },
  
  // 默认请求配置
  request: {
    timeout: 30000,
    retry: 1,
    showLoading: true,
    loadingTitle: '加载中...'
  },
  
  // 默认分页大小
  pageSize: 10,
  
  // 商品状态
  productStatus: {
    ON_SALE: 1,     // 上架
    OFF_SALE: 0,    // 下架
    SOLD_OUT: 2     // 售罄
  },
  
  // 团购状态
  groupStatus: {
    PENDING: 0,     // 待开始
    ONGOING: 1,     // 进行中
    SUCCEED: 2,     // 成功
    FAILED: 3,      // 失败
    CANCELED: 4     // 已取消
  },
  
  // 订单状态
  orderStatus: {
    PENDING: 0,     // 待处理
    CONFIRMED: 1,   // 已确认
    COMPLETED: 2,   // 已完成
    CANCELED: 3,    // 已取消
    REFUNDING: 4,   // 退款中
    REFUNDED: 5     // 已退款
  },
  
  // 支付状态
  paymentStatus: {
    UNPAID: 0,      // 未支付
    PAID: 1,        // 已支付
    REFUNDING: 2,   // 退款中
    REFUNDED: 3     // 已退款
  },
  
  // 配送状态
  deliveryStatus: {
    UNDELIVERED: 0, // 未发货
    DELIVERED: 1,   // 已发货
    RECEIVED: 2     // 已收货
  },
  
  // 消息类型
  messageType: {
    SYSTEM: 'system',       // 系统消息
    ORDER: 'order',         // 订单消息
    GROUP: 'group',         // 团购消息
    PROMOTION: 'promotion'  // 促销消息
  },
  
  // 团购参与状态
  participantStatus: {
    PENDING: 0,     // 待参与（已下单未支付）
    CONFIRMED: 1,   // 已参与（已下单已支付）
    CANCELED: 2,    // 已取消
    REFUNDED: 3     // 已退款
  },
  
  // 本地存储配置
  storage: {
    // 缓存过期时间（毫秒）
    expireTime: {
      userInfo: 7 * 24 * 60 * 60 * 1000,  // 7天
      cart: 30 * 24 * 60 * 60 * 1000,     // 30天
      searchHistory: 90 * 24 * 60 * 60 * 1000,  // 90天
      browseHistory: 15 * 24 * 60 * 60 * 1000   // 15天
    },
    
    // 最大缓存数量
    maxCount: {
      searchHistory: 20,  // 最多保存20条搜索历史
      browseHistory: 50   // 最多保存50条浏览历史
    }
  },
  
  // 上传配置
  upload: {
    maxSize: 10 * 1024 * 1024,  // 10MB
    maxCount: 9,  // 最多上传9张图片
    accept: {
      image: ['jpg', 'jpeg', 'png', 'gif'],
      video: ['mp4', 'mov'],
      file: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
    }
  },
  
  // 位置配置
  location: {
    defaultRadius: 5000,  // 默认5公里范围
    refreshInterval: 30 * 60 * 1000  // 30分钟刷新一次位置
  }
};

// 支付方式
export const paymentMethods = [
  { value: 'wxpay', label: '微信支付', icon: '/assets/icons/wxpay.png' }
];

// 订单分类
export const orderCategories = [
  { type: 'all', name: '全部' },
  { type: 'unpaid', name: '待付款', status: appConfig.paymentStatus.UNPAID },
  { type: 'unshipped', name: '待发货', payment_status: appConfig.paymentStatus.PAID, delivery_status: appConfig.deliveryStatus.UNDELIVERED },
  { type: 'shipped', name: '待收货', delivery_status: appConfig.deliveryStatus.DELIVERED },
  { type: 'completed', name: '已完成', status: appConfig.orderStatus.COMPLETED },
  { type: 'refund', name: '退款/售后', status: [appConfig.orderStatus.REFUNDING, appConfig.orderStatus.REFUNDED] }
];

// 团购类型
export const groupTypes = [
  { value: 1, label: '拼团', desc: '好友一起拼，享更多优惠' },
  { value: 2, label: '秒杀', desc: '限时限量，抢购优惠' },
  { value: 3, label: '限时折扣', desc: '限时享受商品折扣' },
  { value: 4, label: '满减活动', desc: '满额即享受减免' }
];

// 排序选项
export const sortOptions = [
  { value: 'default', label: '默认排序' },
  { value: 'price_asc', label: '价格从低到高', sortBy: 'price', sortOrder: 'asc' },
  { value: 'price_desc', label: '价格从高到低', sortBy: 'price', sortOrder: 'desc' },
  { value: 'sales_desc', label: '销量从高到低', sortBy: 'sales_count', sortOrder: 'desc' },
  { value: 'rating_desc', label: '好评从高到低', sortBy: 'rating', sortOrder: 'desc' },
  { value: 'distance_asc', label: '距离从近到远', sortBy: 'distance', sortOrder: 'asc' },
  { value: 'time_desc', label: '最新上架', sortBy: 'created_at', sortOrder: 'desc' }
];

// 常用正则表达式
export const regexPatterns = {
  phone: /^1[3-9]\d{9}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  password: /^.{6,20}$/,
  verifyCode: /^\d{6}$/,
  idCard: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
  amount: /^(([1-9]\d*)|\d)(\.\d{1,2})?$/
};

export default {
  appConfig,
  paymentMethods,
  orderCategories,
  groupTypes,
  sortOptions,
  regexPatterns
};