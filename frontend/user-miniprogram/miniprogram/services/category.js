/**
 * services/category.js - 修复商户分类功能
 */

import { get, post } from '../utils/request';
import { apiPath } from '../config/api';

/**
 * 获取所有分类列表
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
 * 🔧 修复：根据当前上下文获取分类
 * @param {Object} currentMerchant - 当前选中的商户
 * @returns {Promise<Array>} 分类列表
 */
export const getCategoriesForCurrentContext = async (currentMerchant = null) => {
  try {
    console.log('📂 获取上下文分类，商户:', currentMerchant?.name || '全局模式');
    
    if (currentMerchant && currentMerchant.id) {
      // 🏪 商户模式：获取该商户实际有商品的分类
      console.log(`🏪 商户模式：获取商户 ${currentMerchant.id} 有商品的分类`);
      
      try {
        // 方法1: 尝试调用专门的商户分类接口
        const merchantCategoriesUrl = `/merchants/${currentMerchant.id}/categories`;
        console.log('🔗 尝试商户分类接口:', merchantCategoriesUrl);
        
        const merchantCategories = await get(merchantCategoriesUrl, {}, {
          showLoading: false,
          showError: false  // 不显示错误，因为可能接口不存在
        });
        
        if (merchantCategories && merchantCategories.length > 0) {
          console.log(`✅ 商户分类接口成功，获取到 ${merchantCategories.length} 个分类`);
          return merchantCategories;
        }
      } catch (error) {
        console.log('⚠️ 商户分类接口不可用，使用备用方案');
      }
      
      // 方法2: 备用方案 - 通过商品接口获取该商户的分类
      console.log('🔄 使用备用方案：通过商品统计获取商户分类');
      const merchantCategoriesFromProducts = await getMerchantCategoriesFromProducts(currentMerchant.id);
      
      if (merchantCategoriesFromProducts.length > 0) {
        console.log(`✅ 备用方案成功，获取到 ${merchantCategoriesFromProducts.length} 个有商品的分类`);
        return merchantCategoriesFromProducts;
      }
      
      // 方法3: 最后备用 - 返回所有分类，但会在商品加载时自然筛选
      console.log('⚠️ 使用最后备用方案：返回所有分类');
      const allCategories = await getCategories({ is_active: true });
      return allCategories;
      
    } else {
      // 🌍 全局模式：获取所有激活的分类
      console.log('🌍 全局模式：获取所有分类');
      return await getCategories({ is_active: true });
    }
  } catch (error) {
    console.error('❌ 获取上下文分类失败', error);
    return [];
  }
};

/**
 * 🆕 通过商品统计获取商户的分类
 * @param {number} merchantId - 商户ID
 * @returns {Promise<Array>} 该商户有商品的分类列表
 */
async function getMerchantCategoriesFromProducts(merchantId) {
  try {
    console.log(`📊 统计商户 ${merchantId} 的商品分类分布`);
    
    // 获取所有分类
    const allCategories = await getCategories({ is_active: true });
    console.log(`📋 总共有 ${allCategories.length} 个分类`);
    
    // 为每个分类检查该商户是否有商品
    const categoriesWithProducts = [];
    
    for (const category of allCategories) {
      try {
        // 检查该商户在这个分类下是否有商品
        const productCheck = await get(apiPath.product.list, {
          merchant_id: merchantId,
          category_id: category.id,
          page: 1,
          page_size: 1,  // 只需要知道是否有商品
          status: 1
        }, {
          showLoading: false,
          showError: false
        });
        
        const hasProducts = productCheck.data?.items?.length > 0;
        
        if (hasProducts) {
          console.log(`✅ 分类 "${category.name}" 有商品`);
          categoriesWithProducts.push({
            ...category,
            product_count: productCheck.data?.total || 0
          });
        } else {
          console.log(`⚪ 分类 "${category.name}" 无商品`);
        }
      } catch (error) {
        console.warn(`⚠️ 检查分类 "${category.name}" 的商品时出错:`, error);
        // 出错时仍然包含该分类，避免遗漏
        categoriesWithProducts.push(category);
      }
    }
    
    console.log(`📈 商户 ${merchantId} 在 ${categoriesWithProducts.length} 个分类中有商品`);
    return categoriesWithProducts;
    
  } catch (error) {
    console.error('❌ 统计商户分类失败', error);
    return [];
  }
}

/**
 * 🔧 优化：根据当前上下文获取商品
 * @param {Object} params - 查询参数
 * @param {Object} currentMerchant - 当前选中的商户
 * @returns {Promise<Object>} 商品列表数据
 */
export const getProductsForCurrentContext = async (params = {}, currentMerchant = null) => {
  try {
    console.log('🛍️ 获取上下文商品');
    console.log('📤 原始参数:', params);
    console.log('🏪 当前商户:', currentMerchant?.name || '全局模式');
    
    // 构建请求参数
    const requestParams = { ...params };
    
    if (currentMerchant && currentMerchant.id) {
      // 商户模式：只获取该商户的商品
      requestParams.merchant_id = currentMerchant.id;
      console.log(`🏪 限制商户ID: ${currentMerchant.id}`);
    }
    
    // 如果有分类ID且不是"全部"分类
    if (params.category_id && params.category_id > 0) {
      console.log(`🏷️ 筛选分类ID: ${params.category_id}`);
    }
    
    console.log('📤 最终请求参数:', requestParams);
    
    const result = await get(apiPath.product.list, requestParams);
    
    const responseData = {
      items: result.data?.items || [],
      total: result.data?.total || 0,
      page: result.data?.page || 1,
      page_size: result.data?.page_size || 10,
      pages: result.data?.pages || 0
    };
    
    console.log(`📥 获取商品成功: ${responseData.items.length} 个商品 (总计: ${responseData.total})`);
    
    // 🔧 如果是商户模式且选择了特定分类，但没有商品，给出提示
    if (currentMerchant && params.category_id > 0 && responseData.items.length === 0) {
      console.log(`⚠️ 商户 "${currentMerchant.name}" 在当前分类下没有商品`);
    }
    
    return responseData;
  } catch (error) {
    console.error('❌ 获取上下文商品失败', error);
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
 * 根据分类获取商户列表
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
  getCategoriesForCurrentContext,
  getProductsForCurrentContext,
  getMerchantsByCategory,
  getProductsByCategory,
  searchCategories,
  getHotCategories,
  getCategoryStats
};