// frontend/admin-system/src/api/auth.js

import request from '../utils/request';

/**
 * 管理员登录
 * @param {Object} data - 登录数据
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 */
export function login(data) {
  return request({
    url: '/admin/login',
    method: 'post',
    data
  });
}

/**
 * 修改管理员密码
 * @param {Object} data - 密码数据
 * @param {string} data.old_password - 旧密码
 * @param {string} data.new_password - 新密码
 * @param {string} data.confirm_password - 确认密码
 */
export function changePassword(data) {
  return request({
    url: '/admin/password',
    method: 'put',
    data
  });
}

/**
 * 退出登录
 */
export function logout() {
  return request({
    url: '/auth/logout',
    method: 'post'
  });
}