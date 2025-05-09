import React from 'react';
import { Layout, Menu, Breadcrumb } from 'antd';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  DashboardOutlined, 
  ShopOutlined, 
  AppstoreOutlined, 
  PictureOutlined,
  SettingOutlined 
} from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;

// 临时仪表盘组件���实际项目中应该导入真实的页面组件
const Dashboard = () => (
  <div style={{ padding: 24, minHeight: 360, background: '#fff' }}>
    <h2>仪表盘</h2>
    <p>这里将展示管理系统的核心数据和指标。</p>
  </div>
);

const BasicLayout = () => {
  const location = useLocation();
  
  // 定义侧边菜单项
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">仪表盘</Link>,
    },
    {
      key: 'merchants',
      icon: <ShopOutlined />,
      label: '商户管理',
      children: [
        {
          key: 'merchants-list',
          label: <Link to="/merchants/list">商户列表</Link>,
        },
        {
          key: 'merchants-review',
          label: <Link to="/merchants/review">商户审核</Link>,
        },
      ],
    },
    {
      key: 'categories',
      icon: <AppstoreOutlined />,
      label: <Link to="/categories">分类管理</Link>,
    },
    {
      key: 'content',
      icon: <PictureOutlined />,
      label: '内容管理',
      children: [
        {
          key: 'banners',
          label: <Link to="/content/banners">轮播图管理</Link>,
        },
        {
          key: 'notices',
          label: <Link to="/content/notices">公告管理</Link>,
        },
      ],
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        {
          key: 'basic-settings',
          label: <Link to="/settings/basic">基础配置</Link>,
        },
        {
          key: 'commission',
          label: <Link to="/settings/commission">佣金设置</Link>,
        },
        {
          key: 'admins',
          label: <Link to="/settings/admins">管理员账号</Link>,
        },
      ],
    },
  ];

  // 根据当前路径计算默认选中的菜单项
  const getDefaultSelectedKeys = () => {
    const path = location.pathname;
    const paths = path.split('/').filter(Boolean);
    if (paths.length > 0) {
      if (paths.length === 1) {
        return [paths[0]];
      } else {
        return [`${paths[0]}-${paths[1]}`];
      }
    }
    return ['dashboard'];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        padding: '0 50px', 
        display: 'flex', 
        alignItems: 'center',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,21,41,.08)'
      }}>
        <div style={{ 
          width: 200, 
          fontSize: '18px', 
          fontWeight: 'bold' 
        }}>
          社区团购管理系统
        </div>
      </Header>
      <Layout>
        <Sider width={200} theme="light" style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={getDefaultSelectedKeys()}
            defaultOpenKeys={['merchants', 'content', 'settings']}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Layout style={{ padding: '0 24px 24px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>首页</Breadcrumb.Item>
            <Breadcrumb.Item>仪表盘</Breadcrumb.Item>
          </Breadcrumb>
          <Content
            style={{
              background: '#fff',
              padding: 24,
              margin: 0,
              minHeight: 280,
            }}
          >
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
      <Footer style={{ textAlign: 'center' }}>
        社区团购管理系统 ©{new Date().getFullYear()} Created by Your Company
      </Footer>
    </Layout>
  );
};

export default BasicLayout;
