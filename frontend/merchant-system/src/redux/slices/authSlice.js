// src/redux/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  token: null,
  user: null,
  isLoggedIn: false,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isLoggedIn = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isLoggedIn = false;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    }
  }
});

export const { loginStart, loginSuccess, loginFailure, logout, setUser } = authSlice.actions;
export default authSlice.reducer;