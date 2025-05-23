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

  },

  /**
   * 组件的方法列表
   */
  methods: {
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
      if (!price && price !== 0) return '0.00';
      return parseFloat(price).toFixed(2);
    },

    // 格式化销量显示
    formatSales(sales) {
      if (!sales) return 0;
      if (sales >= 10000) {
        return `${(sales / 10000).toFixed(1)}万`;
      }
      return sales;
    }
  }
});