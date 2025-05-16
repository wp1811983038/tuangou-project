import React from 'react';
import { Navigate } from 'react-router-dom';
import Login from '../pages/Login';

// 导入布局组件
import AuthLayout from '../layouts/AuthLayout';
import MerchantLayout from '../layouts/MerchantLayout';

// 导入页面组件 (实际路径可能需要调整)
// 以下是示例，您需要根据实际的页面组件路径进行修改
import Dashboard from '../pages/Dashboard';
import Products from '../pages/Products';
import Orders from '../pages/Orders';
import Groups from '../pages/Groups';
import Reviews from '../pages/Reviews';
import Profile from '../pages/Profile';

// 路由配置
const routes = [
  {
    path: '/',
    element: <Navigate to="/login" replace />, // 根路径重定向到登录页
  },
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        path: '',
        element: <Login />,
      },
    ],
  },
  {
    path: '/',
    element: <MerchantLayout />, // 需要身份验证的路由使用MerchantLayout
    auth: true, // 需要认证
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'products',
        element: <Products />,
      },
      {
        path: 'orders',
        element: <Orders />,
      },
      {
        path: 'groups',
        element: <Groups />,
      },
      {
        path: 'reviews',
        element: <Reviews />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
      // 可以根据需要添加更多路由
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />, // 未匹配的路由重定向到登录页
  },
];

export default routes;