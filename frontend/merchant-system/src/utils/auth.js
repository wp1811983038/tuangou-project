// src/utils/auth.js
import Cookies from 'js-cookie';

const TOKEN_KEY = 'merchant_token';
const REMEMBER_KEY = 'rememberedCredentials';

/**
 * 获取认证令牌 - 同时检查 localStorage 和 Cookies
 * @returns {string|null} 认证令牌
 */
export function getToken() {
  // 首先从 localStorage 获取
  const localToken = localStorage.getItem(TOKEN_KEY);
  
  // 然后从 cookies 获取
  const cookieToken = Cookies.get(TOKEN_KEY);
  
  // 如果两者不一致，进行同步
  if (localToken && !cookieToken) {
    console.log("Token存在于localStorage但不在Cookie中，正在同步");
    // 设置cookie，默认会话期间有效
    Cookies.set(TOKEN_KEY, localToken);
  } else if (!localToken && cookieToken) {
    console.log("Token存在于Cookie但不在localStorage中，正在同步");
    localStorage.setItem(TOKEN_KEY, cookieToken);
  } else if (localToken && cookieToken && localToken !== cookieToken) {
    console.log("localStorage和Cookie中的Token不一致，使用localStorage的Token");
    Cookies.set(TOKEN_KEY, localToken);
  }
  
  // 返回token，优先使用localStorage中的
  return localToken || cookieToken || null;
}

/**
 * 设置认证令牌 - 同时在 localStorage 和 Cookies 中设置
 * @param {string} token 认证令牌
 * @param {number|null} expireSeconds 过期时间(秒)，如果为null则不过期
 */
export function setToken(token, expireSeconds = null) {
  console.log(`设置Token: ${token ? token.substring(0, 10) + '...' : 'null'}, 过期时间: ${expireSeconds}秒`);
  
  if (!token) {
    console.warn("尝试设置空token");
    return;
  }
  
  // 始终在localStorage中存储
  localStorage.setItem(TOKEN_KEY, token);
  
  // 如果有过期时间，也在Cookies中设置
  if (expireSeconds) {
    // 转换为天数
    const expireDays = expireSeconds / (60 * 60 * 24);
    Cookies.set(TOKEN_KEY, token, { expires: expireDays }); 
  } else {
    // 会话Cookie
    Cookies.set(TOKEN_KEY, token);
  }
}

/**
 * 移除认证令牌 - 从 localStorage 和 Cookies 中同时移除
 */
export function removeToken() {
  console.log("移除Token");
  localStorage.removeItem(TOKEN_KEY);
  Cookies.remove(TOKEN_KEY);
}

/**
 * 保存记住的凭据
 * @param {string} username 用户名
 * @param {string} password 密码
 */
export function saveRememberedCredentials(username, password) {
  try {
    const credentials = { username, password };
    localStorage.setItem(REMEMBER_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.error('保存记住的凭据失败:', error);
  }
}

/**
 * 获取记住的凭据
 * @returns {Object|null} 记住的凭据
 */
export function getRememberedCredentials() {
  try {
    const remembered = localStorage.getItem(REMEMBER_KEY);
    return remembered ? JSON.parse(remembered) : null;
  } catch (error) {
    console.error('获取记住的凭据失败:', error);
    return null;
  }
}

/**
 * 清除记住的凭据
 */
export function clearRememberedCredentials() {
  localStorage.removeItem(REMEMBER_KEY);
}

/**
 * 检查是否已登录
 * @returns {boolean} 是否已登录
 */
export function isLoggedIn() {
  return !!getToken();
}

/**
 * 检查Token是否有效（非过期）
 * 注意：这只是简单判断，没有验证签名
 * @returns {boolean} 是否有效
 */
export function isTokenValid() {
  const token = getToken();
  if (!token) return false;
  
  try {
    // JWT token通常有三部分，用.分隔
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // 解析payload部分
    const payload = JSON.parse(atob(parts[1]));
    
    // 检查是否有exp字段，并且没有过期
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
      return payload.exp > now;
    }
    
    return true; // 如果没有exp字段，假设有效
  } catch (error) {
    console.error('解析Token失败:', error);
    return false;
  }
}