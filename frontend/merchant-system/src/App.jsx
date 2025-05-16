import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import { useAuth } from './hooks/useAuth';

// 导入布局组件
import AuthLayout from './layouts/AuthLayout';
import MerchantLayout from './layouts/MerchantLayout';

// 导入页面组件
import Login from './pages/Login';
import ForgotPassword from './pages/Login/ForgotPassword';
import NotFound from './pages/Exception/404';

// 创建路由守卫组件
const AuthRoute = ({ children, auth }) => {
  const { isLoggedIn } = useAuth();
  
  // 如果需要认证但未登录，重定向到登录页
  if (auth && !isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  // 如果已登录且访问登录页，重定向到首页
  if (isLoggedIn && window.location.pathname === '/login') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

const App = () => {
  return (
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
            path="/dashboard/*" 
            element={
              <AuthRoute auth={true}>
                <MerchantLayout />
              </AuthRoute>
            } 
          />
          
          {/* 404页面 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;