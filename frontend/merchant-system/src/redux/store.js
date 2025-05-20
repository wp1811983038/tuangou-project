// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';

// 创建 Redux store
const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
  },
  // 开启 Redux DevTools
  devTools: process.env.NODE_ENV !== 'production',
  // 可选：添加中间件
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: {
      // 忽略日期等非序列化值的检查
      ignoredActions: ['user/setToken'],
      ignoredPaths: ['auth.user.createdAt', 'auth.user.updatedAt'],
    },
  }),
});

// 同时提供命名导出和默认导出，以适应不同的导入方式
export { store };
export default store;