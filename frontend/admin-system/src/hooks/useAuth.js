// frontend/admin-system/src/hooks/useAuth.js

import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginAsync, logoutAsync, initAuth, clearError } from '../redux/slices/authSlice';
import { initUserInfo } from '../redux/slices/userSlice';
import { getToken, getRememberInfo } from '../utils/storage';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { isLoggedIn, loading, error, token } = useSelector((state) => state.auth);
  const { userInfo, permissions, roles } = useSelector((state) => state.user);
  
  // 初始化认证状态
  useEffect(() => {
    const token = getToken();
    if (token) {
      dispatch(initAuth(token));
      dispatch(initUserInfo());
    }
  }, [dispatch]);
  
  // 登录函数
  const login = useCallback(
    async (username, password, remember = false) => {
      const result = await dispatch(loginAsync({ username, password, remember }));
      if (result.meta.requestStatus === 'fulfilled') {
        // 登录成功，跳转到主页或之前尝试访问的页面
        const { from } = location.state || { from: { pathname: '/dashboard' } };
        navigate(from);
        return true;
      }
      return false;
    },
    [dispatch, navigate, location]
  );
  
  // 注销函数
  const logout = useCallback(async () => {
    await dispatch(logoutAsync());
    navigate('/login');
  }, [dispatch, navigate]);
  
  // 清除错误信息
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);
  
  // 获取记住的登录信息
  const getRememberedCredentials = useCallback(() => {
    return getRememberInfo();
  }, []);
  
  // 检查是否有权限访问
  const hasPermission = useCallback(
    (permissionKey) => {
      if (!permissions) return false;
      
      // 1. 直接检查是否有此权限
      if (permissions[permissionKey]) return true;
      
      // 2. 检查是否为管理员角色（通常有所有权限）
      return roles.includes('admin');
    },
    [permissions, roles]
  );
  
  return {
    isLoggedIn,
    loading,
    error,
    token,
    userInfo,
    permissions,
    roles,
    login,
    logout,
    clearAuthError,
    getRememberedCredentials,
    hasPermission,
  };
};