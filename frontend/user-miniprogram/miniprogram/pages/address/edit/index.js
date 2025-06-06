// pages/address/edit/index.js
import { 
  getAddressDetail, 
  createAddress, 
  updateAddress, 
  validateAddressData 
} from '../../../services/address';
import { checkLoginStatus } from '../../../utils/auth';

Page({
  data: {
    addressId: null, // 地址ID（编辑时）
    isEdit: false, // 是否编辑模式
    
    // 表单数据
    formData: {
      consignee: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      address: '',
      postal_code: '',
      is_default: false
    },
    
    // 地区选择器
    region: ['广东省', '深圳市', '南山区'],
    customItem: '全部',
    showRegionPicker: false,
    
    // 提交状态
    submitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    console.log('地址编辑页面加载', options);
    
    // 检查登录状态
    if (!checkLoginStatus()) {
      return;
    }
    
    // 判断是新增还是编辑
    if (options.id) {
      // 编辑模式
      this.setData({ 
        addressId: parseInt(options.id),
        isEdit: true 
      });
      
      wx.setNavigationBarTitle({
        title: '编辑地址'
      });
      
      // 加载地址详情
      await this.loadAddressDetail();
      
    } else if (options.wxData) {
      // 从微信地址导入
      try {
        const wxData = JSON.parse(decodeURIComponent(options.wxData));
        this.setData({
          formData: wxData,
          region: [wxData.province, wxData.city, wxData.district]
        });
      } catch (error) {
        console.error('解析微信地址数据失败', error);
      }
    }
  },

  /**
   * 加载地址详情
   */
  async loadAddressDetail() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const address = await getAddressDetail(this.data.addressId);
      
      this.setData({
        formData: {
          consignee: address.consignee || '',
          phone: address.phone || '',
          province: address.province || '',
          city: address.city || '',
          district: address.district || '',
          address: address.address || '',
          postal_code: address.postal_code || '',
          is_default: address.is_default || false
        },
        region: [
          address.province || '',
          address.city || '',
          address.district || ''
        ]
      });
      
    } catch (error) {
      console.error('加载地址详情失败', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      
      // 加载失败，返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 输入框变化
   */
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: value
    });
  },

  /**
   * 开关变化
   */
  onSwitchChange(e) {
    this.setData({
      'formData.is_default': e.detail.value
    });
  },

  /**
   * 选择地区
   */
  chooseLocation() {
    // 可以选择使用地区选择器或地图选点
    wx.showActionSheet({
      itemList: ['选择省市区', '地图选点'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 显示地区选择器
          this.showRegionSelector();
        } else {
          // 地图选点
          this.chooseLocationFromMap();
        }
      }
    });
  },

  /**
   * 显示地区选择器
   */
  showRegionSelector() {
    // 创建一个临时的picker组件来选择地区
    const that = this;
    wx.showModal({
      title: '选择地区',
      content: '点击确定打开地区选择器',
      success(res) {
        if (res.confirm) {
          // 触发系统的地区选择器
          that.setData({ showRegionPicker: true }, () => {
            // 模拟点击picker
            const query = wx.createSelectorQuery();
            query.select('picker').node().exec((res) => {
              if (res[0]) {
                res[0].node.click();
              }
            });
          });
        }
      }
    });
  },

  /**
   * 地区选择器变化
   */
  onRegionChange(e) {
    console.log('地区选择器变化', e);
    
    const region = e.detail.value;
    
    this.setData({
      region,
      'formData.province': region[0],
      'formData.city': region[1],
      'formData.district': region[2],
      showRegionPicker: false
    });
  },

  /**
   * 地图选点
   */
  chooseLocationFromMap() {
    wx.chooseLocation({
      success: (res) => {
        console.log('地图选点成功', res);
        
        // 需要将地址解析为省市区格式
        // 这里简化处理，实际可能需要调用逆地理编码API
        this.setData({
          'formData.address': res.address + res.name,
          // 如果有省市区信息，也可以设置
        });
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '授权提示',
            content: '需要您授权获取位置信息',
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
   * 表单提交
   */
  async onFormSubmit(e) {
    if (this.data.submitting) return;
    
    // 获取表单数据
    const formData = this.data.formData;
    
    // 验证数据
    const errors = validateAddressData(formData);
    if (errors.length > 0) {
      wx.showToast({
        title: errors[0],
        icon: 'none'
      });
      return;
    }
    
    // 开始提交
    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });
    
    try {
      if (this.data.isEdit) {
        // 更新地址
        await updateAddress(this.data.addressId, formData);
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        // 创建地址
        await createAddress(formData);
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      }
      
      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      console.error('保存地址失败', error);
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 取消
   */
  onCancel() {
    wx.navigateBack();
  },

  /**
   * 快速填充测试数据（仅开发时使用）
   */
  fillTestData() {
    this.setData({
      formData: {
        consignee: '张三',
        phone: '13800138000',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        address: '科技园南路88号',
        postal_code: '518000',
        is_default: false
      },
      region: ['广东省', '深圳市', '南山区']
    });
  }
});