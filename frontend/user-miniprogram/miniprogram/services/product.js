/**
 * services/product.js - 商品服务层
 */

import { get, post, put, del } from '../utils/request';
import { apiPath, formatUrl } from '../config/api';

/**
 * 获取商品详情
 * @param {number} productId - 商品ID
 * @returns {Promise<Object>} 商品详情
 */
export const getProductDetail = async (productId) => {
  try {
    console.log('📦 获取商品详情，ID:', productId);
    
    const product = await get(
      formatUrl(apiPath.product.detail, { id: productId })
    );
    
    console.log('✅ 商品详情获取成功:', product.name);
    return product;
  } catch (error) {
    console.error('❌ 获取商品详情失败', error);
    throw error;
  }
};

/**
 * 获取商品列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 商品列表数据
 */
export const getProductList = async (params = {}) => {
  try {
    const result = await get(apiPath.product.list, params);
    
    return {
      items: result.data?.items || [],
      total: result.data?.total || 0,
      page: result.data?.page || 1,
      page_size: result.data?.page_size || 10,
      pages: result.data?.pages || 0
    };
  } catch (error) {
    console.error('获取商品列表失败', error);
    return {
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
      pages: 0
    };
  }
};

/**
 * 获取相关商品
 * @param {number} productId - 商品ID
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>} 相关商品列表
 */
export const getRelatedProducts = async (productId, limit = 6) => {
  try {
    console.log('🔗 获取相关商品，商品ID:', productId);
    
    const relatedProducts = await get(
      formatUrl(apiPath.product.related, { id: productId }),
      { limit }
    );
    
    console.log(`✅ 获取到 ${relatedProducts.length} 个相关商品`);
    return relatedProducts;
  } catch (error) {
    console.error('❌ 获取相关商品失败', error);
    return [];
  }
};

/**
 * 收藏/取消收藏商品
 * @param {number} productId - 商品ID
 * @returns {Promise<boolean>} 操作结果，true表示已收藏，false表示已取消收藏
 */
export const toggleProductFavorite = async (productId) => {
  try {
    console.log('❤️ 切换商品收藏状态，商品ID:', productId);
    
    const result = await post(
      formatUrl('/users/favorites/{product_id}', { product_id: productId })
    );
    
    const isFavorite = result.data || false;
    console.log(`✅ 收藏操作成功，当前状态: ${isFavorite ? '已收藏' : '未收藏'}`);
    
    return isFavorite;
  } catch (error) {
    console.error('❌ 收藏操作失败', error);
    throw error;
  }
};

/**
 * 搜索商品
 * @param {Object} searchParams - 搜索参数
 * @returns {Promise<Object>} 搜索结果
 */
export const searchProducts = async (searchParams = {}) => {
  try {
    console.log('🔍 搜索商品，参数:', searchParams);
    
    const result = await get(apiPath.product.list, {
      ...searchParams,
      page: searchParams.page || 1,
      page_size: searchParams.page_size || 10
    });
    
    console.log(`✅ 搜索完成，找到 ${result.data?.total || 0} 个商品`);
    
    return {
      items: result.data?.items || [],
      total: result.data?.total || 0,
      page: result.data?.page || 1,
      page_size: result.data?.page_size || 10,
      pages: result.data?.pages || 0
    };
  } catch (error) {
    console.error('❌ 搜索商品失败', error);
    return {
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
      pages: 0
    };
  }
};

/**
 * 获取商品评价统计
 * @param {number} productId - 商品ID
 * @returns {Promise<Object>} 评价统计
 */
export const getProductReviewStats = async (productId) => {
  try {
    console.log('⭐ 获取商品评价统计，商品ID:', productId);
    
    const reviewStats = await get(
      formatUrl(apiPath.review.product, { id: productId })
    );
    
    console.log(`✅ 评价统计获取成功: ${reviewStats.total_count} 条评价，平均 ${reviewStats.average_rating} 分`);
    return reviewStats;
  } catch (error) {
    console.error('❌ 获取评价统计失败', error);
    return {
      total_count: 0,
      average_rating: 0,
      rating_distribution: []
    };
  }
};

/**
 * 获取商品评价列表
 * @param {number} productId - 商品ID
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 评价列表
 */
export const getProductReviews = async (productId, params = {}) => {
  try {
    console.log('📝 获取商品评价列表，商品ID:', productId);
    
    const result = await get(apiPath.review.list, {
      product_id: productId,
      page: params.page || 1,
      page_size: params.page_size || 5,
      ...params
    });
    
    console.log(`✅ 获取到 ${result.data?.items?.length || 0} 条评价`);
    
    return {
      items: result.data?.items || [],
      total: result.data?.total || 0,
      page: result.data?.page || 1,
      page_size: result.data?.page_size || 5,
      pages: result.data?.pages || 0
    };
  } catch (error) {
    console.error('❌ 获取评价列表失败', error);
    return {
      items: [],
      total: 0,
      page: 1,
      page_size: 5,
      pages: 0
    };
  }
};

/**
 * 获取商品的活跃团购
 * @param {number} productId - 商品ID
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>} 活跃团购列表
 */
export const getProductActiveGroups = async (productId, limit = 5) => {
  try {
    console.log('🎯 获取商品活跃团购，商品ID:', productId);
    
    const result = await get(apiPath.group.list, {
      product_id: productId,
      status: 1, // 进行中的团购
      page_size: limit
    });
    
    const activeGroups = result.data?.items || [];
    console.log(`✅ 获取到 ${activeGroups.length} 个活跃团购`);
    
    return activeGroups;
  } catch (error) {
    console.error('❌ 获取活跃团购失败', error);
    return [];
  }
};

/**
 * 检查商品库存
 * @param {number} productId - 商品ID
 * @param {number} quantity - 需要的数量
 * @param {Object} specifications - 规格选择
 * @returns {Promise<boolean>} 是否有足够库存
 */
export const checkProductStock = async (productId, quantity = 1, specifications = {}) => {
  try {
    console.log('📦 检查商品库存', { productId, quantity, specifications });
    
    // 获取商品详情来检查库存
    const product = await getProductDetail(productId);
    
    // 简化处理：直接检查商品总库存
    const hasStock = product.stock >= quantity;
    
    console.log(`✅ 库存检查${hasStock ? '通过' : '失败'}: 需要 ${quantity}，库存 ${product.stock}`);
    
    return hasStock;
  } catch (error) {
    console.error('❌ 检查库存失败', error);
    return false;
  }
};

/**
 * 格式化商品价格
 * @param {number} price - 价格
 * @returns {string} 格式化后的价格
 */
export const formatPrice = (price) => {
  if (typeof price !== 'number' || isNaN(price)) return '0.00';
  return price.toFixed(2);
};

/**
 * 格式化商品销量
 * @param {number} sales - 销量
 * @returns {string|number} 格式化后的销量
 */
export const formatSales = (sales) => {
  if (!sales || sales <= 0) return 0;
  
  if (sales >= 10000) {
    return `${(sales / 10000).toFixed(1)}万`;
  }
  
  return sales;
};

/**
 * 计算商品折扣
 * @param {number} originalPrice - 原价
 * @param {number} currentPrice - 现价
 * @returns {number} 折扣（1-10）
 */
export const calculateDiscount = (originalPrice, currentPrice) => {
  if (!originalPrice || !currentPrice || currentPrice >= originalPrice) {
    return 0;
  }
  
  return Math.floor((1 - currentPrice / originalPrice) * 10);
};

/**
 * 验证商品规格选择
 * @param {Object} product - 商品信息
 * @param {Object} selectedSpecs - 选择的规格
 * @returns {Object} 验证结果
 */
export const validateSpecifications = (product, selectedSpecs) => {
  const result = {
    valid: true,
    errors: [],
    missingSpecs: []
  };
  
  if (!product.specifications || product.specifications.length === 0) {
    return result;
  }
  
  // 检查每个规格组是否都有选择
  product.specifications.forEach(spec => {
    if (!selectedSpecs[spec.id]) {
      result.valid = false;
      result.missingSpecs.push(spec.name);
      result.errors.push(`请选择${spec.name}`);
    }
  });
  
  return result;
};

/**
 * 生成商品分享信息
 * @param {Object} product - 商品信息
 * @returns {Object} 分享信息
 */
export const generateShareInfo = (product) => {
  return {
    title: product.name || '精选好商品',
    path: `/pages/product/detail/index?id=${product.id}`,
    imageUrl: product.thumbnail || '/assets/images/logo.png',
    desc: product.description || '发现更多优质商品'
  };
};

/**
 * 处理商品规格价格差异
 * @param {Object} product - 商品信息
 * @param {Object} selectedSpecs - 选择的规格
 * @returns {number} 最终价格
 */
export const calculateSpecPrice = (product, selectedSpecs) => {
  let finalPrice = product.current_price || 0;
  
  if (!product.specifications || Object.keys(selectedSpecs).length === 0) {
    return finalPrice;
  }
  
  // 计算规格价格差异
  product.specifications.forEach(spec => {
    const selectedOptionId = selectedSpecs[spec.id];
    if (selectedOptionId) {
      const option = spec.options.find(opt => opt.id === selectedOptionId);
      if (option && option.price_diff) {
        finalPrice += option.price_diff;
      }
    }
  });
  
  return Math.max(finalPrice, 0);
};

export default {
  getProductDetail,
  getProductList,
  getRelatedProducts,
  toggleProductFavorite,
  searchProducts,
  getProductReviewStats,
  getProductReviews,
  getProductActiveGroups,
  checkProductStock,
  formatPrice,
  formatSales,
  calculateDiscount,
  validateSpecifications,
  generateShareInfo,
  calculateSpecPrice
};