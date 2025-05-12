import React from 'react';
import { Layout } from 'antd';

const { Footer } = Layout;

const FooterComponent = () => {
  return (
    <Footer className="layout-footer">
      <div>社区团购管理系统 &copy; {new Date().getFullYear()} - 版权所有</div>
      <div>技术支持: 您的公司名称</div>
    </Footer>
  );
};

export default FooterComponent;