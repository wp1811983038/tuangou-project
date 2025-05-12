import React, { useState, useEffect } from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import menuConfig from '../../config/menuConfig';

const { Sider } = Layout;

const SiderComponent = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roles } = useSelector((state) => state.user);
  
  // 当前选中的菜单项
  const [selectedKeys, setSelectedKeys] = useState([]);
  // 当前展开的SubMenu
  const [openKeys, setOpenKeys] = useState([]);
  
  // 根据当前路径更新选中的菜单项
  useEffect(() => {
    const pathname = location.pathname;
    setSelectedKeys([pathname]);
    
    // 查找当前路径所属的父级菜单
    const findOpenKeys = (path, items) => {
      for (const item of items) {
        if (item.key === path) {
          return [];
        }
        if (item.children) {
          if (item.children.some(child => child.key === path)) {
            return [item.key];
          }
          const childOpenKeys = findOpenKeys(path, item.children);
          if (childOpenKeys.length > 0) {
            return [item.key, ...childOpenKeys];
          }
        }
      }
      return [];
    };
    
    if (!collapsed) {
      const newOpenKeys = findOpenKeys(pathname, menuConfig);
      setOpenKeys(newOpenKeys);
    }
  }, [location.pathname, collapsed]);
  
  // 处理菜单点击
  const handleMenuClick = ({ key }) => {
    navigate(key);
  };
  
  // 处理SubMenu展开/收起
  const handleOpenChange = (keys) => {
    setOpenKeys(keys);
  };
  
  // 检查用户是否有权限访问菜单项
  const hasPermission = (item) => {
    if (!item.permissions) return true;
    return item.permissions.some(permission => roles.includes(permission));
  };
  
  // 生成菜单项配置
  const generateMenuItems = (items) => {
    return items.map(item => {
      // 无权限访问则跳过
      if (!hasPermission(item)) {
        return null;
      }
      
      // 有子菜单项则递归处理
      if (item.children && item.children.length > 0) {
        const childItems = generateMenuItems(item.children).filter(child => child !== null);
        // 如果所有子项都无权限访问，则父级也不显示
        if (childItems.length === 0) {
          return null;
        }
        
        return {
          key: item.key,
          icon: item.icon,
          label: item.title,
          children: childItems
        };
      }
      
      // 返回菜单项配置
      return {
        key: item.key,
        icon: item.icon,
        label: item.title
      };
    }).filter(item => item !== null);
  };
  
  return (
    <Sider
      className="layout-sider"
      trigger={null}
      collapsible
      collapsed={collapsed}
      breakpoint="lg"
      onBreakpoint={(broken) => {
        if (broken) {
          setCollapsed(true);
        }
      }}
      width={256}
    >
      <div className="logo">
        {/* 使用SVG替代图片，避免404错误 */}
        <svg viewBox="0 0 24 24" fill="white" width="32" height="32" className="logo-img">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        {!collapsed && <h1>社区团购管理</h1>}
      </div>
      
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        onClick={handleMenuClick}
        items={generateMenuItems(menuConfig)}
      />
    </Sider>
  );
};

export default SiderComponent;