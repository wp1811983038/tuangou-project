// src/utils/request.js
import axios from 'axios';
import { 
  getToken, removeToken, refreshTokenIfNeeded, 
  isTokenExpired, isTokenValid 
} from './auth';
import { message } from 'antd';
import { useState } from 'react';

// 创建axios实例，根据环境动态设置baseURL
const instance = axios.create({
  baseURL: window.location.hostname === 'localhost' ? '/api/v1' : 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 标记用于标识正在刷新令牌的状态，防止多个请求同时触发刷新
let isRefreshing = false;
// 等待令牌刷新的请求队列
let refreshSubscribers = [];

// 将请求添加到等待队列
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// 执行队列中的所有请求
const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

// 请求拦截器
instance.interceptors.request.use(
  async (config) => {
    // 不处理刷新令牌和验证令牌的请求，避免循环
    const isAuthRequest = config.url.includes('/auth/') && !config.url.includes('/auth/me');
    
    // 日志记录
    console.log(`准备发送请求到 ${config.url}`);
    
    if (!isAuthRequest) {
      const token = getToken();
      
      // 检查是否有令牌
      if (token) {
        // 如果令牌已过期，但允许自动刷新
        if (isTokenExpired() && config.allowRefresh !== false) {
          console.log(`请求 ${config.url} 时令牌已过期，尝试刷新`);
          
          // 避免多个请求同时触发刷新
          if (!isRefreshing) {
            isRefreshing = true;
            
            try {
              // 尝试刷新令牌
              const refreshed = await refreshTokenIfNeeded();
              isRefreshing = false;
              
              if (refreshed) {
                const newToken = getToken();
                onTokenRefreshed(newToken);
                config.headers.Authorization = `Bearer ${newToken}`;
              } else {
                // 刷新失败，清除令牌
                removeToken();
                
                // 如果需要认证但不强制跳转，则抛出错误
                if (config.requireAuth !== false && config.noRedirect !== true) {
                  message.error('登录已过期，请重新登录');
                  setTimeout(() => {
                    window.location.href = '/login';
                  }, 1500);
                  
                  return Promise.reject(new Error('登录已过期'));
                }
              }
            } catch (error) {
              console.error('刷新令牌失败:', error);
              isRefreshing = false;
              // 清除令牌
              removeToken();
              
              // 如果需要认证，则抛出错误
              if (config.requireAuth !== false) {
                return Promise.reject(new Error('刷新令牌失败'));
              }
            }
          } else {
            // 如果已经在刷新，将请求加入队列
            return new Promise((resolve) => {
              subscribeTokenRefresh((token) => {
                config.headers.Authorization = `Bearer ${token}`;
                resolve(config);
              });
            });
          }
        } else if (!isTokenExpired()) {
          // 如果令牌未过期，直接使用
          config.headers.Authorization = `Bearer ${token}`;
        }
      } else if (config.requireAuth !== false) {
        // 如果请求需要认证但没有令牌，记录警告
        console.warn(`请求 ${config.url} 时没有有效的认证Token`);
      }
    }
    
    // 添加处理CORS的头信息
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    // 如果响应数据包含data字段，则直接返回data字段
    if (response.data && (response.data.data !== undefined || response.data.code !== undefined)) {
      // 如果是API响应格式
      if (response.data.code === 0 || response.data.code === 200) {
        return response.data.data;
      } else if (response.data.code) {
        // 如果有错误码但不是成功
        const error = new Error(response.data.message || '请求失败');
        error.response = response;
        error.code = response.data.code;
        throw error;
      }
    }
    
    // 否则返回整个数据
    return response.data;
  },
  (error) => {
    let errorMessage = '服务器错误，请稍后再试';
    
    if (error.response) {
      // 服务器响应了，但状态码不是2xx
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          errorMessage = data.message || data.detail || '请求参数错误';
          break;
        case 401:
          errorMessage = '未授权，请重新登录';
          // 清除无效的token
          removeToken();
          // 如果不是登录页面，重定向到登录页
          if (window.location.pathname !== '/login' && error.config.noRedirect !== true) {
            message.error('登录已过期，请重新登录');
            setTimeout(() => {
              window.location.href = '/login';
            }, 1500);
          }
          break;
        case 403:
          errorMessage = '无权访问';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 422:
          errorMessage = data.message || data.detail || '请求数据验证失败';
          console.error('422错误详情:', data);
          break;
        case 500:
          errorMessage = '服务器错误，请稍后再试';
          break;
        default:
          errorMessage = data.message || data.detail || `请求失败(${status})`;
          break;
      }
      
      error.message = errorMessage;
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      errorMessage = '网络错误，请检查您的网络连接';
      error.message = errorMessage;
    }
    
    return Promise.reject(error);
  }
);

export const useRequest = () => {
  const [error, setError] = useState(null);

  // 请求数据的方法
  const fetchData = async (options) => {
    try {
      setError(null);
      // 请求前检查token
      const token = getToken();
      if (!token && options.requireAuth !== false) {
        console.warn(`发送请求 ${options.url} 时没有有效的认证Token`);
        
        // 如果强制要求认证，则直接返回错误
        if (options.forceAuth === true) {
          message.error('请先登录');
          throw new Error('未登录');
        }
      }
      
      // 发送请求
      const response = await instance(options);
      return response;
    } catch (err) {
      console.error('请求失败:', err);
      setError(err.message || '请求失败');
      // 显示错误消息，除非明确指定不显示
      if (options.showError !== false) {
        message.error(err.message || '请求失败');
      }
      throw err;
    }
  };

  // 清除错误
  const clearError = () => {
    setError(null);
  };

  return { fetchData, error, clearError };
};

// 添加验证令牌有效性的方法
export const verifyToken = async () => {
  try {
    const token = getToken();
    if (!token) return false;
    
    const response = await instance.post('/auth/verify-token', { token }, {
      requireAuth: false // 不需要自动添加认证头
    });
    
    return response && response.valid === true;
  } catch (error) {
    console.error('验证令牌失败:', error);
    return false;
  }
};

// 辅助方法：退出登录
export const logout = async (redirect = true) => {
  try {
    // 调用登出API
    await instance.post('/auth/logout', {}, {
      noRedirect: true // 防止401时自动跳转
    });
  } catch (error) {
    console.error('登出API调用失败:', error);
  }
  
  // 清除令牌
  removeToken();
  
  // 重定向到登录页
  if (redirect) {
    setTimeout(() => {
      window.location.href = '/login';
    }, 300);
  }
};

// 导出实例以便直接使用
export default instance;