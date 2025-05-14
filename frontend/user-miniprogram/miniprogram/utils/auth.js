/**
 * utils/auth.js - 认证相关工具函数
 */

import { post } from './request';
import { apiPath, apiBaseUrl } from '../config/api'; 

// Token存储键名
const TOKEN_KEY = 'token';
const USER_INFO_KEY = 'userInfo';

/**
 * 保存token到本地存储
 * @param {string} token - JWT令牌
 */
export const setToken = (token) => {
  wx.setStorageSync(TOKEN_KEY, token);
};

/**
 * 获取本地存储的token
 * @returns {string|null} 存储的token或null
 */
export const getToken = () => {
  return wx.getStorageSync(TOKEN_KEY) || null;
};

/**
 * 清除本地存储的token
 */
export const removeToken = () => {
  wx.removeStorageSync(TOKEN_KEY);
};

/**
 * 保存用户信息到本地存储
 * @param {Object} userInfo - 用户信息对象
 */
export const setUserInfo = (userInfo) => {
  wx.setStorageSync(USER_INFO_KEY, userInfo);
};

/**
 * 获取本地存储的用户信息
 * @returns {Object|null} 用户信息对象或null
 */
export const getUserInfo = () => {
  return wx.getStorageSync(USER_INFO_KEY) || null;
};

/**
 * 清除本地存储的用户信息
 */
export const removeUserInfo = () => {
  wx.removeStorageSync(USER_INFO_KEY);
};

/**
 * 检查是否已登录
 * @returns {boolean} 是否已登录
 */
export const isLoggedIn = () => {
  return !!getToken();
};

/**
 * 微信登录，获取登录凭证（code）
 * @returns {Promise<string>} 登录凭证
 */
export const wxLogin = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve(res.code);
        } else {
          reject(new Error('微信登录失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * 获取用户信息（需用户授权）
 * @returns {Promise<Object>} 用户信息对象
 */
export const getUserProfile = () => {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        resolve(res.userInfo);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * 微信登录并获取服务器令牌
 * @param {Object} userInfo - 用户信息
 * @returns {Promise<Object>} 登录结果
 */
export const wxLoginAndGetToken = async (userInfo = null) => {
  try {
    // 微信登录获取code
    const code = await wxLogin();
    
    // 使用code向服务器换取用户信息和令牌
    const loginData = {
      code: code,
      user_info: userInfo
    };
    
    const result = await post(apiPath.auth.wxLogin, loginData);
    
    // 存储token和用户信息
    if (result.token) {
      setToken(result.token);
      setUserInfo(result.user);
      
      // 更新全局数据
      const app = getApp();
      if (app) {
        app.globalData.userInfo = result.user;
        app.globalData.token = result.token;
        app.globalData.hasLogin = true;
      }
    }
    
    return result;
  } catch (error) {
    console.error('微信登录失败', error);
    throw error;
  }
};

/**
 * 手机号登录
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 * @returns {Promise<Object>} 登录结果
 */
export const phoneLogin = async (phone, password) => {
  try {
    console.log('发送手机号登录请求...');
    
    const loginData = {
      phone: phone,
      password: password
    };
    
    const result = await post(apiPath.auth.phoneLogin, loginData);
    
    console.log('登录成功，接收到结果:', result);
    
    // 存储 token 和用户 ID
    if (result.access_token) {
      setToken(result.access_token);
      
      // 获取用户详细信息
      const app = getApp();
      if (app) {
        app.globalData.token = result.access_token;
        app.globalData.hasLogin = true;
        
        // 更新用户信息
        try {
          await getUserDetail();
        } catch (err) {
          console.error('获取用户详情失败', err);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('手机号登录失败', error);
    throw error;
  }
};

/**
 * 获取用户详细信息
 * @returns {Promise<Object>} 用户详细信息
 */
export const getUserDetail = async () => {
  try {
    // 将post改为get
    const result = await get(apiPath.user.profile);
    
    // 存储用户信息
    setUserInfo(result);
    
    // 更新全局数据
    const app = getApp();
    if (app) {
      app.globalData.userInfo = result;
    }
    
    return result;
  } catch (error) {
    console.error('获取用户信息失败', error);
    throw error;
  }
};

/**
 * 退出登录
 */
export const logout = () => {
  try {
    // 调用退出登录接口
    post(apiPath.auth.logout).catch(err => {
      console.error('退出登录接口调用失败', err);
    });
    
    // 清除本地存储
    removeToken();
    removeUserInfo();
    
    // 清除全局数据
    const app = getApp();
    if (app) {
      app.globalData.token = null;
      app.globalData.userInfo = null;
      app.globalData.hasLogin = false;
    }
    
    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/index'
    });
  } catch (error) {
    console.error('退出登录失败', error);
  }
};

/**
 * 检查登录状态，未登录则跳转到登录页
 * @param {boolean} redirect - 是否需要登录后重定向回当前页面
 * @returns {boolean} 是否已登录
 */
export const checkLoginStatus = (redirect = true) => {
  const loggedIn = isLoggedIn();
  
  if (!loggedIn && redirect) {
    const currentPage = getCurrentPageUrl();
    wx.navigateTo({
      url: `/pages/login/index?redirect=${encodeURIComponent(currentPage)}`
    });
  }
  
  return loggedIn;
};

/**
 * 获取当前页面URL
 * @returns {string} 当前页面完整路径
 */
export const getCurrentPageUrl = () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const url = `/${currentPage.route}`;
  
  const options = currentPage.options;
  const queryString = Object.keys(options)
    .map(key => `${key}=${options[key]}`)
    .join('&');
  
  return queryString ? `${url}?${queryString}` : url;
};

/**
 * 刷新token
 * @returns {Promise<string>} 新token
 */
export const refreshToken = async () => {
  try {
    const oldToken = getToken();
    
    if (!oldToken) {
      throw new Error('没有可刷新的token');
    }
    
    const result = await post(apiPath.auth.refresh, { token: oldToken });
    
    if (result.access_token) {
      setToken(result.access_token);
      
      // 更新全局数据
      const app = getApp();
      if (app) {
        app.globalData.token = result.access_token;
      }
      
      return result.access_token;
    } else {
      throw new Error('刷新token失败');
    }
  } catch (error) {
    console.error('刷新token失败', error);
    
    // 清除登录状态
    removeToken();
    removeUserInfo();
    
    // 更新全局数据
    const app = getApp();
    if (app) {
      app.globalData.token = null;
      app.globalData.userInfo = null;
      app.globalData.hasLogin = false;
    }
    
    throw error;
  }
};

export default {
  setToken,
  getToken,
  removeToken,
  setUserInfo,
  getUserInfo,
  removeUserInfo,
  isLoggedIn,
  wxLogin,
  getUserProfile,
  wxLoginAndGetToken,
  phoneLogin,
  getUserDetail,
  logout,
  checkLoginStatus,
  getCurrentPageUrl,
  refreshToken
};