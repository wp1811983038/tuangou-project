import { useState, useCallback } from 'react';
import axios from 'axios';
import { getToken } from './auth';
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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加处理CORS的头信息
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    config.headers['Access-Control-Allow-Origin'] = '*';
    
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
          // 可以在这里添加重定向到登录页面的逻辑
          break;
        case 403:
          errorMessage = '无权访问';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
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
  const fetchData = useCallback(async (options) => {
    try {
      setError(null);
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
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { fetchData, error, clearError };
};

// 导出实例以便直接使用
export default instance;