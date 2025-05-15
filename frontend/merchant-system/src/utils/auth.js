import Cookies from 'js-cookie';

const TOKEN_KEY = 'merchant_token';
const REMEMBER_KEY = 'rememberedCredentials';

/**
 * 获取认证令牌
 * @returns {string|null} 认证令牌
 */
export function getToken() {
  return Cookies.get(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

/**
 * 设置认证令牌
 * @param {string} token 认证令牌
 * @param {number|null} expireSeconds 过期时间(秒)，如果为null则不过期
 */
export function setToken(token, expireSeconds = null) {
  // 如果有过期时间，使用Cookies存储，否则使用localStorage
  if (expireSeconds) {
    Cookies.set(TOKEN_KEY, token, { expires: expireSeconds / (60 * 60 * 24) }); // 转换为天
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * 移除认证令牌
 */
export function removeToken() {
  Cookies.remove(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
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