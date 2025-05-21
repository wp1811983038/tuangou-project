import axios from 'axios';
import { getToken, removeToken } from './auth';
import { message } from 'antd';

// 创建axios实例，根据环境动态设置baseURL
const instance = axios.create({
  baseURL: window.location.hostname === 'localhost' ? '/api/v1' : 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const token = getToken();
    
    // 添加详细日志，但不暴露完整token内容
    console.log(`准备发送请求到 ${config.url}, Token状态: ${token ? '存在' : '不存在'}`);
    
    if (token) {
      // 确保使用正确的格式 - Bearer + 空格 + token
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn(`请求 ${config.url} 时没有提供认证Token`);
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
          if (window.location.pathname !== '/login') {
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
      }
      
      // 发送请求
      const response = await instance(options);
      return response;
    } catch (err) {
      console.error('请求失败:', err);
      setError(err.message || '请求失败');
      // 显示错误消息
      message.error(err.message || '请求失败');
      throw err;
    }
  };

  // 清除错误
  const clearError = () => {
    setError(null);
  };

  return { fetchData, error, clearError };
};

// 添加useState导入
import { useState } from 'react';

// 导出实例以便直接使用
export default instance;