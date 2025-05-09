/**
 * utils/request.js - 网络请求封装
 */

import { apiBaseUrl } from '../config/api';
import { getToken, refreshToken } from './auth';
import { appConfig } from '../config/app';

// 请求队列，用于处理token刷新
let requestQueue = [];
// 是否正在刷新token
let isRefreshing = false;

/**
 * 通用请求函数
 * @param {Object} options - 请求配置
 * @returns {Promise} 请求结果
 */
const request = (options = {}) => {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    showLoading = true,
    loadingTitle = '加载中...',
    showError = true,
    retry = appConfig.request.retry,
    baseUrl = apiBaseUrl
  } = options;

  // 显示加载中
  if (showLoading) {
    wx.showLoading({
      title: loadingTitle,
      mask: true
    });
  }

  // 构建完整URL
  const requestUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  // 构建请求头
  const requestHeader = {
    'Content-Type': 'application/json',
    ...header
  };

  // 添加token
  const token = getToken();
  if (token) {
    requestHeader['Authorization'] = `Bearer ${token}`;
  }

  // 发起请求
  return new Promise((resolve, reject) => {
    wx.request({
      url: requestUrl,
      method,
      data,
      header: requestHeader,
      timeout: appConfig.request.timeout,
      success: (res) => {
        // 请求成功但状态码异常
        if (res.statusCode !== 200) {
          // Token过期，尝试刷新
          if (res.statusCode === 401 && token) {
            // 将请求加入队列
            const requestTask = { options, resolve, reject };
            requestQueue.push(requestTask);
            
            // 如果不是正在刷新token，则开始刷新
            if (!isRefreshing) {
              isRefreshing = true;
              
              refreshToken()
                .then(newToken => {
                  // 刷新成功，处理队列中的请求
                  requestQueue.forEach(task => {
                    // 更新token
                    const taskHeader = task.options.header || {};
                    taskHeader['Authorization'] = `Bearer ${newToken}`;
                    task.options.header = taskHeader;
                    
                    // 重新发起请求
                    request(task.options)
                      .then(task.resolve)
                      .catch(task.reject);
                  });
                  
                  // 清空队列
                  requestQueue = [];
                })
                .catch(error => {
                  // 刷新失败，队列中的所有请求都失败
                  requestQueue.forEach(task => {
                    task.reject(error);
                  });
                  
                  // 清空队列
                  requestQueue = [];
                  
                  // 提示用户重新登录
                  if (showError) {
                    wx.showToast({
                      title: '登录已过期，请重新登录',
                      icon: 'none',
                      duration: 2000
                    });
                  }
                  
                  // 跳转到登录页
                  setTimeout(() => {
                    wx.navigateTo({
                      url: '/pages/login/index'
                    });
                  }, 1000);
                })
                .finally(() => {
                  isRefreshing = false;
                });
            }
            
            return;
          }
          
          // 其他错误
          if (showError) {
            let errorMsg = '';
            
            if (res.data && res.data.detail) {
              errorMsg = res.data.detail;
            } else if (res.data && res.data.message) {
              errorMsg = res.data.message;
            } else {
              switch (res.statusCode) {
                case 400:
                  errorMsg = '请求参数错误';
                  break;
                case 401:
                  errorMsg = '未授权，请登录';
                  break;
                case 403:
                  errorMsg = '拒绝访问';
                  break;
                case 404:
                  errorMsg = '请求资源不存在';
                  break;
                case 500:
                  errorMsg = '服务器内部错误';
                  break;
                default:
                  errorMsg = `请求失败(${res.statusCode})`;
              }
            }
            
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 2000
            });
          }
          
          reject({ ...res, message: res.data?.detail || '请求失败' });
          return;
        }
        
        // 请求成功
        resolve(res.data);
      },
      fail: (err) => {
        // 网络错误或超时
        if (showError) {
          wx.showToast({
            title: '网络请求失败，请检查网络连接',
            icon: 'none',
            duration: 2000
          });
        }
        
        // 请求失败，如果还有重试次数，则重试
        if (retry > 0) {
          setTimeout(() => {
            request({
              ...options,
              retry: retry - 1
            }).then(resolve).catch(reject);
          }, 1000);
          return;
        }
        
        reject(err);
      },
      complete: () => {
        // 隐藏加载提示
        if (showLoading) {
          wx.hideLoading();
        }
      }
    });
  });
};

/**
 * GET请求
 * @param {string} url - 请求地址
 * @param {Object} data - 请求参数
 * @param {Object} options - 请求配置
 * @returns {Promise} 请求结果
 */
export const get = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  });
};

/**
 * POST请求
 * @param {string} url - 请求地址
 * @param {Object} data - 请求参数
 * @param {Object} options - 请求配置
 * @returns {Promise} 请求结果
 */
export const post = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  });
};

/**
 * PUT请求
 * @param {string} url - 请求地址
 * @param {Object} data - 请求参数
 * @param {Object} options - 请求配置
 * @returns {Promise} 请求结果
 */
export const put = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  });
};

/**
 * DELETE请求
 * @param {string} url - 请求地址
 * @param {Object} data - 请求参数
 * @param {Object} options - 请求配置
 * @returns {Promise} 请求结果
 */
export const del = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  });
};

/**
 * 上传文件
 * @param {string} url - 上传地址
 * @param {string} filePath - 本地文件路径
 * @param {string} name - 文件对应的key
 * @param {Object} formData - 额外的表单数据
 * @param {Object} options - 上传配置
 * @returns {Promise} 上传结果
 */
export const uploadFile = (url, filePath, name = 'file', formData = {}, options = {}) => {
  const {
    showLoading = true,
    loadingTitle = '上传中...',
    showError = true,
    baseUrl = apiBaseUrl
  } = options;

  // 显示加载中
  if (showLoading) {
    wx.showLoading({
      title: loadingTitle,
      mask: true
    });
  }

  // 构建完整URL
  const requestUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  // 构建请求头
  const header = {
    ...options.header
  };

  // 添加token
  const token = getToken();
  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    const uploadTask = wx.uploadFile({
      url: requestUrl,
      filePath,
      name,
      formData,
      header,
      success: (res) => {
        // 请求成功但状态码异常
        if (res.statusCode !== 200) {
          if (showError) {
            wx.showToast({
              title: '上传失败',
              icon: 'none',
              duration: 2000
            });
          }
          
          reject({ statusCode: res.statusCode, errMsg: res.errMsg });
          return;
        }
        
        // 请求成功，但返回的是字符串，需要转为对象
        try {
          const data = JSON.parse(res.data);
          resolve(data);
        } catch (e) {
          resolve(res.data);
        }
      },
      fail: (err) => {
        if (showError) {
          wx.showToast({
            title: '上传失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
        
        reject(err);
      },
      complete: () => {
        if (showLoading) {
          wx.hideLoading();
        }
      }
    });
    
    // 监听上传进度
    uploadTask.onProgressUpdate((res) => {
      // 回调上传进度
      if (options.onProgress) {
        options.onProgress(res.progress);
      }
    });
  });
};

export default {
  get,
  post,
  put,
  delete: del,
  uploadFile,
  request
};