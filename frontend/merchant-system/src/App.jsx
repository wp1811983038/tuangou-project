// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import { AuthProvider } from './hooks/useAuth';
import Cookies from 'js-cookie';

// 导入布局组件
import AuthLayout from './layouts/AuthLayout';
import MerchantLayout from './layouts/MerchantLayout';

// 导入页面组件
import Login from './pages/Login';
import ForgotPassword from './pages/Login/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Groups from './pages/Groups';
import Reviews from './pages/Reviews';
import Profile from './pages/Profile';
import NotFound from './pages/Exception/404';

// 创建受保护的路由组件
const ProtectedRoute = ({ children }) => {
  const authToken = localStorage.getItem('merchant_token') || 
                   Cookies.get('merchant_token');
  
  // 如果未登录，重定向到登录页
  if (!authToken) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <ConfigProvider locale={zhCN}>
        <BrowserRouter>
          <Routes>
            {/* 根路径重定向到登录页 */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* 认证路由 */}
            <Route path="/login" element={<AuthLayout />}>
              <Route index element={<Login />} />
            </Route>
            <Route path="/forgot-password" element={<AuthLayout />}>
              <Route index element={<ForgotPassword />} />
            </Route>
            
            {/* 商户路由 - 需要认证 */}
            <Route path="/" element={
              <ProtectedRoute>
                <MerchantLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="orders" element={<Orders />} />
              <Route path="groups" element={<Groups />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            
            {/* 404页面 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </AuthProvider>
  );
};

export default App;