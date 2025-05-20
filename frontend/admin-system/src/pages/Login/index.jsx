import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, message, Spin } from 'antd';
import { UserOutlined, LockOutlined, RightOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import './index.less';

// 导入图片
// (确保在public/images目录下有这些图片，或者调整路径)
// import headerLogo from '../../assets/images/logo.png'; // 如果没有可以注释掉这行

const LoginPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, login, loading, error, clearAuthError, getRememberedCredentials } = useAuth();
  const [form] = Form.useForm();
  const [remember, setRemember] = useState(false);

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard');
    }
  }, [isLoggedIn, navigate]);

  // 处理错误信息
  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearAuthError]);

  // 初始化表单数据
  useEffect(() => {
    const rememberedInfo = getRememberedCredentials?.();
    if (rememberedInfo) {
      form.setFieldsValue({
        username: rememberedInfo.username,
        password: rememberedInfo.password,
      });
      setRemember(true);
    }
  }, [form, getRememberedCredentials]);

  // 表单提交处理
  const handleSubmit = async (values) => {
    const { username, password } = values;
    await login(username, password, remember);
  };

  // 动态背景随机点生成
  const generateRandomDots = () => {
    const dots = [];
    for (let i = 0; i < 50; i++) {
      const style = {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${5 + Math.random() * 10}s`
      };
      dots.push(<div key={i} className="bg-dot" style={style}></div>);
    }
    return dots;
  };

  return (
    <div className="login-container">
      {/* 左侧品牌区域 */}
      <div className="login-brand">
        <div className="brand-content">
          <div className="brand-background">
            {generateRandomDots()}
          </div>
          <div className="brand-info">
            <div className="brand-logo">
              {/* 如果有logo图片，可以使用下面这行 */}
              {/* <img src={headerLogo} alt="Logo" /> */}
              
              {/* 如果没有logo图片，可以使用下面的SVG图标 */}
              <svg viewBox="0 0 24 24" fill="white" width="80" height="80">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="brand-title">社区团购管理系统</h1>
            <h2 className="brand-subtitle">高效管理，轻松运营</h2>
            <div className="brand-description">
              <p>全面的商户管理功能，帮助您高效运营社区团购业务</p>
            </div>
            <ul className="brand-features">
              <li>
                <RightOutlined />
                <span>商户入驻与审核</span>
              </li>
              <li>
                <RightOutlined />
                <span>商品分类与管理</span>
              </li>
              <li>
                <RightOutlined />
                <span>轮播图与营销内容管理</span>
              </li>
              <li>
                <RightOutlined />
                <span>销售数据实时分析</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 右侧登录表单区域 */}
      <div className="login-form-container">
        <div className="login-form-content">
          <div className="form-header">
            <h2>欢迎回来</h2>
            <p>请登录您的管理员账号</p>
          </div>

          {loading ? (
            <div className="form-loading">
              <Spin size="large" />
              <p>登录中，请稍候...</p>
            </div>
          ) : (
            <Form
              form={form}
              name="login"
              onFinish={handleSubmit}
              className="login-form"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' }
                ]}
              >
                <Input 
                  prefix={<UserOutlined className="site-form-item-icon" />} 
                  placeholder="用户名" 
                  size="large"
                />
              </Form.Item>
              
              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6个字符' }
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined className="site-form-item-icon" />} 
                  placeholder="密码" 
                  size="large"
                />
              </Form.Item>
              
              <Form.Item>
                <div className="login-form-remember">
                  <Checkbox 
                    checked={remember} 
                    onChange={(e) => setRemember(e.target.checked)}
                  >
                    记住我
                  </Checkbox>
                  <a className="login-form-forgot" href="#reset-password">
                    忘记密码?
                  </a>
                </div>
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  className="login-form-button" 
                  size="large"
                  loading={loading}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          )}

          <div className="login-footer">
            <p>登录即表示您同意系统的<a href="#terms">服务条款</a>和<a href="#privacy">隐私政策</a></p>
            <div className="copyright">
              <p>© {new Date().getFullYear()} 社区团购管理系统 版权所有</p>
              <p>技术支持: 您的公司名称</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;