// frontend/admin-system/src/redux/slices/authSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { login, logout } from '../../api/auth';
import { setToken, setUserInfo, setRememberInfo, clearAllStorageData } from '../../utils/storage';
import { message } from 'antd';

// 登录异步操作
export const loginAsync = createAsyncThunk(
  'auth/login',
  async ({ username, password, remember }, { rejectWithValue }) => {
    try {
      const response = await login({ username, password });
      if (remember) {
        setRememberInfo(username, password, remember);
      }
      return response;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || error.message || '登录失败'
      );
    }
  }
);

// 登出异步操作
export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logout();
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || error.message || '登出失败'
      );
    } finally {
      // 无论成功失败都清除本地存储
      clearAllStorageData();
    }
  }
);

const initialState = {
  isLoggedIn: false,
  token: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 初始化认证状态
    initAuth: (state, action) => {
      const token = action.payload;
      if (token) {
        state.isLoggedIn = true;
        state.token = token;
      }
    },
    // 清除错误信息
    clearError: (state) => {
      state.error = null;
    },
    // 手动重置认证状态
    resetAuth: (state) => {
      state.isLoggedIn = false;
      state.token = null;
      state.error = null;
      clearAllStorageData();
    }
  },
  extraReducers: (builder) => {
    builder
      // 登录状态处理
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoggedIn = true;
        
        // 从API响应中提取token和用户信息
        const { token, admin } = action.payload;
        state.token = token.access_token;
        
        // 存储token和用户信息
        setToken(token.access_token);
        setUserInfo(admin);
        
        message.success('登录成功');
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '登录失败，请检查用户名和密码';
      })
      
      // 登出状态处理
      .addCase(logoutAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.loading = false;
        state.isLoggedIn = false;
        state.token = null;
      })
      .addCase(logoutAsync.rejected, (state) => {
        state.loading = false;
        state.isLoggedIn = false;
        state.token = null;
      });
  },
});

export const { initAuth, clearError, resetAuth } = authSlice.actions;

export default authSlice.reducer;