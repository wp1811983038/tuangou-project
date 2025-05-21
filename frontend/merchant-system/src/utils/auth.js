// src/utils/auth.js
import Cookies from 'js-cookie';
import axios from 'axios';

const TOKEN_KEY = 'merchant_token';
const REMEMBER_KEY = 'rememberedCredentials';
const TOKEN_EXPIRY_KEY = 'merchant_token_expiry';

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
    return localToken;
  } else if (!localToken && cookieToken) {
    console.log("Token存在于Cookie但不在localStorage中，正在同步");
    localStorage.setItem(TOKEN_KEY, cookieToken);
    return cookieToken;
  } else if (localToken && cookieToken && localToken !== cookieToken) {
    console.log("localStorage和Cookie中的Token不一致，使用localStorage的Token");
    Cookies.set(TOKEN_KEY, localToken);
    return localToken;
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
  
  // 存储过期时间（如果有）
  if (expireSeconds) {
    const expiryTime = Date.now() + (expireSeconds * 1000);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  } else {
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
  
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
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  Cookies.remove(TOKEN_KEY);
}

/**
 * 解析JWT令牌
 * @param {string} token JWT令牌
 * @returns {object} 解析后的令牌数据
 */
export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('解析JWT令牌失败:', error);
    return {};
  }
}

/**
 * 获取令牌过期时间
 * @returns {number|null} 过期时间戳(毫秒)或null
 */
export function getTokenExpiry() {
  // 从localStorage获取过期时间
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (expiry) {
    return parseInt(expiry, 10);
  }
  
  // 如果没有存储过期时间，尝试从令牌中获取
  const token = getToken();
  if (token) {
    try {
      const payload = parseJwt(token);
      if (payload.exp) {
        // exp是秒级时间戳，转换为毫秒
        return payload.exp * 1000;
      }
    } catch (error) {
      console.error('无法从令牌中获取过期时间:', error);
    }
  }
  
  return null;
}

/**
 * 检查令牌是否即将过期
 * @param {number} thresholdMinutes 阈值(分钟)，默认为5分钟
 * @returns {boolean} 是否即将过期
 */
export function isTokenExpiringSoon(thresholdMinutes = 5) {
  const expiry = getTokenExpiry();
  if (!expiry) return false;
  
  const thresholdMs = thresholdMinutes * 60 * 1000;
  return (expiry - Date.now()) < thresholdMs;
}

/**
 * 检查令牌是否已过期
 * @returns {boolean} 是否已过期
 */
export function isTokenExpired() {
  const expiry = getTokenExpiry();
  if (!expiry) return false;
  
  return Date.now() >= expiry;
}

/**
 * 刷新令牌（如果需要）
 * @returns {Promise<boolean>} 是否刷新成功
 */
export async function refreshTokenIfNeeded() {
  const token = getToken();
  if (!token) return false;
  
  // 如果令牌已过期，直接返回false
  if (isTokenExpired()) {
    console.log('令牌已过期，需要重新登录');
    return false;
  }
  
  // 如果令牌即将过期，则刷新
  if (isTokenExpiringSoon()) {
    try {
      console.log('令牌即将过期，尝试刷新');
      const response = await axios.post('/api/v1/auth/refresh-token', { token });
      
      if (response.data && response.data.access_token) {
        setToken(
          response.data.access_token, 
          response.data.expires_in || 60 * 60 * 24 * 7 // 默认7天
        );
        console.log('令牌刷新成功');
        return true;
      }
      
      console.error('刷新令牌失败: 响应中没有有效的令牌');
      return false;
    } catch (error) {
      console.error('刷新令牌失败:', error);
      // 如果刷新失败但令牌仍未过期，仍返回true
      return !isTokenExpired();
    }
  }
  
  // 令牌有效且不需要刷新
  return true;
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
  const token = getToken();
  return !!token && !isTokenExpired();
}

/**
 * 检查Token是否有效（非过期）
 * @returns {boolean} 是否有效
 */
export function isTokenValid() {
  const token = getToken();
  if (!token) return false;
  
  // 检查是否已过期
  if (isTokenExpired()) return false;
  
  try {
    // 解析令牌结构
    const parts = token.split('.');
    return parts.length === 3; // 简单结构验证
  } catch (error) {
    console.error('解析Token失败:', error);
    return false;
  }
}

/**
 * 验证令牌有效性（通过API调用）
 * @returns {Promise<boolean>} 是否有效
 */
export async function validateToken() {
  const token = getToken();
  if (!token) return false;
  
  // 如果令牌已本地检测为过期，直接返回false
  if (isTokenExpired()) {
    removeToken();
    return false;
  }
  
  try {
    // 调用验证API
    const response = await axios.post('/api/v1/auth/verify-token', 
      { token },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data && response.data.valid === true;
  } catch (error) {
    console.error('验证令牌失败:', error);
    
    // 如果是401或403，清除令牌
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      removeToken();
    }
    
    return false;
  }
}

// 导出所有函数作为默认导出
export default {
  getToken,
  setToken,
  removeToken,
  parseJwt,
  getTokenExpiry,
  isTokenExpiringSoon,
  isTokenExpired,
  refreshTokenIfNeeded,
  saveRememberedCredentials,
  getRememberedCredentials,
  clearRememberedCredentials,
  isLoggedIn,
  isTokenValid,
  validateToken
};