import React, { useState, useEffect } from 'react';
import { Layout, ConfigProvider, message, FloatButton, Menu, Avatar, Dropdown, Breadcrumb, Badge, Tooltip } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  UserOutlined, 
  DashboardOutlined,
  ShopOutlined,
  ShoppingOutlined,
  OrderedListOutlined,
  TeamOutlined,
  PieChartOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { logoutAsync } from '../redux/slices/authSlice';
import './BasicLayout.less'; // 仍然尝试加载.less文件，但添加内联样式作为保障

const { Header, Sider, Content, Footer } = Layout;


const BasicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isLoggedIn } = useSelector((state) => state.auth);
  const { userInfo } = useSelector((state) => state.user || { userInfo: {} });
  
  // 侧边栏折叠状态
  const [collapsed, setCollapsed] = useState(false);
  
  // 当前选中的菜单项和展开的子菜单
  const [selectedKeys, setSelectedKeys] = useState(['/dashboard']);
  const [openKeys, setOpenKeys] = useState([]);

  // 监听路由变化，更新菜单选中状态
  useEffect(() => {
    const pathname = location.pathname;
    setSelectedKeys([pathname]);

    // 找出当前路径所属的子菜单并展开
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 1) {
      setOpenKeys([`/${pathParts[0]}`]);
    }
  }, [location.pathname]);

  // 监听登录状态
  useEffect(() => {
    if (!isLoggedIn) {
      message.error('登录已过期，请重新登录');
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);
  
  // 切换侧边栏折叠状态
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // 处理菜单点击
  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  // 处理子菜单展开/收起
  const handleOpenChange = (keys) => {
    setOpenKeys(keys);
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
  
  // 获取页面标题和描述
  const getPageInfo = () => {
    // 根据路由匹配页面信息
    const path = location.pathname;
    
    const pageTitles = {
      '/dashboard': {
        title: '仪表盘',
        desc: '系统概览和重要数据指标'
      },
      '/merchants/list': {
        title: '商户列表',
        desc: '管理系统中的所有商户'
      },
      '/products/list': {
        title: '商品列表',
        desc: '管理所有商品信息'
      },
      '/orders/list': {
        title: '订单列表',
        desc: '查看和管理系统订单'
      },
      '/users/list': {
        title: '用户列表',
        desc: '管理系统用户账号'
      },
      '/statistics/sales': {
        title: '销售统计',
        desc: '查看销售数据和趋势分析'
      },
      '/marketing/banners': {
        title: '轮播图管理',
        desc: '管理系统轮播图和广告位'
      },
      '/system/configs': {
        title: '系统配置',
        desc: '配置系统参数和选项'
      }
    };
    
    return pageTitles[path] || { 
      title: '社区团购管理系统', 
      desc: '高效管理，轻松运营' 
    };
  };

  // 用户下拉菜单配置 
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

  // 通知下拉菜单
  const notificationItems = [
    {
      key: 'notification-header',
      disabled: true,
      label: <div style={{ fontWeight: 'bold' }}>通知 (2)</div>
    },
    {
      type: 'divider'
    },
    {
      key: 'notification-1',
      label: (
        <div>
          <div style={{ fontWeight: 'bold' }}>系统通知</div>
          <div style={{ fontSize: '12px' }}>欢迎使用社区团购管理系统</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>10分钟前</div>
        </div>
      ),
    },
    {
      key: 'notification-2',
      label: (
        <div>
          <div style={{ fontWeight: 'bold' }}>订单提醒</div>
          <div style={{ fontSize: '12px' }}>您有3个新订单待处理</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>30分钟前</div>
        </div>
      ),
    },
    {
      type: 'divider'
    },
    {
      key: 'view-all',
      label: <div style={{ textAlign: 'center' }}>查看全部</div>,
      onClick: () => navigate('/notifications')
    }
  ];

  // 面包屑项目配置
  const getBreadcrumbItems = () => {
    const pathSnippets = location.pathname.split('/').filter(i => i);
    
    // 基础面包屑项（首页）
    const breadcrumbItems = [
      {
        title: <span onClick={() => navigate('/dashboard')}>首页</span>,
        key: 'home'
      }
    ];
    
    // 构建路径面包屑
    let path = '';
    pathSnippets.forEach((snippet, index) => {
      path += `/${snippet}`;
      
      // 根据路径获取标题
      let title = snippet;
      
      // 转换为更友好的显示名称
      switch (snippet) {
        case 'dashboard': title = '仪表盘'; break;
        case 'merchants': title = '商户管理'; break;
        case 'products': title = '商品管理'; break;
        case 'orders': title = '订单管理'; break;
        case 'users': title = '用户管理'; break;
        case 'statistics': title = '统计分析'; break;
        case 'marketing': title = '营销管理'; break;
        case 'system': title = '系统设置'; break;
        case 'list': title = '列表'; break;
        default: title = snippet.charAt(0).toUpperCase() + snippet.slice(1);
      }
      
      breadcrumbItems.push({
        title: title,
        key: path
      });
    });
    
    return breadcrumbItems;
  };

  // 获取当前页面信息
  const pageInfo = getPageInfo();
  
  // ===== 内联样式定义 =====
  const layoutStyle = {
    minHeight: '100vh'
  };
  
  const siderStyle = {
    overflow: 'auto',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100
  };
  
  const logoStyle = {
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    padding: collapsed ? '0' : '0 24px',
    background: '#002140',
    transition: 'all 0.3s'
  };
  
  const logoTextStyle = {
    color: 'white',
    fontSize: '18px',
    fontWeight: 600,
    marginLeft: '12px',
    whiteSpace: 'nowrap',
    display: collapsed ? 'none' : 'block'
  };
  
  const contentLayoutStyle = {
    marginLeft: collapsed ? '80px' : '200px',
    transition: 'all 0.3s'
  };
  
  const headerStyle = {
    background: '#fff',
    padding: 0,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 99
  };
  
  const headerTriggerStyle = {
    fontSize: '18px',
    padding: '0 24px',
    cursor: 'pointer',
    transition: 'color 0.3s',
    color: 'rgba(0, 0, 0, 0.65)'
  };
  
  const headerRightStyle = {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingRight: '24px'
  };
  
  const headerItemStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    height: '64px',
    padding: '0 12px',
    cursor: 'pointer',
    color: 'rgba(0, 0, 0, 0.65)',
    transition: 'background 0.3s',
    ':hover': {
      background: 'rgba(0, 0, 0, 0.025)'
    }
  };
  
  const breadcrumbContainerStyle = {
    flex: 1,
    paddingLeft: '24px'
  };
  
  const userInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    cursor: 'pointer'
  };
  
  const userNameStyle = {
    marginLeft: '8px'
  };
  
  const contentStyle = {
    margin: '24px',
    background: '#f0f2f5',
    borderRadius: '2px',
    padding: '24px 0'
  };
  
  const contentHeaderStyle = {
    padding: '0 24px',
    marginBottom: '24px'
  };
  
  const pageTitleStyle = {
    fontSize: '20px',
    fontWeight: 500,
    color: 'rgba(0, 0, 0, 0.85)',
    marginBottom: '8px'
  };
  
  const pageDescStyle = {
    fontSize: '14px',
    color: 'rgba(0, 0, 0, 0.45)'
  };
  
  const contentCardStyle = {
    padding: '24px',
    background: '#fff',
    minHeight: '280px',
    borderRadius: '2px',
    margin: '0 24px'
  };
  
  const footerStyle = {
    textAlign: 'center',
    padding: '16px 50px',
    color: 'rgba(0, 0, 0, 0.45)',
    fontSize: '14px',
    background: '#f0f2f5',
    marginLeft: collapsed ? '80px' : '200px',
    transition: 'all 0.3s'
  };
  
  // 定义菜单项配置
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘'
    },
    {
      key: '/merchants',
      icon: <ShopOutlined />,
      label: '商户管理',
      children: [
        {
          key: '/merchants/list',
          label: '商户列表'
        },
        {
          key: '/merchants/categories',
          label: '商户分类'
        },
        {
          key: '/merchants/review',
          label: '入驻审核'
        }
      ]
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: '商品管理',
      children: [
        {
          key: '/products/list',
          label: '商品列表'
        },
        {
          key: '/products/categories',
          label: '商品分类'
        },
        {
          key: '/products/groups',
          label: '团购管理'
        }
      ]
    },
    {
      key: '/orders',
      icon: <OrderedListOutlined />,
      label: '订单管理',
      children: [
        {
          key: '/orders/list',
          label: '订单列表'
        },
        {
          key: '/orders/refunds',
          label: '退款管理'
        }
      ]
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: '用户管理',
      children: [
        {
          key: '/users/list',
          label: '用户列表'
        },
        {
          key: '/users/address',
          label: '地址管理'
        }
      ]
    },
    {
      key: '/statistics',
      icon: <PieChartOutlined />,
      label: '统计分析',
      children: [
        {
          key: '/statistics/sales',
          label: '销售统计'
        },
        {
          key: '/statistics/merchants',
          label: '商户统计'
        },
        {
          key: '/statistics/products',
          label: '商品统计'
        },
        {
          key: '/statistics/users',
          label: '用户统计'
        }
      ]
    },
    {
      key: '/system',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        {
          key: '/system/admins',
          label: '管理员管理'
        },
        {
          key: '/system/roles',
          label: '角色权限'
        },
        {
          key: '/system/configs',
          label: '系统配置'
        },
        {
          key: '/system/logs',
          label: '操作日志'
        }
      ]
    }
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <Layout style={layoutStyle}>
        {/* 侧边栏 */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={200}
          style={siderStyle}
          theme="dark"
        >
          {/* Logo区域 */}
          <div style={logoStyle}>
            <svg viewBox="0 0 24 24" fill="white" width="32" height="32">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <h1 style={logoTextStyle}>社区团购管理</h1>
          </div>
          
          {/* 菜单部分 */}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            onOpenChange={handleOpenChange}
            onClick={handleMenuClick}
            items={menuItems}
          />
        </Sider>
        
        {/* 主内容区域 */}
        <Layout style={contentLayoutStyle}>
          {/* 顶部导航 */}
          <Header style={headerStyle}>
            {/* 折叠按钮 */}
            <div style={headerTriggerStyle} onClick={toggleCollapsed}>
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
            
            {/* 面包屑导航 */}
            <div style={breadcrumbContainerStyle}>
              <Breadcrumb items={getBreadcrumbItems()} />
            </div>
            
            {/* 右侧工具区 */}
            <div style={headerRightStyle}>
              {/* 通知图标 */}
              <Tooltip title="通知中心">
                <Dropdown menu={{ items: notificationItems }} trigger={['click']} placement="bottomRight">
                  <span style={headerItemStyle}>
                    <Badge count={2} offset={[2, -5]}>
                      <BellOutlined style={{ fontSize: '16px' }} />
                    </Badge>
                  </span>
                </Dropdown>
              </Tooltip>
              
              {/* 用户信息 */}
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <span style={userInfoStyle}>
                  <Avatar size="small" icon={<UserOutlined />} src={userInfo?.avatar} />
                  <span style={userNameStyle}>{userInfo?.name || userInfo?.username || '管理员'}</span>
                </span>
              </Dropdown>
            </div>
          </Header>
          
          {/* 内容区域 */}
          <Content style={contentStyle}>
            {/* 页面标题区域 */}
            <div style={contentHeaderStyle}>
              <h1 style={pageTitleStyle}>{pageInfo.title}</h1>
              <div style={pageDescStyle}>{pageInfo.desc}</div>
            </div>
            
            {/* 页面内容卡片 */}
            <div style={contentCardStyle}>
              <Outlet />
            </div>
          </Content>
          
          {/* 页脚 */}
          <Footer style={footerStyle}>
            <div>社区团购管理系统 &copy; {new Date().getFullYear()} - 版权所有</div>
            <div>技术支持: 您的公司名称</div>
          </Footer>
        </Layout>
        
        {/* 回到顶部按钮 */}
        <FloatButton.BackTop visibilityHeight={100} />
      </Layout>
    </ConfigProvider>
  );
};

export default BasicLayout;