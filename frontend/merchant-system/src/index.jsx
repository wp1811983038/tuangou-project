
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import App from './App';
import './global.less';

// 创建根元素
const root = ReactDOM.createRoot(document.getElementById('root'));

// 渲染应用
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);