// frontend/admin-system/src/components/Auth/LoginForm.jsx

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, Divider } from 'antd';
import { UserOutlined, LockOutlined, EyeTwoTone, EyeInvisibleOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import './LoginForm.less';

const LoginForm = () => {
  const [form] = Form.useForm();
  const { login, getRememberedCredentials } = useAuth();
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // 初始化表单数据，如果有记住的凭据，则填充
  useEffect(() => {
    const rememberedInfo = getRememberedCredentials();
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
    try {
      setSubmitting(true);
      const { username, password } = values;
      await login(username, password, remember);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="login-form">
      <Form
        form={form}
        name="login"
        onFinish={handleSubmit}
        size="large"
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' }
          ]}
        >
          <Input 
            prefix={<UserOutlined />} 
            placeholder="管理员用户名" 
            autoComplete="username"
            allowClear
          />
        </Form.Item>
        
        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6个字符' }
          ]}
        >
          <Input.Password 
            prefix={<LockOutlined />} 
            placeholder="密码" 
            autoComplete="current-password"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>
        
        <Form.Item className="remember-forgot">
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox 
              checked={remember} 
              onChange={(e) => setRemember(e.target.checked)}
            >
              记住我
            </Checkbox>
          </Form.Item>
          
          <a className="login-form-forgot" href="#/reset-password">
            忘记密码?
          </a>
        </Form.Item>
        
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            className="login-button"
            loading={submitting}
            block
          >
            登录
          </Button>
        </Form.Item>
        
        <Divider>管理系统登录</Divider>
        
        <div className="login-tips">
          <p>登录即表示您同意系统的服务条款和隐私政策</p>
        </div>
      </Form>
    </div>
  );
};

export default LoginForm;