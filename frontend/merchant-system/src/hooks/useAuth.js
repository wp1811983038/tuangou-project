// src/hooks/useAuth.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRequest } from './useRequest'; // 确保导入的是修改后的useRequest
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
            url: '/users/me',
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

  // 登录 - 问题可能出在这里
  const login = async (username, password, remember = false) => {
    try {
      setLoading(true);
      
      // 修改这里！使用相对路径
      const response = await fetchData({
        url: '/auth/phone-login',  // 相对路径，不要使用完整URL
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
          url: '/users/me',
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

  // 其余代码保持不变...
  
  return (
    <AuthContext.Provider value={{ /* 值不变 */ }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  // 保持不变...
};