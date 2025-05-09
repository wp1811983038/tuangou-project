// frontend/admin-system/src/redux/slices/userSlice.js

import { createSlice } from '@reduxjs/toolkit';
import { getUserInfo } from '../../utils/storage';
import { loginAsync, logoutAsync } from './authSlice';

const initialState = {
  userInfo: null,
  permissions: [],
  roles: [],
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserState: (state, action) => {
      Object.assign(state, action.payload);
    },
    initUserInfo: (state) => {
      const userInfo = getUserInfo();
      if (userInfo) {
        state.userInfo = userInfo;
        state.roles = userInfo.role ? [userInfo.role] : [];
        state.permissions = userInfo.permissions || [];
      }
    },
    clearUserInfo: (state) => {
      state.userInfo = null;
      state.permissions = [];
      state.roles = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // 登录成功后，保存用户信息
      .addCase(loginAsync.fulfilled, (state, action) => {
        const { admin } = action.payload;
        state.userInfo = admin;
        state.roles = admin.role ? [admin.role] : [];
        state.permissions = admin.permissions || {};
      })
      // 登出时，清除用户信息
      .addCase(logoutAsync.fulfilled, (state) => {
        state.userInfo = null;
        state.permissions = [];
        state.roles = [];
      });
  },
});

export const { setUserState, initUserInfo, clearUserInfo } = userSlice.actions;

export default userSlice.reducer;