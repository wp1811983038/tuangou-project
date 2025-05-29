// ========== 我的优惠券页面 (pages/user/coupons/index.js) ==========
const couponsPage = {
  data: {
    coupons: [],
    currentTab: 0, // 0: 未使用, 1: 已使用, 2: 已过期
    loading: false
  },

  onLoad() {
    this.loadCoupons();
  },

  async loadCoupons() {
    this.setData({ loading: true });
    try {
      // 模拟优惠券数据
      setTimeout(() => {
        this.setData({
          loading: false,
          coupons: [
            {
              id: 1,
              name: '新用户专享券',
              amount: 5,
              minAmount: 30,
              expireDate: '2024-12-31',
              status: 0
            }
          ]
        });
      }, 1000);
    } catch (error) {
      this.setData({ loading: false });
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    this.loadCoupons();
  }
};
