import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../src/hooks/useAuth'; 
import './index.less';

const ForgotPassword = () => {
  const [form] = Form.useForm();
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');

  // 处理表单提交
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (step === 1) {
        // 模拟发送验证码
        await new Promise(resolve => setTimeout(resolve, 1000));
        message.success('验证码已发送到您的邮箱，请查收');
        setEmail(values.email);
        setStep(2);
      } else if (step === 2) {
        // 模拟验证验证码
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStep(3);
      } else {
        // 模拟重置密码
        await resetPassword(values.password);
        message.success('密码重置成功，请使用新密码登录');
        // 重定向到登录页
        window.location.href = '/login';
      }
    } catch (error) {
      message.error(error.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 根据步骤渲染不同表单
  const renderFormByStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入您的邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input 
                prefix={<MailOutlined className="site-form-item-icon" />} 
                placeholder="邮箱地址" 
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                className="login-form-button" 
                size="large"
                loading={loading}
              >
                获取验证码
              </Button>
            </Form.Item>
          </>
        );
      case 2:
        return (
          <>
            <p className="text-muted">验证码已发送至邮箱: {email}</p>
            <Form.Item
              name="verificationCode"
              rules={[
                { required: true, message: '请输入验证码' },
                { len: 6, message: '验证码长度应为6位' }
              ]}
            >
              <Input 
                placeholder="6位验证码" 
                size="large"
                maxLength={6}
              />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                className="login-form-button" 
                size="large"
                loading={loading}
              >
                验证
              </Button>
            </Form.Item>
          </>
        );
      case 3:
        return (
          <>
            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined className="site-form-item-icon" />} 
                placeholder="新密码" 
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined className="site-form-item-icon" />} 
                placeholder="确认新密码" 
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                className="login-form-button" 
                size="large"
                loading={loading}
              >
                重置密码
              </Button>
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-content">
        <div className="form-header">
          <h2>忘记密码</h2>
          <p>按照步骤重置您的密码</p>
        </div>
        
        <div className="steps-indicator">
          <div className={`step-item ${step >= 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-title">身份验证</div>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-title">输入验证码</div>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-title">重置密码</div>
          </div>
        </div>
        
        <Form
          form={form}
          name="forgot_password"
          onFinish={handleSubmit}
          className="forgot-password-form"
        >
          {renderFormByStep()}
        </Form>
        
        <div className="form-footer">
          <Link to="/login">返回登录</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;