// frontend/admin-system/src/config/routes.js

import React from 'react';
import { Navigate } from 'react-router-dom';

// 布局组件
import BasicLayout from '../layouts/BasicLayout';
import AuthLayout from '../layouts/AuthLayout';

// 认证相关页面
import Login from '../pages/Login';
import ForgotPassword from '../components/Auth/ForgotPassword';

// 仪表盘
import Dashboard from '../pages/Dashboard';

// 商户管理
import MerchantList from '../pages/Merchants/List';
import MerchantDetail from '../pages/Merchants/Detail';
import CreateMerchant from '../pages/Merchants/Create';
import EditMerchant from '../pages/Merchants/Edit';
import MerchantReview from '../pages/Merchants/Review';
import MerchantCategories from '../pages/Merchants/Categories';

// 商品管理
import ProductList from '../pages/Products/List';
import ProductDetail from '../pages/Products/Detail';
import CreateProduct from '../pages/Products/Create';
import EditProduct from '../pages/Products/Edit';
import ProductCategories from '../pages/Products/Categories';
import GroupList from '../pages/Products/Groups/List';
import GroupDetail from '../pages/Products/Groups/Detail';
import CreateGroup from '../pages/Products/Groups/Create';

// 订单管理
import OrderList from '../pages/Orders/List';
import OrderDetail from '../pages/Orders/Detail';
import RefundList from '../pages/Orders/Refunds/List';
import RefundDetail from '../pages/Orders/Refunds/Detail';

// 用户管理
import UserList from '../pages/Users/List';
import UserDetail from '../pages/Users/Detail';
import AddressList from '../pages/Users/Address';

// 统计分析
import SalesStats from '../pages/Statistics/Sales';
import MerchantStats from '../pages/Statistics/Merchants';
import ProductStats from '../pages/Statistics/Products';
import UserStats from '../pages/Statistics/Users';

// 营销管理
import BannerList from '../pages/Marketing/Banners';
import NoticeList from '../pages/Marketing/Notices';

// 系统设置
import AdminList from '../pages/System/Admins';
import RoleList from '../pages/System/Roles';
import SystemConfig from '../pages/System/Configs';
import OperationLogs from '../pages/System/Logs';

// 个人中心
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import ChangePassword from '../pages/ChangePassword';

// 其他页面
import NotFound from '../pages/NotFound';
import ServerError from '../pages/ServerError';

const routes = [
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />
  },
  {
    path: '/',
    element: <BasicLayout />,
    children: [
      // 仪表盘
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      
      // 商户管理路由
      {
        path: 'merchants',
        children: [
          {
            path: 'list',
            element: <MerchantList />
          },
          {
            path: 'detail/:id',
            element: <MerchantDetail />
          },
          {
            path: 'create',
            element: <CreateMerchant />
          },
          {
            path: 'edit/:id',
            element: <EditMerchant />
          },
          {
            path: 'review/:id',
            element: <MerchantReview />
          },
          {
            path: 'categories',
            element: <MerchantCategories />
          }
        ]
      },
      
      // 商品管理路由
      {
        path: 'products',
        children: [
          {
            path: 'list',
            element: <ProductList />
          },
          {
            path: 'detail/:id',
            element: <ProductDetail />
          },
          {
            path: 'create',
            element: <CreateProduct />
          },
          {
            path: 'edit/:id',
            element: <EditProduct />
          },
          {
            path: 'categories',
            element: <ProductCategories />
          },
          {
            path: 'groups',
            element: <GroupList />
          },
          {
            path: 'groups/detail/:id',
            element: <GroupDetail />
          },
          {
            path: 'groups/create',
            element: <CreateGroup />
          }
        ]
      },
      
      // 订单管理路由
      {
        path: 'orders',
        children: [
          {
            path: 'list',
            element: <OrderList />
          },
          {
            path: 'detail/:id',
            element: <OrderDetail />
          },
          {
            path: 'refunds',
            element: <RefundList />
          },
          {
            path: 'refunds/detail/:id',
            element: <RefundDetail />
          }
        ]
      },
      
      // 用户管理路由
      {
        path: 'users',
        children: [
          {
            path: 'list',
            element: <UserList />
          },
          {
            path: 'detail/:id',
            element: <UserDetail />
          },
          {
            path: 'address',
            element: <AddressList />
          }
        ]
      },
      
      // 统计分析路由
      {
        path: 'statistics',
        children: [
          {
            path: 'sales',
            element: <SalesStats />
          },
          {
            path: 'merchants',
            element: <MerchantStats />
          },
          {
            path: 'products',
            element: <ProductStats />
          },
          {
            path: 'users',
            element: <UserStats />
          }
        ]
      },
      
      // 营销管理路由
      {
        path: 'marketing',
        children: [
          {
            path: 'banners',
            element: <BannerList />
          },
          {
            path: 'notices',
            element: <NoticeList />
          }
        ]
      },
      
      // 系统设置路由
      {
        path: 'system',
        children: [
          {
            path: 'admins',
            element: <AdminList />
          },
          {
            path: 'roles',
            element: <RoleList />
          },
          {
            path: 'configs',
            element: <SystemConfig />
          },
          {
            path: 'logs',
            element: <OperationLogs />
          }
        ]
      },
      
      // 个人中心路由
      {
        path: 'profile',
        element: <Profile />
      },
      {
        path: 'settings',
        element: <Settings />
      },
      {
        path: 'change-password',
        element: <ChangePassword />
      }
    ]
  },
  
  // 认证相关路由
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />
      }
    ]
  },
  
  // 错误页面路由
  {
    path: '/404',
    element: <NotFound />
  },
  {
    path: '/500',
    element: <ServerError />
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />
  }
];

export default routes;