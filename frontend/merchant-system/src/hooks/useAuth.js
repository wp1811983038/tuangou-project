// src/hooks/useAuth.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useRequest } from './useRequest';
import { 
  getToken, setToken, removeToken, saveRememberedCredentials,
  isTokenValid, refreshTokenIfNeeded
} from '../utils/auth';
import { message } from 'antd';

// 创建认证上下文
const AuthContext = createContext(null);

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const { fetchData } = useRequest();

  // 初始化验证用户状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = getToken();
        console.log("初始化认证 - 当前token:", token ? "存在" : "不存在");
        
        if (!token) {
          setIsLoggedIn(false);
          setCurrentUser(null);
          setAuthInitialized(true);
          return;
        }
        
        // 验证令牌有效性
        if (!isTokenValid()) {
          console.warn("令牌无效或已过期");
          
          // 尝试刷新令牌
          const refreshed = await refreshTokenIfNeeded();
          if (!refreshed) {
            removeToken();
            setIsLoggedIn(false);
            setCurrentUser(null);
            setAuthInitialized(true);
            return;
          }
        }
        
        setIsLoggedIn(true);
        
        // 尝试获取用户信息
        try {
          const userData = await fetchData({
            url: '/api/v1/users/me',
            method: 'GET',
            showError: false // 不显示错误消息
          });
          
          if (userData) {
            console.log("成功获取用户信息:", userData);
            setCurrentUser(userData);
            
            // 缓存用户信息
            localStorage.setItem('current_user', JSON.stringify(userData));
            
            // 确认是否为商户账号
            if (!userData.merchant_id) {
              console.log("当前用户不是商户账号");
            } else {
              console.log("当前用户是商户账号，商户ID:", userData.merchant_id);
            }
          }
        } catch (error) {
          console.error('获取用户信息失败:', error);
          
          // 只有在明确是身份验证错误时才清除令牌
          if (error.response && error.response.status === 401) {
            removeToken();
            setIsLoggedIn(false);
            setCurrentUser(null);
            message.error("登录已过期，请重新登录");
          }
        }
      } catch (error) {
        console.error("认证初始化错误:", error);
      } finally {
        setAuthInitialized(true);
      }
    };

    initAuth();
  }, [fetchData]);

  // 登录函数
  const login = async (username, password, remember = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchData({
        url: '/api/v1/auth/phone-login', // 使用手机号登录接口
        method: 'POST',
        data: {
          phone: username, // 使用phone字段而不是username
          password,
        },
        requireAuth: false, // 不需要认证
      });
      
      console.log("登录响应:", response);
      
      if (response && response.access_token) {
        // 保存token - 使用access_token字段而不是token
        setToken(response.access_token, remember ? response.expires_in : null);
        console.log("设置token成功:", response.access_token);
        
        // 记住账号密码
        if (remember) {
          saveRememberedCredentials(username, password);
        }
        
        setIsLoggedIn(true);
        
        // 获取用户信息
        try {
          const userData = await fetchData({
            url: '/api/v1/users/me',
            method: 'GET',
          });
          
          if (userData) {
            setCurrentUser(userData);
            localStorage.setItem('current_user', JSON.stringify(userData));
          }
        } catch (userError) {
          console.error('获取用户信息失败:', userError);
        }
        
        message.success('登录成功');
        return true;
      } else {
        setError("登录失败：响应中未包含访问令牌");
        message.error("登录失败：服务器响应格式错误");
        return false;
      }
    } catch (error) {
      console.error('登录失败:', error);
      setError(error.message || '登录失败，请检查用户名和密码');
      message.error(error.message || '登录失败，请检查用户名和密码');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const logout = () => {
    try {
      // 调用登出API - 如果需要的话
      fetchData({
        url: '/api/v1/auth/logout',
        method: 'POST',
        showError: false // 不显示错误
      }).catch(error => {
        console.log('登出API调用失败，但不影响本地登出:', error);
      });
    } catch (error) {
      console.error('登出API调用失败:', error);
    }
    
    // 无论API调用成功与否，清除本地存储
    removeToken();
    localStorage.removeItem('current_user');
    setIsLoggedIn(false);
    setCurrentUser(null);
    message.success('已退出登录');
    
    // 重定向到登录页面
    window.location.href = '/login';
  };

  // 清除错误
  const clearError = () => {
    setError(null);
  };

  // 获取记住的登录信息
  const getRememberedCredentials = () => {
    try {
      const remembered = localStorage.getItem('rememberedCredentials');
      return remembered ? JSON.parse(remembered) : null;
    } catch (error) {
      console.error('获取记住的登录信息失败:', error);
      return null;
    }
  };

  // 修改密码功能
  const resetPassword = async (newPassword, oldPassword) => {
    try {
      setLoading(true);
      await fetchData({
        url: '/api/v1/auth/reset-password',
        method: 'POST',
        data: { 
          new_password: newPassword,
          old_password: oldPassword
        }
      });
      message.success('密码重置成功');
      return true;
    } catch (error) {
      message.error(error.message || '密码重置失败');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 检查是否是商户账号
  const isMerchant = useCallback(() => {
    return currentUser && !!currentUser.merchant_id;
  }, [currentUser]);

  // 获取商户ID
  const getMerchantId = useCallback(() => {
    return currentUser?.merchant_id || null;
  }, [currentUser]);
  
  // 刷新用户信息
  const refreshUserInfo = async () => {
    try {
      const userData = await fetchData({
        url: '/api/v1/users/me',
        method: 'GET',
        showError: false // 不显示错误
      });
      
      if (userData) {
        setCurrentUser(userData);
        localStorage.setItem('current_user', JSON.stringify(userData));
        return userData;
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        currentUser,
        loading,
        error,
        login,
        logout,
        clearError,
        getRememberedCredentials,
        resetPassword,
        isMerchant,
        getMerchantId,
        refreshUserInfo,
        authInitialized
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 使用认证上下文的Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
};