import React from 'react';
import {
  DashboardOutlined,
  ShopOutlined,
  ShoppingOutlined,
  UserOutlined,
  OrderedListOutlined,
  PieChartOutlined,
  SettingOutlined,
//   BellOutlined,
//   TeamOutlined,
  TagsOutlined,
//   PictureOutlined,
//   FileTextOutlined,
} from '@ant-design/icons';

// 菜单配置
const menuConfig = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    title: '仪表盘',
    permissions: ['admin', 'operator'],
  },
  {
    key: '/merchants',
    icon: <ShopOutlined />,
    title: '商户管理',
    permissions: ['admin', 'operator'],
    children: [
      {
        key: '/merchants/list',
        title: '商户列表',
        permissions: ['admin', 'operator'],
      },
      {
        key: '/merchants/categories',
        title: '商户分类',
        permissions: ['admin'],
      },
      {
        key: '/merchants/review',
        title: '入驻审核',
        permissions: ['admin'],
      },
    ],
  },
  {
    key: '/products',
    icon: <ShoppingOutlined />,
    title: '商品管理',
    permissions: ['admin', 'operator'],
    children: [
      {
        key: '/products/list',
        title: '商品列表',
        permissions: ['admin', 'operator'],
      },
      {
        key: '/products/categories',
        title: '商品分类',
        permissions: ['admin'],
      },
      {
        key: '/products/groups',
        title: '团购管理',
        permissions: ['admin', 'operator'],
      },
    ],
  },
  {
    key: '/orders',
    icon: <OrderedListOutlined />,
    title: '订单管理',
    permissions: ['admin', 'operator'],
    children: [
      {
        key: '/orders/list',
        title: '订单列表',
        permissions: ['admin', 'operator'],
      },
      {
        key: '/orders/refunds',
        title: '退款管理',
        permissions: ['admin'],
      },
    ],
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    title: '用户管理',
    permissions: ['admin'],
    children: [
      {
        key: '/users/list',
        title: '用户列表',
        permissions: ['admin'],
      },
      {
        key: '/users/address',
        title: '地址管理',
        permissions: ['admin'],
      },
    ],
  },
  {
    key: '/statistics',
    icon: <PieChartOutlined />,
    title: '统计分析',
    permissions: ['admin'],
    children: [
      {
        key: '/statistics/sales',
        title: '销售统计',
        permissions: ['admin'],
      },
      {
        key: '/statistics/merchants',
        title: '商户统计',
        permissions: ['admin'],
      },
      {
        key: '/statistics/products',
        title: '商品统计',
        permissions: ['admin'],
      },
      {
        key: '/statistics/users',
        title: '用户统计',
        permissions: ['admin'],
      },
    ],
  },
  {
    key: '/marketing',
    icon: <TagsOutlined />,
    title: '营销管理',
    permissions: ['admin', 'operator'],
    children: [
      {
        key: '/marketing/banners',
        title: '轮播图管理',
        permissions: ['admin', 'operator'],
      },
      {
        key: '/marketing/notices',
        title: '公告管理',
        permissions: ['admin'],
      },
    ],
  },
  {
    key: '/system',
    icon: <SettingOutlined />,
    title: '系统设置',
    permissions: ['admin'],
    children: [
      {
        key: '/system/admins',
        title: '管理员管理',
        permissions: ['admin'],
      },
      {
        key: '/system/roles',
        title: '角色权限',
        permissions: ['admin'],
      },
      {
        key: '/system/configs',
        title: '系统配置',
        permissions: ['admin'],
      },
      {
        key: '/system/logs',
        title: '操作日志',
        permissions: ['admin'],
      },
    ],
  },
];

export default menuConfig;