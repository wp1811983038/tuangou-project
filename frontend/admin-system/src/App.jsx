// frontend/admin-system/src/App.jsx

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import { useDispatch } from 'react-redux';
import { initAuth } from './redux/slices/authSlice';
import { initUserInfo } from './redux/slices/userSlice';
import { getToken } from './utils/storage';

// 登录页面
import LoginPage from './pages/Login';
import ForgotPassword from './components/Auth/ForgotPassword';

// 布局组件
import BasicLayout from './layouts/BasicLayout';

// 仪表盘
import Dashboard from './pages/Dashboard';

// 商户管理页面
import MerchantList from './pages/Merchants/List';
import MerchantDetail from './pages/Merchants/Detail';
import CreateMerchant from './pages/Merchants/Create';
import EditMerchant from './pages/Merchants/Edit';
import MerchantReview from './pages/Merchants/Review';
import MerchantCategories from './pages/Merchants/Categories';

// 错误页面
// import NotFound from './pages/NotFound';

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
          {/* 默认路由重定向到仪表盘 */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 登录页面 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* 主应用路由 - 需要认证 */}
          <Route path="/" element={<PrivateRoute><BasicLayout /></PrivateRoute>}>
            {/* 仪表盘 */}
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* 商户管理路由 */}
            <Route path="merchants">
              <Route index element={<Navigate to="list" replace />} />
              <Route path="list" element={<MerchantList />} />
              <Route path="detail/:id" element={<MerchantDetail />} />
              <Route path="create" element={<CreateMerchant />} />
              <Route path="edit/:id" element={<EditMerchant />} />
              <Route path="review/:id" element={<MerchantReview />} />
              <Route path="categories" element={<MerchantCategories />} />
            </Route>
            
            {/* 等待实现的其他模块 - 使用临时占位 */}
            <Route path="products/*" element={<NotFound />} />
            <Route path="orders/*" element={<NotFound />} />
            <Route path="statistics/*" element={<NotFound />} />
            <Route path="system/*" element={<NotFound />} />
            
            {/* 404页面处理 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;