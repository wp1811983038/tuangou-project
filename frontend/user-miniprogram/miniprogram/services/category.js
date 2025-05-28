/**
 * services/category.js - 分类相关API服务
 */

import { get, post } from '../utils/request';
import { apiPath } from '../config/api';

/**
 * 获取所有分类列表
 * @param {Object} params - 查询参数
 * @param {boolean} params.is_active - 是否只获取激活的分类
 * @returns {Promise<Array>} 分类列表
 */
export const getCategories = async (params = {}) => {
  try {
    const result = await get(apiPath.merchant.categories, params, {
      showLoading: false
    });
    
    return result || [];
  } catch (error) {
    console.error('获取分类列表失败', error);
    return [];
  }
};

/**
 * 根据分类获取商户列表
 * @param {Object} params - 查询参数
 * @param {number} params.category_id - 分类ID
 * @param {number} params.latitude - 纬度
 * @param {number} params.longitude - 经度
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.keyword - 搜索关键词
 * @param {string} params.sort_by - 排序字段
 * @param {string} params.sort_order - 排序方向
 * @returns {Promise<Object>} 商户列表数据
 */
export const getMerchantsByCategory = async (params = {}) => {
  try {
    const result = await get(apiPath.merchant.list, params);
    
    return {
      items: result.data?.items || [],
      total: result.data?.total || 0,
      page: result.data?.page || 1,
      page_size: result.data?.page_size || 10,
      pages: result.data?.pages || 0
    };
  } catch (error) {
    console.error('获取分类商户失败', error);
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
 * 根据分类获取商品列表
 * @param {Object} params - 查询参数
 * @param {number} params.category_id - 分类ID
 * @param {number} params.merchant_id - 商户ID（可选）
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.keyword - 搜索关键词
 * @param {string} params.sort_by - 排序字段
 * @param {string} params.sort_order - 排序方向
 * @returns {Promise<Object>} 商品列表数据
 */
export const getProductsByCategory = async (params = {}) => {
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
    console.error('获取分类商品失败', error);
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
 * 搜索分类
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 匹配的分类列表
 */
export const searchCategories = async (keyword) => {
  try {
    if (!keyword || keyword.trim() === '') {
      return await getCategories({ is_active: true });
    }
    
    const allCategories = await getCategories({ is_active: true });
    
    // 前端过滤匹配关键词的分类
    return allCategories.filter(category => 
      category.name.toLowerCase().includes(keyword.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(keyword.toLowerCase()))
    );
  } catch (error) {
    console.error('搜索分类失败', error);
    return [];
  }
};

/**
 * 获取热门分类
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>} 热门分类列表
 */
export const getHotCategories = async (limit = 10) => {
  try {
    const allCategories = await getCategories({ is_active: true });
    
    // 按商户数量排序，获取热门分类
    return allCategories
      .sort((a, b) => (b.merchant_count || 0) - (a.merchant_count || 0))
      .slice(0, limit);
  } catch (error) {
    console.error('获取热门分类失败', error);
    return [];
  }
};

/**
 * 获取分类统计信息
 * @param {number} categoryId - 分类ID
 * @param {Object} location - 位置信息 {latitude, longitude}
 * @returns {Promise<Object>} 分类统计信息
 */
export const getCategoryStats = async (categoryId, location = null) => {
  try {
    const params = { category_id: categoryId };
    
    if (location && location.latitude && location.longitude) {
      params.latitude = location.latitude;
      params.longitude = location.longitude;
    }
    
    // 并行获取商户和商品统计
    const [merchantResult, productResult] = await Promise.all([
      getMerchantsByCategory({ ...params, page_size: 1 }),
      getProductsByCategory({ ...params, page_size: 1 })
    ]);
    
    return {
      merchant_count: merchantResult.total,
      product_count: productResult.total,
      category_id: categoryId
    };
  } catch (error) {
    console.error('获取分类统计失败', error);
    return {
      merchant_count: 0,
      product_count: 0,
      category_id: categoryId
    };
  }
};

export default {
  getCategories,
  getMerchantsByCategory,
  getProductsByCategory,
  searchCategories,
  getHotCategories,
  getCategoryStats
};