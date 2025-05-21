// src/hooks/useAuth.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRequest } from './useRequest';
import { getToken, setToken, removeToken, saveRememberedCredentials } from '../utils/auth';
import { message } from 'antd';
import Cookies from 'js-cookie';

// 创建认证上下文
const AuthContext = createContext(null);

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { fetchData } = useRequest();

  // 初始化验证用户状态
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      console.log("初始化认证 - 当前token:", token);
      
      if (token) {
        setIsLoggedIn(true);
        try {
          // 使用/users/me端点获取用户信息而不是merchants/my
          const userData = await fetchData({
            url: '/api/v1/users/me',
            method: 'GET',
          });
          
          if (userData) {
            console.log("成功获取用户信息:", userData);
            setCurrentUser(userData);
            
            // 确认是否为商户账号
            if (!userData.merchant_id) {
              console.warn("当前用户不是商户账号，某些功能可能无法使用");
              message.warning("请使用商户账号登录以访问完整功能");
            }
          }
        } catch (error) {
          console.error('获取用户信息失败:', error);
          // 认证失败时清除无效token
          removeToken();
          setIsLoggedIn(false);
          setCurrentUser(null);
          message.error("登录已过期，请重新登录");
        }
      } else {
        console.log("未找到登录凭证，请登录");
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
        
        // 如果响应中包含用户信息，直接设置
        if (response.user) {
          setCurrentUser(response.user);
        } else {
          // 否则获取用户信息
          try {
            const userData = await fetchData({
              url: '/api/v1/users/me',
              method: 'GET',
            });
            if (userData) {
              setCurrentUser(userData);
            }
          } catch (userError) {
            console.error('获取用户信息失败:', userError);
          }
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
      });
    } catch (error) {
      console.error('登出API调用失败:', error);
    }
    
    // 无论API调用成功与否，清除本地存储
    removeToken();
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
  const isMerchantAccount = () => {
    return currentUser && currentUser.merchant_id;
  };

  // 手动刷新token
  const refreshToken = async () => {
    try {
      setLoading(true);
      const currentToken = getToken();
      if (!currentToken) {
        throw new Error("没有可刷新的令牌");
      }
      
      const response = await fetchData({
        url: '/api/v1/auth/refresh-token',
        method: 'POST',
        data: { token: currentToken }
      });
      
      if (response && response.access_token) {
        setToken(response.access_token, response.expires_in);
        console.log("刷新token成功");
        return true;
      }
      return false;
    } catch (error) {
      console.error("刷新token失败:", error);
      return false;
    } finally {
      setLoading(false);
    }
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
        isMerchantAccount,
        refreshToken
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