Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 商品数据
    product: {
      type: Object,
      value: {}
    },
    // 卡片样式模式：'grid' | 'list'
    mode: {
      type: String,
      value: 'grid'
    },
    // 是否显示商户名称
    showMerchant: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 格式化后的价格显示
    currentPriceFormatted: '0.00',
    originalPriceFormatted: '0.00', 
    groupPriceFormatted: '0.00',
    // 格式化后的销量显示
    salesFormatted: 0,
    // 价格显示控制
    showOriginalPrice: false,
    showGroupPrice: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件实例被放入页面节点树后执行
      this.updatePriceDisplay();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'product': function(newProduct) {
      // 当product属性变化时，更新价格显示
      if (newProduct) {
        this.updatePriceDisplay();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 更新价格显示
    updatePriceDisplay() {
      const { product } = this.data;
      
      if (!product || !product.id) {
        console.log('商品数据为空，跳过价格更新');
        return;
      }
      
      console.log(`🏷️ 更新商品显示信息 - ${product.name}:`, {
        current_price: product.current_price,
        original_price: product.original_price,
        group_price: product.group_price,
        sales: product.sales
      });
      
      // 获取安全的价格值
      const currentPrice = this.getSafePrice(product, 'current_price');
      const originalPrice = this.getSafePrice(product, 'original_price');
      const groupPrice = this.getSafePrice(product, 'group_price');
      
      // 格式化价格
      const currentPriceFormatted = this.formatPrice(currentPrice);
      const originalPriceFormatted = this.formatPrice(originalPrice);
      const groupPriceFormatted = this.formatPrice(groupPrice);
      
      // 格式化销量
      const salesFormatted = this.formatSales(product.sales);
      
      // 计算显示控制
      const showOriginalPrice = originalPrice > currentPrice;
      const showGroupPrice = groupPrice > 0 && product.has_group;
      
      console.log(`💰 格式化结果:`, {
        currentPriceFormatted,
        originalPriceFormatted,
        groupPriceFormatted,
        salesFormatted,
        showOriginalPrice,
        showGroupPrice
      });
      
      // 更新显示数据
      this.setData({
        currentPriceFormatted,
        originalPriceFormatted,
        groupPriceFormatted,
        salesFormatted,
        showOriginalPrice,
        showGroupPrice
      });
    },

    // 点击商品卡片
    onTapCard() {
      const { product } = this.data;
      if (product.id) {
        // 触发父组件事件
        this.triggerEvent('tap', { 
          product: product,
          productId: product.id 
        });
      }
    },

    // 点击收藏按钮
    onTapFavorite(e) {
      e.stopPropagation(); // 阻止事件冒泡
      
      const { product } = this.data;
      this.triggerEvent('favorite', { 
        product: product,
        productId: product.id,
        isFavorite: product.is_favorite 
      });
    },

    // 点击购买按钮
    onTapBuy(e) {
      e.stopPropagation(); // 阻止事件冒泡
      
      const { product } = this.data;
      this.triggerEvent('buy', { 
        product: product,
        productId: product.id 
      });
    },

    // 格式化价格显示
    formatPrice(price) {
      // 更强的类型检查和转换
      if (price === null || price === undefined || price === '' || isNaN(price)) {
        return '0.00';
      }
      
      const numPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
      
      if (isNaN(numPrice)) {
        return '0.00';
      }
      
      return numPrice.toFixed(2);
    },

    // 格式化销量显示
    formatSales(sales) {
      // 更强的类型检查
      if (sales === null || sales === undefined || sales === '' || isNaN(sales)) {
        return 0;
      }
      
      const numSales = typeof sales === 'string' ? parseInt(sales) : Number(sales);
      
      if (isNaN(numSales) || numSales <= 0) {
        return 0;
      }
      
      if (numSales >= 10000) {
        return `${(numSales / 10000).toFixed(1)}万`;
      }
      return numSales;
    },

    // 获取安全的商品价格 - 优化版本
    getSafePrice(product, priceField) {
      if (!product) {
        console.warn('商品数据为空');
        return 0;
      }
      
      const price = product[priceField];
      
      // 如果价格有效，直接返回
      if (price !== null && price !== undefined && price !== '' && !isNaN(price)) {
        return Number(price);
      }
      
      // 价格无效时的处理
      console.warn(`商品 ${product.name || '未知'} 的 ${priceField} 字段无效:`, price);
      
      // 返回0而不是默认价格，避免误导用户
      return 0;
    }
  }
});