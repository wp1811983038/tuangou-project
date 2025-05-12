// frontend/admin-system/src/utils/request.js

import axios from 'axios';
import { message } from 'antd';
import { getToken, clearAllStorageData } from './storage';

// 创建axios实例
const request = axios.create({
  baseURL: '/api/v1',
  timeout: 15000, // 增加超时时间
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加token到请求头
    const token = getToken();
    
    // 记录请求信息 (开发环境调试用)
    if (process.env.NODE_ENV === 'development') {
      console.log(`请求: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
        hasToken: !!token
      });
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 如果返回的是二进制数据，直接返回
    if (response.config.responseType === 'blob') {
      return response;
    }
    
    // 开发环境记录响应
    if (process.env.NODE_ENV === 'development') {
      console.log(`响应: ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
    }
    
    // 正常返回数据，根据后端API格式提取数据
    return response.data;
  },
  (error) => {
    // 详细记录错误
    console.error('请求失败:', error);
    
    const { response } = error;
    
    if (response && response.status) {
      const { status, data } = response;
      
      // 详细记录API错误
      console.error(`API错误: 状态码 ${status}`, {
        url: response.config?.url,
        method: response.config?.method,
        data: response.config?.data,
        responseData: data
      });
      
      // 处理401未授权错误
      if (status === 401) {
        message.error('登录已过期，请重新登录');
        clearAllStorageData();
        
        // 避免在登录页重复提示
        if (window.location.pathname !== '/login') {
          // 重定向到登录页
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      } 
      // 处理403权限错误 
      else if (status === 403) {
        // 安全地处理错误消息
        let errorMsg = '您没有权限执行此操作';
        
        if (data && data.detail) {
          if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else if (typeof data.detail === 'object') {
            try {
              errorMsg = JSON.stringify(data.detail);
            } catch (e) {
              // 保持默认错误消息
            }
          }
        }
        
        message.error(errorMsg);
      }
      // 处理404错误
      else if (status === 404) {
        message.error('请求的资源不存在');
      }
      // 处理400错误
      else if (status === 400) {
        // 安全地处理错误消息
        let errorMsg = '请求参数错误';
        
        if (data) {
          if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else if (data.message) {
            errorMsg = data.message;
          } else if (typeof data.detail === 'object') {
            try {
              // 尝试将对象转换为友好的错误消息
              errorMsg = '请求错误: ';
              Object.entries(data.detail).forEach(([key, value]) => {
                const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
                errorMsg += `${key} - ${valueStr}; `;
              });
            } catch (e) {
              console.error('解析错误详情失败:', e);
              // 使用默认错误消息
            }
          }
        }
        
        message.error(errorMsg);
      }
      // 处理500及其他服务器错误
      else if (status >= 500) {
        message.error('服务器错误，请稍后再试');
      }
      // 处理其他错误状态码
      else {
        // 尝试提取错误消息
        let errorMsg = '请求失败';
        
        if (data) {
          if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else if (data.message) {
            errorMsg = data.message;
          } else if (typeof data.detail === 'object') {
            try {
              errorMsg = JSON.stringify(data.detail);
            } catch (e) {
              // 保持默认错误消息
            }
          }
        }
        
        message.error(errorMsg);
      }
    } else {
      // 处理请求超时或网络错误
      if (error.message) {
        if (error.message.includes('timeout')) {
          message.error('请求超时，请稍后再试');
        } else if (error.message.includes('Network Error')) {
          message.error('网络错误，请检查您的网络连接');
        } else {
          message.error(`请求失败: ${error.message}`);
        }
      } else {
        message.error('请求失败，请稍后再试');
      }
    }
    
    // 返回经过处理的错误信息，方便后续处理
    return Promise.reject({
      ...error,
      friendlyMessage: getFriendlyErrorMessage(error)
    });
  }
);

/**
 * 获取友好的错误消息
 * @param {Error} error - 原始错误对象
 * @returns {string} 友好错误消息
 */
function getFriendlyErrorMessage(error) {
  if (!error) return '未知错误';
  
  // 处理响应错误
  if (error.response) {
    const { status, data } = error.response;
    
    // 根据状态码返回不同的友好消息
    switch (status) {
      case 400: return '请求参数错误，请检查输入';
      case 401: return '登录已过期，请重新登录';
      case 403: return '您没有权限执行此操作';
      case 404: return '请求的资源不存在';
      case 500: return '服务器错误，请稍后再试';
      default: {
        // 尝试从响应中提取错误消息
        if (data && typeof data.detail === 'string') {
          return data.detail;
        } else if (data && data.message) {
          return data.message;
        } else {
          return `请求失败 (${status})`;
        }
      }
    }
  }
  
  // 处理请求错误
  if (error.request) {
    if (error.message?.includes('timeout')) {
      return '请求超时，请检查网络并稍后再试';
    } else {
      return '网络错误，请检查您的网络连接';
    }
  }
  
  // 处理其他错误
  return error.message || '未知错误';
}

export default request;