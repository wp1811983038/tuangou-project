// src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './redux/store';  // 使用默认导入
import App from './App';
import './global.less';

// 确保挂载点存在
const prepareRoot = () => {
  let container = document.getElementById('root');
  if (!container) {
    console.log('创建根DOM元素');
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
  }
  return container;
};

// 渲染应用
const renderApp = () => {
  const container = prepareRoot();
  
  try {
    // 检查 store 是否有效
    if (!store || typeof store.getState !== 'function') {
      throw new Error('Redux store 无效 - 检查 store.js 文件');
    }
    
    console.log('Redux store 初始化成功:', store);
    
    const root = ReactDOM.createRoot(container);
    root.render(
      <Provider store={store}>
        <App />
      </Provider>
    );
  } catch (error) {
    console.error('应用渲染失败:', error);
    // 在DOM中显示错误，便于调试
    container.innerHTML = `
      <div style="color: red; padding: 20px;">
        <h2>应用初始化错误</h2>
        <p>${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
};

// 确保DOM已加载
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}