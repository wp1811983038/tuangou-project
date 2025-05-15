import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRequest } from './useRequest';
import { getToken, setToken, removeToken } from '../utils/auth';
import { message } from 'antd';

// 创建认证上下文
const AuthContext = createContext(null);

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { fetchData } = useRequest();

  // 初始化验证用户状态
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          // 调用获取当前用户信息的API
          const userData = await fetchData({
            url: '/api/v1/users/me',
            method: 'GET',
          });
          
          if (userData) {
            setCurrentUser(userData);
            setIsLoggedIn(true);
          } else {
            // 如果无法获取用户信息，清除token
            removeToken();
            setIsLoggedIn(false);
          }
        } catch (error) {
          console.error('验证用户失败:', error);
          removeToken();
          setIsLoggedIn(false);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [fetchData]);

  // 登录
  const login = async (username, password, remember = false) => {
    try {
      setLoading(true);
      
      // 调用登录API
      const response = await fetchData({
        url: '/api/v1/auth/phone-login',
        method: 'POST',
        data: {
          phone: username,
          password,
        },
      });
      
      if (response) {
        // 保存token
        const { access_token, expires_in } = response;
        setToken(access_token, remember ? expires_in : null);
        
        // 获取用户信息
        const userData = await fetchData({
          url: '/api/v1/users/me',
          method: 'GET',
        });
        
        setCurrentUser(userData);
        setIsLoggedIn(true);
        message.success('登录成功');
        return true;
      }
      return false;
    } catch (error) {
      console.error('登录失败:', error);
      message.error(error.message || '登录失败，请检查用户名和密码');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 退出登录
  const logout = async () => {
    try {
      // 调用退出登录API
      await fetchData({
        url: '/api/v1/auth/logout',
        method: 'POST',
      });
    } catch (error) {
      console.error('退出登录时出错:', error);
    } finally {
      // 无论API是否成功，都清除本地凭据
      removeToken();
      setCurrentUser(null);
      setIsLoggedIn(false);
      message.success('已退出登录');
    }
  };

  // 获取记住的凭据
  const getRememberedCredentials = () => {
    try {
      const rememberedCredentials = localStorage.getItem('rememberedCredentials');
      if (rememberedCredentials) {
        return JSON.parse(rememberedCredentials);
      }
    } catch (error) {
      console.error('获取记住的凭据失败:', error);
    }
    return null;
  };

  // 清除认证错误
  const clearAuthError = () => {
    // 清除认证相关错误
  };

  // 提供的上下文值
  const authContextValue = {
    isLoggedIn,
    currentUser,
    loading,
    login,
    logout,
    getRememberedCredentials,
    clearAuthError,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定义钩子以使用认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
};