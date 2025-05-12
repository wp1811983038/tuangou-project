// src/api/merchant.js
import request from '../utils/request';

// 获取商户列表
export function fetchMerchantList(params) {
  return request({
    url: '/merchants',
    method: 'get',
    params
  });
}

// 获取商户详情
export function fetchMerchantDetail(id) {
  return request({
    url: `/merchants/${id}`,
    method: 'get'
  });
}

// 创建商户
export function createMerchant(data) {
  return request({
    url: '/merchants',
    method: 'post',
    data
  });
}

// 更新商户
export function updateMerchant(id, data) {
  return request({
    url: `/merchants/${id}`,
    method: 'put',
    data
  });
}

// 更新商户状态
export function updateMerchantStatus(id, status) {
  return request({
    url: `/merchants/${id}/status`,
    method: 'put',
    data: { status }
  });
}

// 获取商户分类
export function fetchMerchantCategories() {
  return request({
    url: '/merchants/categories/all',
    method: 'get'
  });
}

// 创建商户分类
export function createMerchantCategory(data) {
  return request({
    url: '/merchants/categories',
    method: 'post',
    data
  });
}

// 更新商户分类
export function updateMerchantCategory(id, data) {
  return request({
    url: `/merchants/categories/${id}`,
    method: 'put',
    data
  });
}

// 删除商户分类
export function deleteMerchantCategory(id) {
  return request({
    url: `/merchants/categories/${id}`,
    method: 'delete'
  });
}