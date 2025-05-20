// src/layouts/AuthLayout.jsx
import React from 'react';
import { Layout } from 'antd';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../pages/Login/index.less';

const AuthLayout = () => {
  const { isLoggedIn } = useAuth();

  // 如果已经登录，重定向到仪表盘
  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout className="auth-layout">
      <Outlet />
    </Layout>
  );
};

export default AuthLayout;