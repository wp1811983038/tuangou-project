// src/redux/slices/userSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  loading: false,
  error: null
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    fetchProfileStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchProfileSuccess: (state, action) => {
      state.loading = false;
      state.profile = action.payload;
    },
    fetchProfileFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateProfile: (state, action) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    clearProfile: (state) => {
      state.profile = null;
    }
  }
});

export const { 
  fetchProfileStart, 
  fetchProfileSuccess, 
  fetchProfileFailure, 
  updateProfile, 
  clearProfile 
} = userSlice.actions;

export default userSlice.reducer;