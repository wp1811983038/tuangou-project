// frontend/utils/request.ts
import type { ApiResponse } from '../types/api';

// 请求配置接口
export interface RequestOptions {
  url: string; // 必需参数
  data?: any;
  header?: any;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  dataType?: string;
  responseType?: string;
  loading?: boolean;
  loadingText?: string;
  showError?: boolean;
  token?: boolean;
  retry?: number;
}

// 请求失败接口
interface RequestFail {
  errMsg: string;
}

// API基础URL
const BASE_URL = 'http://localhost:8000/api';

// 请求计数器
let loadingCount = 0;

/**
 * 显示loading
 */
function showLoading(text: string) {
  if (loadingCount === 0) {
    uni.showLoading({
      title: text,
      mask: true
    });
  }
  loadingCount++;
}

/**
 * 隐藏loading
 */
function hideLoading() {
  loadingCount--;
  if (loadingCount === 0) {
    uni.hideLoading();
  }
}

/**
 * 显示错误提示
 */
function showError(message: string) {
  uni.showToast({
    title: message || '请求失败',
    icon: 'none',
    duration: 2000
  });
}

/**
 * 请求方法
 */
function request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
  // 合并选项默认值
  options = {
    showError: true,
    loading: true,
    loadingText: '加载中...',
    token: true,
    retry: 0,
    ...options
  };

  // 处理URL
  if (!options.url.startsWith('http')) {
    options.url = BASE_URL + options.url;
  }

  // 处理header
  if (!options.header) {
    options.header = {};
  }

  // 添加内容类型
  if (!options.header['Content-Type']) {
    options.header['Content-Type'] = 'application/json';
  }

  // 添加token认证
  if (options.token !== false) {
    // 按优先级从存储中获取token
    const token = uni.getStorageSync('token') || 
                  uni.getStorageSync('merchantToken') || 
                  uni.getStorageSync('adminToken');
    
    if (token) {
      options.header['Authorization'] = `Bearer ${token}`;
    }
  }

  // 显示loading
  if (options.loading) {
    showLoading(options.loadingText as string);
  }

  // 发送请求
  return new Promise<ApiResponse<T>>((resolve, reject) => {
    uni.request({
      url: options.url,
      data: options.data,
      header: options.header,
      method: options.method as any,
      dataType: options.dataType || 'json',
      responseType: options.responseType || 'text',
      success: (res: any) => {
        // 隐藏loading
        if (options.loading) {
          hideLoading();
        }

        // 处理响应状态码
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 处理业务状态码
          const response = res.data as ApiResponse<T>;
          
          if (response.code === 0) {
            // 业务成功
            resolve(response);
          } else {
            // 业务失败
            if (options.showError) {
              showError(response.msg);
            }
            reject(response);
          }
        } else if (res.statusCode === 401) {
          // 未授权，清除登录状态
          uni.removeStorageSync('token');
          uni.removeStorageSync('merchantToken');
          uni.removeStorageSync('adminToken');
          uni.removeStorageSync('userInfo');
          uni.removeStorageSync('merchantInfo');
          uni.removeStorageSync('adminInfo');
          
          // 跳转到登录页
          uni.reLaunch({
            url: '/pages/login/index'
          });
          
          if (options.showError) {
            showError('登录已过期，请重新登录');
          }
          reject({ code: 401, msg: '登录已过期，请重新登录', data: null });
        } else {
          // HTTP错误
          if (options.showError) {
            showError(`请求失败(${res.statusCode})`);
          }
          reject({ code: res.statusCode, msg: '请求失败', data: null });
        }
      },
      fail: (err: RequestFail) => {
        // 隐藏loading
        if (options.loading) {
          hideLoading();
        }

        // 网络错误处理
        if (options.retry && options.retry > 0) {
          // 重试请求
          setTimeout(() => {
            request<T>({
              ...options,
              retry: (options.retry as number) - 1
            }).then(resolve).catch(reject);
          }, 1000);
        } else {
          // 显示错误提示
          if (options.showError) {
            showError('网络连接失败');
          }
          
          reject({ code: -1, msg: '网络连接失败', data: null });
        }
      }
    });
  });
}

// HTTP方法封装
const http = {
  /**
   * GET请求
   */
  get<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'url' | 'method'> = {}): Promise<ApiResponse<T>> {
    return request<T>({
      url,
      data,
      method: 'GET',
      ...options
    });
  },
  
  /**
   * POST请求
   */
  post<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'url' | 'method'> = {}): Promise<ApiResponse<T>> {
    return request<T>({
      url,
      data,
      method: 'POST',
      ...options
    });
  },
  
  /**
   * PUT请求
   */
  put<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'url' | 'method'> = {}): Promise<ApiResponse<T>> {
    return request<T>({
      url,
      data,
      method: 'PUT',
      ...options
    });
  },
  
  /**
   * DELETE请求
   */
  delete<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'url' | 'method'> = {}): Promise<ApiResponse<T>> {
    return request<T>({
      url,
      data,
      method: 'DELETE',
      ...options
    });
  },
  
  /**
   * 上传文件
   */
  upload<T = any>(
    url: string, 
    filePath: string, 
    name: string = 'file', 
    formData: any = {}, 
    options: Omit<RequestOptions, 'url' | 'method'> = {}
  ): Promise<ApiResponse<T>> {
    // 处理URL
    if (!url.startsWith('http')) {
      url = BASE_URL + url;
    }
    
    // 合并选项
    const uploadOptions = {
      showError: true,
      loading: true,
      loadingText: '上传中...',
      token: true,
      ...options
    };
    
    // 处理header
    let header: any = {};
    
    // 添加token认证
    if (uploadOptions.token !== false) {
      const token = uni.getStorageSync('token') || 
                   uni.getStorageSync('merchantToken') || 
                   uni.getStorageSync('adminToken');
      
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      }
    }
    
    // 显示loading
    if (uploadOptions.loading) {
      showLoading(uploadOptions.loadingText as string);
    }
    
    return new Promise<ApiResponse<T>>((resolve, reject) => {
      uni.uploadFile({
        url,
        filePath,
        name,
        formData,
        header,
        success: (res: any) => {
          // 隐藏loading
          if (uploadOptions.loading) {
            hideLoading();
          }
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // 注意：uploadFile的响应data是字符串，需要手动转换
            try {
              const response = JSON.parse(res.data) as ApiResponse<T>;
              
              if (response.code === 0) {
                resolve(response);
              } else {
                if (uploadOptions.showError) {
                  showError(response.msg);
                }
                reject(response);
              }
            } catch (e) {
              if (uploadOptions.showError) {
                showError('解析响应失败');
              }
              reject({ code: -2, msg: '解析响应失败', data: null });
            }
          } else {
            if (uploadOptions.showError) {
              showError(`上传失败(${res.statusCode})`);
            }
            reject({ code: res.statusCode, msg: '上传失败', data: null });
          }
        },
        fail: (err: any) => {
          // 隐藏loading
          if (uploadOptions.loading) {
            hideLoading();
          }
          
          if (uploadOptions.showError) {
            showError('上传失败');
          }
          
          reject({ code: -1, msg: '上传失败', data: null });
        }
      });
    });
  }
};

export default http;