// src/api/order.js
import request from '../utils/request';

// 获取订单列表
export function fetchOrderList(params) {
  return request({
    url: '/orders',
    method: 'get',
    params
  });
}

// 获取订单详情
export function fetchOrderDetail(id) {
  return request({
    url: `/orders/${id}`,
    method: 'get'
  });
}