import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import { AuthProvider, useAuth } from './hooks/useAuth';

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

// 创建路由守卫组件
const AuthRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  
  // 如果未登录，重定向到登录页
  if (!isLoggedIn) {
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
              <Route path="forgot-password" element={<ForgotPassword />} />
            </Route>
            
            {/* 商户路由 - 需要认证 */}
            <Route 
              path="/" 
              element={
                <AuthRoute>
                  <MerchantLayout />
                </AuthRoute>
              } 
            >
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