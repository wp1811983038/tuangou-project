// src/App.jsx
import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, message, Spin } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import moment from 'moment';
import 'moment/locale/zh-cn';

// 设置语言
moment.locale('zh-cn');

// 懒加载页面组件
const LoginPage = React.lazy(() => import('./pages/Login'));
const ForgotPasswordPage = React.lazy(() => import('./pages/Login/ForgotPassword'));
const MerchantLayout = React.lazy(() => import('./layouts/MerchantLayout'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard'));
const ProductsPage = React.lazy(() => import('./pages/Products'));
const GroupsPage = React.lazy(() => import('./pages/Groups'));
const OrdersPage = React.lazy(() => import('./pages/Orders'));
const ReviewsPage = React.lazy(() => import('./pages/Reviews'));
const ProfilePage = React.lazy(() => import('./pages/Profile'));
const NotFoundPage = React.lazy(() => import('./pages/Exception/404'));

// 身份验证上下文
import { AuthProvider, useAuth } from './hooks/useAuth';

// 加载状态组件
const LoadingComponent = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

// 需要登录才能访问的路由
const PrivateRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();

  // 如果还在加载身份验证状态，显示加载中
  if (loading) {
    return <LoadingComponent />;
  }

  // 未登录则重定向到登录页面
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// 已登录用户访问登录页时重定向到首页
const PublicRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();

  // 如果还在加载身份验证状态，显示加载中
  if (loading) {
    return <LoadingComponent />;
  }

  // 已登录则重定向到首页
  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// 商户布局包装器
const MerchantLayoutWrapper = ({ children }) => (
  <PrivateRoute>
    <MerchantLayout>
      {children}
    </MerchantLayout>
  </PrivateRoute>
);

function App() {
  // 配置全局消息提示持续时间
  useEffect(() => {
    message.config({
      duration: 2,
      maxCount: 3,
    });
  }, []);

  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingComponent />}>
            <Routes>
              {/* 登录相关路由 */}
              <Route path="/login" element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } />
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPasswordPage />
                </PublicRoute>
              } />

              {/* 受保护的商户后台路由 */}
              <Route path="/dashboard" element={
                <MerchantLayoutWrapper>
                  <DashboardPage />
                </MerchantLayoutWrapper>
              } />
              <Route path="/products" element={
                <MerchantLayoutWrapper>
                  <ProductsPage />
                </MerchantLayoutWrapper>
              } />
              <Route path="/groups" element={
                <MerchantLayoutWrapper>
                  <GroupsPage />
                </MerchantLayoutWrapper>
              } />
              <Route path="/orders" element={
                <MerchantLayoutWrapper>
                  <OrdersPage />
                </MerchantLayoutWrapper>
              } />
              <Route path="/reviews" element={
                <MerchantLayoutWrapper>
                  <ReviewsPage />
                </MerchantLayoutWrapper>
              } />
              <Route path="/profile" element={
                <MerchantLayoutWrapper>
                  <ProfilePage />
                </MerchantLayoutWrapper>
              } />

              {/* 默认路由重定向 */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* 404页面 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;