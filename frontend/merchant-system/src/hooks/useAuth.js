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
      if (token) {
        setIsLoggedIn(true);
        try {
          // 可选：获取用户信息
          const userData = await fetchData({
            url: '/api/v1/merchants/my',
            method: 'GET',
          });
          if (userData) {
            setCurrentUser(userData);
          }
        } catch (error) {
          console.error('获取用户信息失败:', error);
        }
      }
    };

    initAuth();
  }, []);

  // 登录函数
  const login = async (username, password, remember = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchData({
        url: '/api/v1/auth/login',
        method: 'POST',
        data: {
          username,
          password,
        },
      });
      
      if (response && response.access_token) {
        // 保存token
        setToken(response.access_token, remember ? response.expires_in : null);
        
        // 记住账号密码
        if (remember) {
          saveRememberedCredentials(username, password);
        }
        
        setIsLoggedIn(true);
        setCurrentUser(response.user || {});
        message.success('登录成功');
        return true;
      }
      return false;
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
    // 可选：调用登出API
    try {
      fetchData({
        url: '/api/v1/auth/logout',
        method: 'POST',
      });
    } catch (error) {
      console.error('登出失败:', error);
    }
    
    removeToken();
    setIsLoggedIn(false);
    setCurrentUser(null);
    message.success('已退出登录');
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
  const resetPassword = async (newPassword) => {
    try {
      setLoading(true);
      await fetchData({
        url: '/api/v1/auth/reset-password',
        method: 'POST',
        data: { new_password: newPassword }
      });
      message.success('密码重置成功');
      return true;
    } catch (error) {
      message.error('密码重置失败');
      throw error;
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
        resetPassword
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