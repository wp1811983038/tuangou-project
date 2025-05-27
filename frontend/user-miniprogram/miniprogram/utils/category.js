/**
 * utils/category.js - 分类相关工具函数
 */

/**
 * 分类数据处理和格式化工具
 */
export class CategoryUtils {
  
  /**
   * 格式化分类数据
   * @param {Array} categories - 原始分类数据
   * @returns {Array} 格式化后的分类数据
   */
  static formatCategories(categories) {
    if (!Array.isArray(categories)) return [];
    
    return categories.map(category => ({
      id: category.id || 0,
      name: category.name || '未知分类',
      icon: category.icon || '/assets/images/logo.png',
      description: category.description || '',
      merchant_count: category.merchant_count || 0,
      product_count: category.product_count || 0,
      is_active: category.is_active !== false,
      sort_order: category.sort_order || 0,
      created_at: category.created_at,
      updated_at: category.updated_at
    }));
  }

  /**
   * 按排序权重排序分类
   * @param {Array} categories - 分类数组
   * @returns {Array} 排序后的分类数组
   */
  static sortCategories(categories) {
    if (!Array.isArray(categories)) return [];
    
    return categories.sort((a, b) => {
      // 先按sort_order排序，再按id排序
      if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      return (a.id || 0) - (b.id || 0);
    });
  }

  /**
   * 筛选活跃分类
   * @param {Array} categories - 分类数组
   * @returns {Array} 活跃的分类数组
   */
  static filterActiveCategories(categories) {
    if (!Array.isArray(categories)) return [];
    
    return categories.filter(category => category.is_active !== false);
  }

  /**
   * 获取热门分类（按商户数量排序）
   * @param {Array} categories - 分类数组
   * @param {number} limit - 限制数量
   * @returns {Array} 热门分类数组
   */
  static getHotCategories(categories, limit = 10) {
    if (!Array.isArray(categories)) return [];
    
    return categories
      .filter(category => category.is_active !== false)
      .sort((a, b) => (b.merchant_count || 0) - (a.merchant_count || 0))
      .slice(0, limit);
  }

  /**
   * 搜索分类
   * @param {Array} categories - 分类数组
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 匹配的分类数组
   */
  static searchCategories(categories, keyword) {
    if (!Array.isArray(categories) || !keyword) return categories || [];
    
    const lowerKeyword = keyword.toLowerCase();
    
    return categories.filter(category => {
      const name = (category.name || '').toLowerCase();
      const description = (category.description || '').toLowerCase();
      
      return name.includes(lowerKeyword) || description.includes(lowerKeyword);
    });
  }

  /**
   * 根据ID查找分类
   * @param {Array} categories - 分类数组
   * @param {number} categoryId - 分类ID
   * @returns {Object|null} 找到的分类对象或null
   */
  static findCategoryById(categories, categoryId) {
    if (!Array.isArray(categories) || !categoryId) return null;
    
    return categories.find(category => category.id === categoryId) || null;
  }

  /**
   * 获取分类统计摘要
   * @param {Array} categories - 分类数组
   * @returns {Object} 统计摘要
   */
  static getCategoriesSummary(categories) {
    if (!Array.isArray(categories)) {
      return {
        total: 0,
        active: 0,
        totalMerchants: 0,
        totalProducts: 0,
        averageMerchants: 0,
        averageProducts: 0
      };
    }
    
    const active = categories.filter(cat => cat.is_active !== false);
    const totalMerchants = categories.reduce((sum, cat) => sum + (cat.merchant_count || 0), 0);
    const totalProducts = categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0);
    
    return {
      total: categories.length,
      active: active.length,
      totalMerchants,
      totalProducts,
      averageMerchants: active.length > 0 ? Math.round(totalMerchants / active.length) : 0,
      averageProducts: active.length > 0 ? Math.round(totalProducts / active.length) : 0
    };
  }

  /**
   * 验证分类数据完整性
   * @param {Object} category - 分类对象
   * @returns {Object} 验证结果
   */
  static validateCategory(category) {
    const errors = [];
    
    if (!category) {
      errors.push('分类对象不能为空');
      return { valid: false, errors };
    }
    
    if (!category.name || category.name.trim() === '') {
      errors.push('分类名称不能为空');
    }
    
    if (category.name && category.name.length > 50) {
      errors.push('分类名称不能超过50个字符');
    }
    
    if (category.description && category.description.length > 500) {
      errors.push('分类描述不能超过500个字符');
    }
    
    if (category.sort_order && (typeof category.sort_order !== 'number' || category.sort_order < 0)) {
      errors.push('排序权重必须是非负数');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成分类面包屑导航
   * @param {Array} categories - 分类数组
   * @param {number} currentCategoryId - 当前分类ID
   * @returns {Array} 面包屑数组
   */
  static generateBreadcrumb(categories, currentCategoryId) {
    const breadcrumb = [
      { id: 0, name: '首页', path: '/pages/index/index' },
      { id: -1, name: '分类', path: '/pages/category/index' }
    ];
    
    if (currentCategoryId && currentCategoryId > 0) {
      const currentCategory = this.findCategoryById(categories, currentCategoryId);
      if (currentCategory) {
        breadcrumb.push({
          id: currentCategory.id,
          name: currentCategory.name,
          path: `/pages/category/index?category_id=${currentCategory.id}`
        });
      }
    }
    
    return breadcrumb;
  }

  /**
   * 缓存分类数据
   * @param {Array} categories - 分类数据
   * @param {number} expireTime - 过期时间（毫秒）
   */
  static cacheCategories(categories, expireTime = 30 * 60 * 1000) {
    try {
      const cacheData = {
        data: categories,
        timestamp: Date.now(),
        expireTime
      };
      
      wx.setStorageSync('categoriesCache', cacheData);
    } catch (error) {
      console.error('缓存分类数据失败', error);
    }
  }

  /**
   * 从缓存获取分类数据
   * @returns {Array|null} 缓存的分类数据或null
   */
  static getCachedCategories() {
    try {
      const cacheData = wx.getStorageSync('categoriesCache');
      
      if (!cacheData || !cacheData.data) return null;
      
      // 检查是否过期
      const now = Date.now();
      if (now - cacheData.timestamp > cacheData.expireTime) {
        wx.removeStorageSync('categoriesCache');
        return null;
      }
      
      return cacheData.data;
    } catch (error) {
      console.error('获取缓存分类数据失败', error);
      return null;
    }
  }

  /**
   * 清除分类缓存
   */
  static clearCachedCategories() {
    try {
      wx.removeStorageSync('categoriesCache');
    } catch (error) {
      console.error('清除分类缓存失败', error);
    }
  }
}

/**
 * 分类图标工具
 */
export class CategoryIconUtils {
  
  // 预定义分类图标映射
  static iconMap = {
    '美食': '/assets/icons/food.png',
    '生鲜': '/assets/icons/fresh.png',
    '甜品': '/assets/icons/dessert.png',
    '饮品': '/assets/icons/drink.png',
    '服装': '/assets/icons/clothing.png',
    '日用品': '/assets/icons/daily.png',
    '电子产品': '/assets/icons/electronics.png',
    '图书': '/assets/icons/book.png',
    '运动': '/assets/icons/sports.png',
    '美妆': '/assets/icons/beauty.png'
  };

  /**
   * 根据分类名称获取图标
   * @param {string} categoryName - 分类名称
   * @returns {string} 图标路径
   */
  static getIconByName(categoryName) {
    if (!categoryName) return '/assets/images/logo.png';
    
    // 直接匹配
    if (this.iconMap[categoryName]) {
      return this.iconMap[categoryName];
    }
    
    // 模糊匹配
    for (const [name, icon] of Object.entries(this.iconMap)) {
      if (categoryName.includes(name) || name.includes(categoryName)) {
        return icon;
      }
    }
    
    return '/assets/images/logo.png';
  }

  /**
   * 检查图标是否存在
   * @param {string} iconPath - 图标路径
   * @returns {Promise<boolean>} 图标是否存在
   */
  static async checkIconExists(iconPath) {
    return new Promise((resolve) => {
      if (!iconPath) {
        resolve(false);
        return;
      }
      
      // 对于本地资源，假设存在
      if (iconPath.startsWith('/assets/') || iconPath.startsWith('assets/')) {
        resolve(true);
        return;
      }
      
      // 对于网络资源，可以通过图片加载来检测
      const img = wx.createImage();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = iconPath;
    });
  }

  /**
   * 获取分类颜色主题
   * @param {string} categoryName - 分类名称
   * @returns {Object} 颜色主题对象
   */
  static getColorTheme(categoryName) {
    const colorThemes = {
      '美食': { primary: '#FF6B35', secondary: '#FFF0ED' },
      '生鲜': { primary: '#52C41A', secondary: '#F6FFED' },
      '甜品': { primary: '#FF69B4', secondary: '#FFF0F6' },
      '饮品': { primary: '#1890FF', secondary: '#E6F7FF' },
      '服装': { primary: '#722ED1', secondary: '#F9F0FF' },
      '日用品': { primary: '#FA8C16', secondary: '#FFF7E6' },
      '电子产品': { primary: '#13C2C2', secondary: '#E6FFFB' },
      '图书': { primary: '#EB2F96', secondary: '#FFF0F6' },
      '运动': { primary: '#F5222D', secondary: '#FFF1F0' },
      '美妆': { primary: '#FA541C', secondary: '#FFF2E8' }
    };
    
    return colorThemes[categoryName] || { primary: '#FF4D4F', secondary: '#FFF1F0' };
  }
}

/**
 * 分类导航工具
 */
export class CategoryNavigationUtils {
  
  /**
   * 跳转到分类页面
   * @param {number} categoryId - 分类ID
   * @param {string} categoryName - 分类名称（可选，用于标题设置）
   */
  static navigateToCategory(categoryId, categoryName = '') {
    const url = categoryId > 0 
      ? `/pages/category/index?category_id=${categoryId}`
      : '/pages/category/index';
    
    wx.navigateTo({
      url,
      success: () => {
        if (categoryName) {
          wx.setNavigationBarTitle({
            title: categoryName
          });
        }
      },
      fail: (error) => {
        console.error('跳转分类页面失败', error);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  }

  /**
   * 跳转到搜索页面并传入分类信息
   * @param {number} categoryId - 分类ID
   * @param {string} categoryName - 分类名称
   */
  static navigateToSearchWithCategory(categoryId, categoryName) {
    const url = `/pages/search/index?category_id=${categoryId}&category_name=${encodeURIComponent(categoryName)}`;
    
    wx.navigateTo({
      url,
      fail: (error) => {
        console.error('跳转搜索页面失败', error);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  }

  /**
   * 分享分类页面
   * @param {number} categoryId - 分类ID
   * @param {string} categoryName - 分类名称
   * @returns {Object} 分享配置对象
   */
  static shareCategory(categoryId, categoryName) {
    return {
      title: `${categoryName} - 发现更多好商品`,
      path: `/pages/category/index?category_id=${categoryId}`,
      imageUrl: '/assets/images/share-category.png'
    };
  }
}

// 导出默认对象
export default {
  CategoryUtils,
  CategoryIconUtils,
  CategoryNavigationUtils
};