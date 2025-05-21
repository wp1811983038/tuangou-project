import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, message, Spin } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined, RightOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import './index.less';

// 如果有logo图片，请确保导入它
// import headerLogo from '../../assets/images/logo.svg';

const LoginPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, login, loading, error, clearError, getRememberedCredentials } = useAuth();
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
      clearError(); // 修正：使用正确的函数名
    }
  }, [error, clearError]);

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
      <div className="login-brand merchant-theme">
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
                <path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3zm0 2.3L19 7v4c0 4.52-3.13 8.69-7 9.93-3.87-1.24-7-5.41-7-9.93V7l7-2.7z" />
                <path d="M11 7h2v2h-2zM11 11h2v6h-2z" />
              </svg>
            </div>
            <h1 className="brand-title">社区团购商户平台</h1>
            <h2 className="brand-subtitle">管理店铺，增加销量</h2>
            <div className="brand-description">
              <p>专为商户设计的管理平台，帮助您高效运营社区团购业务</p>
            </div>
            <ul className="brand-features">
              <li>
                <RightOutlined />
                <span>商品管理与发布</span>
              </li>
              <li>
                <RightOutlined />
                <span>团购活动创建</span>
              </li>
              <li>
                <RightOutlined />
                <span>订单处理与物流</span>
              </li>
              <li>
                <RightOutlined />
                <span>经营数据实时分析</span>
              </li>
              <li>
                <RightOutlined />
                <span>客户评价管理</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 右侧登录表单区域 */}
      <div className="login-form-container">
        <div className="login-form-content merchant-form">
          <div className="form-header">
            <h2>商户登录</h2>
            <p>请输入您的商户账号和密码</p>
          </div>

          {loading ? (
            <div className="form-loading">
              <Spin size="large" />
              <p>登录中，请稍候...</p>
            </div>
          ) : (
            <Form
              form={form}
              name="merchant_login"
              onFinish={handleSubmit}
              className="login-form"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入商户账号' },
                  { min: 3, message: '账号至少3个字符' }
                ]}
              >
                <Input 
                  prefix={<ShopOutlined className="site-form-item-icon" />} 
                  placeholder="商户账号" 
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
                    记住账号
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
              
              <Form.Item>
                <div className="register-link">
                  <span>还没有商户账号？</span>
                  <a href="#register">立即申请入驻</a>
                </div>
              </Form.Item>
            </Form>
          )}

          <div className="login-footer">
            <p>登录即表示您同意系统的<a href="#terms">服务条款</a>和<a href="#privacy">隐私政策</a></p>
            <div className="copyright">
              <p>© {new Date().getFullYear()} 社区团购商户平台 版权所有</p>
              <p>技术支持: 您的公司名称</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;