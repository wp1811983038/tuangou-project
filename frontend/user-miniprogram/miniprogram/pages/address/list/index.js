// pages/address/list/index.js
import { getAddressList, deleteAddress, setDefaultAddress } from '../../../services/address';
import { checkLoginStatus } from '../../../utils/auth';

Page({
  data: {
    addressList: [],
    loading: false,
    fromOrder: false, // 是否从订单页面跳转而来
    selectedAddressId: null // 当前选中的地址ID
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('地址列表页面加载', options);
    
    // 检查登录状态
    if (!checkLoginStatus()) {
      return;
    }
    
    // 判断是否从订单页面跳转而来
    if (options.from === 'order') {
      this.setData({ 
        fromOrder: true,
        selectedAddressId: options.selected ? parseInt(options.selected) : null
      });
      
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: '选择收货地址'
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时刷新地址列表
    this.loadAddressList();
  },

  /**
   * 加载地址列表
   */
  async loadAddressList() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      console.log('开始加载地址列表...');
      const addressList = await getAddressList();
      
      console.log(`获取到 ${addressList.length} 个地址`);
      
      // 排序：默认地址排在最前面
      addressList.sort((a, b) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return b.id - a.id; // 按ID倒序
      });
      
      this.setData({ addressList });
      
    } catch (error) {
      console.error('加载地址列表失败', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 点击地址项
   */
  onAddressItemTap(e) {
    const address = e.currentTarget.dataset.address;
    
    // 如果是从订单页面来的，选择地址后返回
    if (this.data.fromOrder) {
      console.log('选择地址并返回订单页面', address);
      
      // 将选中的地址存储到全局或事件总线
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      if (prevPage) {
        // 调用上一页的方法设置选中的地址
        prevPage.setSelectedAddress(address);
      }
      
      // 返回上一页
      wx.navigateBack();
    } else {
      // 否则显示操作菜单
      this.showAddressActions(address);
    }
  },

  /**
   * 显示地址操作菜单
   */
  showAddressActions(address) {
    const itemList = address.is_default 
      ? ['编辑', '删除'] 
      : ['设为默认', '编辑', '删除'];
    
    wx.showActionSheet({
      itemList,
      success: (res) => {
        const index = res.tapIndex;
        
        if (address.is_default) {
          // 已是默认地址
          if (index === 0) {
            this.onEditAddress({ currentTarget: { dataset: { id: address.id } } });
          } else if (index === 1) {
            this.confirmDeleteAddress(address.id);
          }
        } else {
          // 非默认地址
          if (index === 0) {
            this.handleSetDefault(address.id);
          } else if (index === 1) {
            this.onEditAddress({ currentTarget: { dataset: { id: address.id } } });
          } else if (index === 2) {
            this.confirmDeleteAddress(address.id);
          }
        }
      }
    });
  },

  /**
   * 添加新地址
   */
  onAddAddress() {
    wx.showActionSheet({
      itemList: ['手动输入地址', '从微信地址导入'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 手动输入
          wx.navigateTo({
            url: '/pages/address/edit/index'
          });
        } else {
          // 从微信导入
          this.importFromWechat();
        }
      }
    });
  },

  /**
   * 编辑地址
   */
  onEditAddress(e) {
    const addressId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/address/edit/index?id=${addressId}`
    });
  },

  /**
   * 确认删除地址
   */
  confirmDeleteAddress(addressId) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      confirmText: '删除',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          this.handleDeleteAddress(addressId);
        }
      }
    });
  },

  /**
   * 处理删除地址
   */
  async handleDeleteAddress(addressId) {
    wx.showLoading({ title: '删除中...' });
    
    try {
      await deleteAddress(addressId);
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
      // 重新加载列表
      this.loadAddressList();
      
    } catch (error) {
      console.error('删除地址失败', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 设置默认地址
   */
  async handleSetDefault(addressId) {
    wx.showLoading({ title: '设置中...' });
    
    try {
      await setDefaultAddress(addressId);
      
      wx.showToast({
        title: '设置成功',
        icon: 'success'
      });
      
      // 重新加载列表
      this.loadAddressList();
      
    } catch (error) {
      console.error('设置默认地址失败', error);
      wx.showToast({
        title: '设置失败',
        icon: 'none'
      });
    }
  },

  /**
   * 从微信导入地址
   */
  importFromWechat() {
    wx.chooseAddress({
      success: async (res) => {
        console.log('微信地址选择成功', res);
        
        // 导入微信地址
        try {
          const addressData = {
            consignee: res.userName,
            phone: res.telNumber,
            province: res.provinceName,
            city: res.cityName,
            district: res.countyName,
            address: res.detailInfo,
            postal_code: res.postalCode || '',
            is_default: this.data.addressList.length === 0 // 如果是第一个地址，设为默认
          };
          
          // 跳转到编辑页面，预填充数据
          const addressDataStr = encodeURIComponent(JSON.stringify(addressData));
          wx.navigateTo({
            url: `/pages/address/edit/index?wxData=${addressDataStr}`
          });
          
        } catch (error) {
          console.error('导入地址失败', error);
          wx.showToast({
            title: '导入失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('选择地址失败', err);
        
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '授权提示',
            content: '需要您授权获取地址信息',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadAddressList().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});