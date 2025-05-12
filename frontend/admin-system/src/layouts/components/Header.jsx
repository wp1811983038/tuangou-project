import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Breadcrumb, Dropdown, Badge, Avatar, Tooltip, message } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  BellOutlined,
  GlobalOutlined,
  LogoutOutlined,
  SettingOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { logoutAsync } from '../../redux/slices/authSlice';
import menuConfig from '../../config/menuConfig';

const { Header } = Layout;

const HeaderComponent = ({ collapsed, toggle }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.user);
  
  // 模拟通知数据
  const [notifications, setNotifications] = useState([
    { id: 1, title: '系统通知', content: '欢迎使用社区团购管理系统', read: false, time: '10分钟前' },
    { id: 2, title: '订单提醒', content: '您有3个新订单待处理', read: false, time: '30分钟前' },
    { id: 3, title: '系统更新', content: '系统将在今晚22:00进行例行维护', read: true, time: '2小时前' },
  ]);
  
  // 获取未读通知数量
  const unreadCount = notifications.filter(item => !item.read).length;
  
  // 生成面包屑项目配置
  const generateBreadcrumbItems = () => {
    const breadcrumbItems = [];
    const pathSnippets = location.pathname.split('/').filter(i => i);
    
    // 添加首页
    breadcrumbItems.push({
      key: 'home',
      title: <span onClick={() => navigate('/dashboard')}>首页</span>
    });
    
    // 递归查找匹配的菜单项
    const findMenuTitle = (path, items) => {
      for (const item of items) {
        if (item.key === path) {
          return item.title;
        }
        if (item.children) {
          const title = findMenuTitle(path, item.children);
          if (title) return title;
        }
      }
      return null;
    };
    
    // 构建完整路径并添加到面包屑
    let path = '';
    pathSnippets.forEach((snippet, index) => {
      path = `/${snippet}`;
      if (index < pathSnippets.length - 1) {
        path = `/${pathSnippets.slice(0, index + 1).join('/')}`;
      } else {
        path = `/${pathSnippets.join('/')}`;
      }
      
      const title = findMenuTitle(path, menuConfig);
      if (title) {
        breadcrumbItems.push({
          key: path,
          title: title
        });
      }
    });
    
    return breadcrumbItems;
  };
  
  // 退出登录
  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync());
      message.success('退出登录成功');
      navigate('/login');
    } catch (error) {
      message.error('退出登录失败，请重试');
    }
  };
  
  // 查看所有通知
  const viewAllNotifications = () => {
    navigate('/notifications');
  };
  
  // 标记通知为已读
  const markAsRead = (id) => {
    setNotifications(
      notifications.map(item => 
        item.id === id ? { ...item, read: true } : item
      )
    );
  };
  
  // 用户下拉菜单项
  const userMenuItems = [
    {
      key: 'user-center',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账号设置',
      onClick: () => navigate('/settings')
    },
    {
      key: 'change-password',
      icon: <KeyOutlined />,
      label: '修改密码',
      onClick: () => navigate('/change-password')
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ];
  
  // 通知下拉菜单项
  const notificationMenuItems = [
    {
      key: 'notification-header',
      disabled: true,
      label: <div style={{ fontWeight: 'bold' }}>通知 ({unreadCount})</div>
    },
    {
      type: 'divider'
    },
    ...notifications.map(item => ({
      key: item.id,
      label: (
        <div style={{ opacity: item.read ? 0.5 : 1 }}>
          <div style={{ fontWeight: item.read ? 'normal' : 'bold' }}>{item.title}</div>
          <div style={{ fontSize: '12px' }}>{item.content}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{item.time}</div>
        </div>
      ),
      onClick: () => markAsRead(item.id)
    })),
    {
      type: 'divider'
    },
    {
      key: 'view-all',
      label: <div style={{ textAlign: 'center' }}>查看全部</div>,
      onClick: viewAllNotifications
    }
  ];
  
  return (
    <Header className="layout-header">
      <div className="collapse-btn" onClick={toggle}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </div>
      
      <div className="breadcrumb-container">
        <Breadcrumb items={generateBreadcrumbItems()} />
      </div>
      
      <div className="header-right">
        <Tooltip title="通知中心">
          <Dropdown menu={{ items: notificationMenuItems }} trigger={['click']} placement="bottomRight">
            <span className="header-action">
              <Badge count={unreadCount} offset={[2, -5]}>
                <BellOutlined style={{ fontSize: '16px' }} />
              </Badge>
            </span>
          </Dropdown>
        </Tooltip>
        
        <Tooltip title="切换语言">
          <span className="header-action">
            <GlobalOutlined style={{ fontSize: '16px' }} />
          </span>
        </Tooltip>
        
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" className="avatar-dropdown">
          <span className="header-action user-info">
            <Avatar size="small" icon={<UserOutlined />} src={userInfo?.avatar} />
            <span className="user-name">{userInfo?.name || userInfo?.username || '管理员'}</span>
          </span>
        </Dropdown>
      </div>
    </Header>
  );
};

export default HeaderComponent;