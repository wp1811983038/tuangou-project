// src/layouts/MerchantLayout.jsx
import React, { useState, useEffect } from 'react';
import { Layout, Menu, Dropdown, Avatar, Button, Drawer, Badge, Spin } from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DashboardOutlined,
  ShopOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  CommentOutlined,
  SettingOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  HomeFilled,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './MerchantLayout.less';

const { Header, Sider, Content } = Layout;

const MerchantLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, currentUser } = useAuth();
  
  // 检测窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setMobileView(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // 页面加载完成时
  useEffect(() => {
    // 模拟加载用户数据
    const timer = setTimeout(() => {
      setLoading(false);
      setUnreadNotifications(3); // 假设有3条未读消息
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // 菜单项配置
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/products',
      icon: <AppstoreOutlined />,
      label: '商品管理',
    },
    {
      key: '/groups',
      icon: <ShoppingCartOutlined />,
      label: '团购管理',
    },
    {
      key: '/orders',
      icon: <ShopOutlined />,
      label: '订单管理',
    },
    {
      key: '/reviews',
      icon: <CommentOutlined />,
      label: '评价管理',
    },
    {
      key: '/customers',
      icon: <TeamOutlined />,
      label: '客户管理',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        {
          key: '/profile',
          label: '商户资料',
        },
        {
          key: '/staff',
          label: '员工管理',
        },
        {
          key: '/payment',
          label: '支付设置',
        },
      ],
    },
  ];
  
  // 处理菜单点击
  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (mobileView) {
      setDrawerVisible(false);
    }
  };
  
  // 获取默认选中的菜单项
  const getSelectedKeys = () => {
    const path = location.pathname;
    const defaultOpenKeys = [];
    
    // 查找匹配的菜单项
    const findMenuItem = (items) => {
      for (const item of items) {
        if (item.children) {
          for (const child of item.children) {
            if (path === child.key || path.startsWith(child.key)) {
              defaultOpenKeys.push(item.key);
              return child.key;
            }
          }
        } else if (path === item.key || path.startsWith(item.key)) {
          return item.key;
        }
      }
      return '/dashboard'; // 默认选中仪表盘
    };
    
    const selectedKey = findMenuItem(menuItems);
    
    return { selectedKeys: [selectedKey], openKeys: defaultOpenKeys };
  };
  
  const { selectedKeys, openKeys } = getSelectedKeys();
  
  // 用户菜单
  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />} onClick={() => navigate('/profile')}>
        商户资料
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={logout}>
        退出登录
      </Menu.Item>
    </Menu>
  );
  
  // 通知菜单
  const notificationMenu = (
    <Menu>
      <Menu.Item key="notification1">
        <div className="notification-item">
          <div className="notification-title">新订单通知</div>
          <div className="notification-time">10分钟前</div>
          <div className="notification-content">您有一个新的订单待处理</div>
        </div>
      </Menu.Item>
      <Menu.Item key="notification2">
        <div className="notification-item">
          <div className="notification-title">团购成功</div>
          <div className="notification-time">1小时前</div>
          <div className="notification-content">XXX团购活动已达成</div>
        </div>
      </Menu.Item>
      <Menu.Item key="notification3">
        <div className="notification-item">
          <div className="notification-title">新评价</div>
          <div className="notification-time">2小时前</div>
          <div className="notification-content">您有一条新的评价待回复</div>
        </div>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="all">
        <a href="/notifications">查看全部通知</a>
      </Menu.Item>
    </Menu>
  );
  
  // 侧边栏渲染
  const siderMenu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={selectedKeys}
      defaultOpenKeys={openKeys}
      items={menuItems}
      onClick={handleMenuClick}
    />
  );
  
  // 如果还在加载，显示加载状态
  if (loading) {
    return (
      <div className="layout-loading">
        <Spin size="large" />
        <div className="loading-text">加载中...</div>
      </div>
    );
  }
  
  return (
    <Layout className="merchant-layout">
      {/* 电脑端侧边栏 */}
      {!mobileView && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={220}
          className="merchant-sider"
        >
          <div className="logo">
            {collapsed ? <HomeFilled /> : <span>商户管理系统</span>}
          </div>
          {siderMenu}
        </Sider>
      )}
      
      {/* 移动端抽屉 */}
      {mobileView && (
        <Drawer
          placement="left"
          closable={false}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          bodyStyle={{ padding: 0, backgroundColor: '#001529' }}
          width={200}
        >
          <div className="logo">
            <span>商户管理系统</span>
          </div>
          {siderMenu}
        </Drawer>
      )}
      
      <Layout className="site-layout">
        <Header className="site-header">
          <div className="header-left">
            {mobileView ? (
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setDrawerVisible(true)}
                className="trigger"
              />
            ) : (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                className="trigger"
              />
            )}
          </div>
          
          <div className="header-right">
            <Dropdown
              overlay={notificationMenu}
              trigger={['click']}
              placement="bottomRight"
            >
              <Badge count={unreadNotifications} overflowCount={9}>
                <Button type="text" icon={<BellOutlined />} className="header-icon" />
              </Badge>
            </Dropdown>
            
            <Dropdown overlay={userMenu} trigger={['click']} placement="bottomRight">
              <div className="user-info">
                <Avatar
                  size="small"
                  src={currentUser?.avatar_url}
                  icon={<UserOutlined />}
                />
                {!mobileView && <span className="username">{currentUser?.nickname || '商户管理员'}</span>}
              </div>
            </Dropdown>
          </div>
        </Header>
        
        <Content className="site-content">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MerchantLayout;