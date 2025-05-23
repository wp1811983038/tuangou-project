// src/components/MerchantRequired.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { message, Spin, Result, Button } from 'antd';
import { useAuth } from '../hooks/useAuth';

const MerchantRequired = ({ children }) => {
  const { currentUser, isLoggedIn, authInitialized } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    // 只有当认证初始化完成后才检查
    if (authInitialized) {
      const timer = setTimeout(() => {
        setLoading(false);
        
        // 检查是否是商户
        if (isLoggedIn && (!currentUser || !currentUser.merchant_id)) {
          setUnauthorized(true);
          message.error('您需要一个商户账号才能访问此页面');
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentUser, isLoggedIn, authInitialized]);
  
  // 显示加载状态
  if (loading || !authInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        background: '#f0f2f5'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: 'rgba(0, 0, 0, 0.45)' }}>
          正在验证商户身份...
        </div>
      </div>
    );
  }
  
  // 检查是否已登录
  if (!isLoggedIn) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  // 检查是否是商户
  if (unauthorized) {
    return (
      <Result
        status="403"
        title="没有访问权限"
        subTitle="您的账号不是商户账号，无法访问此页面"
        extra={[
          <Button type="primary" key="dashboard" href="/dashboard">
            返回首页
          </Button>,
          <Button key="contact" onClick={() => message.info('请联系管理员申请商户权限')}>
            申请权限
          </Button>
        ]}
      />
    );
  }
  
  return children;
};

export default MerchantRequired;