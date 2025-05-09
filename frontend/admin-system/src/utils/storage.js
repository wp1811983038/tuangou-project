// frontend/admin-system/src/utils/storage.js

/**
 * 本地存储工具函数
 */

// Token相关
export const TOKEN_KEY = 'admin_token';
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

// 用户信息相关
export const USER_INFO_KEY = 'admin_user_info';
export const setUserInfo = (userInfo) => {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
};
export const getUserInfo = () => {
  const userInfo = localStorage.getItem(USER_INFO_KEY);
  return userInfo ? JSON.parse(userInfo) : null;
};
export const removeUserInfo = () => localStorage.removeItem(USER_INFO_KEY);

// 记住账号密码
export const REMEMBER_KEY = 'admin_remember';
export const setRememberInfo = (username, password, remember = true) => {
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
};
export const getRememberInfo = () => {
  const info = localStorage.getItem(REMEMBER_KEY);
  return info ? JSON.parse(info) : null;
};

// 清除所有管理系统数据
export const clearAllStorageData = () => {
  removeToken();
  removeUserInfo();
  // 保留记住我的信息
};