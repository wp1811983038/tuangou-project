// pages/login/index.js - 登录页面逻辑
import { wxLoginAndGetToken, phoneLogin, getUserProfile } from '../../utils/auth';
import { appConfig } from '../../config/app';
import { regexPatterns } from '../../config/app';

Page({
  data: {
    appName: appConfig.appName,
    subtitle: '让团购更简单',
    loginType: 'wechat', // 'wechat'微信登录 或 'phone'手机号登录
    phone: '',          // 手机号
    password: '',       // 密码
    agreeProtocol: true, // 是否同意协议
    loading: false,     // 加载状态
    redirect: '',       // 登录成功后的重定向地址
  },

  onLoad(options) {
    // 记录重定向地址，用于登录成功后跳转
    if (options.redirect) {
      this.setData({
        redirect: decodeURIComponent(options.redirect)
      });
    }
  },

  // 切换登录方式
  switchLoginType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      loginType: type
    });
  },

  // 输入手机号
  inputPhone(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  // 输入密码
  inputPassword(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 切换协议同意状态
  toggleAgreement() {
    this.setData({
      agreeProtocol: !this.data.agreeProtocol
    });
  },

  // 查看协议
  viewProtocol(e) {
    const type = e.currentTarget.dataset.type;
    let url = '';

    if (type === 'user') {
      url = '/pages/webview/index?title=用户协议&url=https://example.com/user-agreement';
    } else if (type === 'privacy') {
      url = '/pages/webview/index?title=隐私政策&url=https://example.com/privacy-policy';
    }

    wx.navigateTo({ url });
  },

  // 微信登录
  async handleWxLogin() {
    // 检查是否同意协议
    if (!this.checkAgreement()) return;

    this.setData({ loading: true });

    try {
      // 获取用户信息
      const userInfo = await getUserProfile();
      
      // 调用登录接口
      const result = await wxLoginAndGetToken(userInfo);

      // 登录成功
      if (result.token) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        this.loginSuccess();
      }
    } catch (error) {
      console.error('微信登录失败', error);
      
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 手机号登录
  async handlePhoneLogin() {
    // 检查是否同意协议
    if (!this.checkAgreement()) return;

    // 表单验证
    if (!this.validatePhoneForm()) return;

    this.setData({ loading: true });

    try {
      // 调用登录接口
      const result = await phoneLogin(this.data.phone, this.data.password);

      // 登录成功
      if (result.access_token) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        this.loginSuccess();
      }
    } catch (error) {
      console.error('手机号登录失败', error);
      
      // 根据错误类型显示不同提示
      if (error.response && error.response.data && error.response.data.detail) {
        wx.showToast({
          title: error.response.data.detail,
          icon: 'none'
        });
      } else {
        wx.showToast({
          title: '登录失败，请检查账号密码',
          icon: 'none'
        });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  // 跳转到注册页面
  goToRegister() {
    wx.navigateTo({
      url: '/pages/login/register/index'
    });
  },

  // 跳转到忘记密码页面
  goToForgetPassword() {
    wx.navigateTo({
      url: '/pages/login/forget/index'
    });
  },

  // 验证手机号表单
  validatePhoneForm() {
    const { phone, password } = this.data;

    // 验证手机号
    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return false;
    }

    if (!regexPatterns.phone.test(phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return false;
    }

    // 验证密码
    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return false;
    }

    if (!regexPatterns.password.test(password)) {
      wx.showToast({
        title: '密码格式不正确',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 检查是否同意协议
  checkAgreement() {
    if (!this.data.agreeProtocol) {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none'
      });
      return false;
    }
    return true;
  },

  // 登录成功后的处理
  loginSuccess() {
    setTimeout(() => {
      const app = getApp();
      
      // 更新全局登录状态
      if (app) {
        app.globalData.hasLogin = true;
      }
      
      // 处理重定向
      if (this.data.redirect) {
        wx.redirectTo({
          url: this.data.redirect,
          fail: () => {
            // 如果重定向失败（比如是tabBar页面），则切换到首页
            wx.switchTab({
              url: '/pages/index/index'
            });
          }
        });
      } else {
        // 默认跳转到首页
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    }, 1500);
  }
});