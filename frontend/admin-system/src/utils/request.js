// frontend/admin-system/src/utils/request.js

import axios from 'axios';
import { message } from 'antd';
import { getToken, clearAllStorageData } from './storage';

// 创建axios实例
const request = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加token到请求头
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
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
    
    // 正常返回数据，根据后端API格式提取数据
    return response.data;
  },
  (error) => {
    const { response } = error;
    
    if (response && response.status) {
      const { status, data } = response;
      
      // 处理401未授权错误
      if (status === 401) {
        message.error('登录已过期，请重新登录');
        clearAllStorageData();
        // 重定向到登录页
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } 
      // 处理其他错误
      else {
        const errorMsg = data.detail || data.message || '请求失败';
        message.error(errorMsg);
      }
    } else {
      // 处理请求超时或网络错误
      if (error.message.includes('timeout')) {
        message.error('请求超时，请稍后再试');
      } else {
        message.error('网络错误，请检查您的网络连接');
      }
    }
    
    return Promise.reject(error);
  }
);

export default request;