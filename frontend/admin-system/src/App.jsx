// frontend/admin-system/src/App.jsx

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import { useDispatch } from 'react-redux';
import { initAuth } from './redux/slices/authSlice';
import { initUserInfo } from './redux/slices/userSlice';
import { getToken } from './utils/storage';
import LoginPage from './pages/Login';
import BasicLayout from './layouts/BasicLayout';

// 鉴权路由组件
const PrivateRoute = ({ children }) => {
  const token = getToken();
  return token ? children : <Navigate to="/login" />;
};

const App = () => {
  const dispatch = useDispatch();
  
  // 初始化应用状态
  useEffect(() => {
    const token = getToken();
    if (token) {
      dispatch(initAuth(token));
      dispatch(initUserInfo());
    }
  }, [dispatch]);
  
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <BasicLayout />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;