// src/pages/Profile/index.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, Button, Row, Col, Upload, Space,
  message, Divider, Select, Switch, InputNumber, Spin,
  Steps, Modal, Typography, Tabs, Result, Alert
} from 'antd';
import {
  UserOutlined, PhoneOutlined, MailOutlined, ShopOutlined,
  EnvironmentOutlined, BankOutlined, UploadOutlined,
  SaveOutlined, PlusOutlined, LoadingOutlined, LockOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useRequest } from '../../hooks/useRequest';
import { useAuth } from '../../hooks/useAuth';
import './index.less';
import { List } from 'antd';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const Profile = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [merchantData, setMerchantData] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [licenseUrl, setLicenseUrl] = useState('');
  const [categories, setCategories] = useState([]);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm] = Form.useForm();
  const [serviceRadiusModalVisible, setServiceRadiusModalVisible] = useState(false);
  const [radiusForm] = Form.useForm();
  const [noMerchantError, setNoMerchantError] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [merchantErrorDetails, setMerchantErrorDetails] = useState(null);

  const { fetchData } = useRequest();
  const { currentUser, refreshUserInfo } = useAuth();

  // 加载商户信息
  useEffect(() => {
    // 添加认证状态检查日志
    console.log("当前认证状态:", localStorage.getItem('merchant_token'));
    console.log("当前用户信息:", currentUser);

    loadMerchantInfo();
  }, [currentUser]);

  // 商户信息加载函数
// loadMerchantInfo 函数完整实现
const loadMerchantInfo = async () => {
  setLoading(true);
  try {
    // 检查用户是否已加载
    if (!currentUser) {
      console.log("用户信息尚未加载完成，稍后重试");
      setTimeout(loadMerchantInfo, 1000); // 延迟重试
      return;
    }
    
    // 检查是否有商户ID
    if (!currentUser.merchant_id) {
      console.error("当前用户不是商户账号", currentUser);
      setNoMerchantError(true);
      setMerchantErrorDetails({
        title: "您的账号未关联商户",
        description: "您需要一个商户账号才能访问此页面"
      });
      setLoading(false);
      return;
    }
    
    console.log(`准备加载商户数据，商户ID: ${currentUser.merchant_id}`);
    
    // 先加载分类列表 - 这个错误不会影响整体流程
    try {
      const catRes = await fetchData({
        url: '/api/v1/merchants/categories/all',
        method: 'GET',
        showError: false // 不显示错误消息
      });
      
      if (catRes) {
        setCategories(catRes);
      }
    } catch (catError) {
      console.warn("加载分类列表失败，继续加载其他数据:", catError);
    }
    
    // 加载商户信息
    try {
      const res = await fetchData({
        url: '/api/v1/merchants/my',
        method: 'GET',
        showError: false // 禁用默认错误消息，我们将自定义处理
      });
      
      if (res) {
        setMerchantData(res);
        setNoMerchantError(false);
        
        // 设置表单值
        form.setFieldsValue({
          name: res.name,
          contact_name: res.contact_name,
          contact_phone: res.contact_phone,
          description: res.description,
          category_ids: res.categories?.map(cat => cat.id) || [],
          business_hours: res.business_hours,
          license_number: res.license_number,
          province: res.province,
          city: res.city,
          district: res.district,
          address: res.address,
          service_radius: res.service_radius,
        });
        
        // 设置图片URL
        if (res.logo) setLogoUrl(res.logo);
        if (res.cover) setCoverUrl(res.cover);
        if (res.license_image) setLicenseUrl(res.license_image);
      }
    } catch (error) {
      console.error('加载商户信息失败:', error);
      
      // 详细记录错误信息以帮助调试
      console.log('错误对象:', error);
      console.log('错误响应状态:', error.response?.status);
      console.log('错误响应数据:', error.response?.data);
      
      // 设置错误状态
      setNoMerchantError(true);
      
      // 安全地获取错误详情
      let errorTitle = "无法加载商户信息";
      let errorDescription = "发生未知错误，请稍后重试";
      
      // 解析错误信息
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 422) {
          // 处理验证错误
          if (typeof data === 'string') {
            errorDescription = data;
          } else if (typeof data === 'object') {
            errorDescription = data.detail || JSON.stringify(data);
          }
          
          // 尝试进一步解析错误信息
          if (errorDescription.includes("未关联商户")) {
            errorTitle = "您的账号未关联商户";
            errorDescription = "您需要先关联商户账号才能访问商户管理功能";
          } else if (errorDescription.includes("不存在")) {
            errorTitle = "关联的商户不存在";
            errorDescription = "您的账号关联了不存在的商户，请联系管理员";
          } else if (errorDescription.includes("审核中")) {
            errorTitle = "商户正在审核中";
            errorDescription = "您的商户信息正在审核，请耐心等待";
          } else if (errorDescription.includes("禁用")) {
            errorTitle = "商户已被禁用";
            errorDescription = "您的商户账号已被禁用，请联系平台管理员";
          }
        } else if (status === 401 || status === 403) {
          errorTitle = "没有访问权限";
          errorDescription = "您没有权限访问商户信息";
        } else {
          // 其他HTTP错误
          errorDescription = typeof data === 'object' 
            ? (data.detail || data.message || JSON.stringify(data)) 
            : (data || `服务器错误 (${status})`);
        }
      } else if (error.request) {
        // 网络错误
        errorTitle = "网络连接失败";
        errorDescription = "无法连接到服务器，请检查网络连接";
      } else {
        // 其他错误
        errorDescription = error.message || "未知错误";
      }
      
      // 安全设置错误信息对象，确保所有属性都是字符串类型
      setMerchantErrorDetails({
        title: String(errorTitle),
        description: String(errorDescription)
      });
      
      // 提供调试建议
      console.log('可能的解决方法:');
      console.log('1. 检查用户商户关联是否正确');
      console.log('2. 确认商户记录存在且状态为1');
      console.log('3. 检查数据库表结构是否与模型匹配');
      console.log('4. 验证静态资源路径是否正确');
    }
  } finally {
    setLoading(false);
  }
  
  // 安全检查，确保错误信息对象正确
  if (merchantErrorDetails && typeof merchantErrorDetails.description !== 'string') {
    setMerchantErrorDetails(prev => ({
      title: String(prev?.title || "错误"),
      description: String(prev?.description || "发生未知错误")
    }));
  }
};

  // 保存商户信息
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaveLoading(true);

      // 构建提交数据
      const submitData = {
        ...values,
        logo: logoUrl,
        cover: coverUrl,
        license_image: licenseUrl
      };

      // 发送请求
      await fetchData({
        url: '/api/v1/merchants/my',
        method: 'PUT',
        data: submitData
      });

      message.success('保存成功');

      // 更新本地数据
      setMerchantData({
        ...merchantData,
        ...submitData
      });
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败: ' + (error.response?.data?.detail || error.message || '未知错误'));
    } finally {
      setSaveLoading(false);
    }
  };

  // 处理图片上传
  const handleUpload = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'images');

    try {
      const res = await fetchData({
        url: '/api/v1/uploads/file',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res?.data?.url) {
        if (type === 'logo') {
          setLogoUrl(res.data.url);
        } else if (type === 'cover') {
          setCoverUrl(res.data.url);
        } else if (type === 'license') {
          setLicenseUrl(res.data.url);
        }
        return res.data.url;
      }
      throw new Error('上传失败');
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败: ' + (error.message || '未知错误'));
      return '';
    }
  };

  // 处理上传按钮
  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  );

  // 处理修改密码
  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();

      if (values.new_password !== values.confirm_password) {
        message.error('两次输入的新密码不一致');
        return;
      }

      await fetchData({
        url: '/api/v1/auth/reset-password',
        method: 'POST',
        data: {
          old_password: values.old_password,
          new_password: values.new_password
        }
      });

      message.success('密码修改成功');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      console.error('修改密码失败:', error);
      message.error('修改密码失败: ' + (error.response?.data?.detail || error.message || '未知错误'));
    }
  };

  // 更新服务半径
  const handleUpdateRadius = async () => {
    try {
      const values = await radiusForm.validateFields();

      await fetchData({
        url: '/api/v1/merchants/my',
        method: 'PUT',
        data: {
          service_radius: values.service_radius,
          latitude: merchantData.latitude,
          longitude: merchantData.longitude
        }
      });

      message.success('服务半径更新成功');

      // 更新表单和本地数据
      form.setFieldsValue({ service_radius: values.service_radius });
      setMerchantData({
        ...merchantData,
        service_radius: values.service_radius
      });

      setServiceRadiusModalVisible(false);
    } catch (error) {
      console.error('更新服务半径失败:', error);
      message.error('更新服务半径失败: ' + (error.response?.data?.detail || error.message || '未知错误'));
    }
  };

  // 处理联系客服
  const handleContactSupport = () => {
    setContactModalVisible(true);
  };

  // 重试加载商户信息
  const handleRetryLoading = () => {
    setNoMerchantError(false);
    loadMerchantInfo();
  };

  // 返回首页
  const goToDashboard = () => {
    navigate('/dashboard');
  };

  // 渲染审核状态
  const renderStatus = () => {
    // 状态: 0-待审核, 1-正常, 2-已禁用
    if (!merchantData) return null;

    const { status } = merchantData;
    const statusMap = {
      0: { title: '待审核', desc: '您的商户信息正在审核中，请耐心等待', color: '#faad14', icon: '🕒' },
      1: { title: '已通过', desc: '您的商户已审核通过', color: '#52c41a', icon: '✅' },
      2: { title: '已禁用', desc: '您的商户已被禁用，请联系平台', color: '#ff4d4f', icon: '❌' }
    };

    const statusInfo = statusMap[status] || statusMap[0];

    return (
      <div className="status-badge" style={{ backgroundColor: statusInfo.color }}>
        <span className="status-icon">{statusInfo.icon}</span>
        <span className="status-text">{statusInfo.title}</span>
      </div>
    );
  };

  // 如果加载中，显示加载状态
  if (loading) {
    return (
      <div className="profile-loading">
        <Spin size="large" />
        <div>加载中...</div>
      </div>
    );
  }

  // 如果有商户错误，显示错误提示
  if (noMerchantError) {
    return (
      <div className="merchant-profile">
        <Card>
          <Result
            status="warning"
            title={merchantErrorDetails?.title || "无法加载商户信息"}
            subTitle={typeof merchantErrorDetails?.description === 'object'
              ? JSON.stringify(merchantErrorDetails.description)
              : (merchantErrorDetails?.description || "您的账号可能未关联有效的商户，或商户信息有误")}
            extra={[
              <Button type="primary" key="dashboard" onClick={goToDashboard}>
                返回首页
              </Button>,
              <Button key="retry" onClick={handleRetryLoading}>
                重试
              </Button>,
              <Button key="contact" onClick={handleContactSupport}>
                联系客服
              </Button>
            ]}
          >
            <div className="merchant-error-details">
              <Alert
                message="可能的原因"
                description={
                  <ul>
                    <li>您的账号未关联商户</li>
                    <li>商户信息审核未通过</li>
                    <li>商户账号已被停用</li>
                    <li>商户数据出现异常</li>
                  </ul>
                }
                type="info"
                showIcon
              />
            </div>
          </Result>
        </Card>

        {/* 联系客服模态框 */}
        <Modal
          title="联系平台客服"
          open={contactModalVisible}
          onCancel={() => setContactModalVisible(false)}
          footer={null}
        >
          <p>如需帮助，请联系平台客服：</p>
          <p><strong>电话：</strong> 400-123-4567</p>
          <p><strong>邮箱：</strong> support@example.com</p>
          <p><strong>工作时间：</strong> 周一至周五 9:00-18:00</p>
        </Modal>
      </div>
    );
  }

  // 定义Tabs的items配置
  const tabItems = [
    {
      key: 'basic',
      label: (
        <span>
          <UserOutlined />
          基本信息
        </span>
      ),
      children: (
        <Card>
          <Form
            form={form}
            layout="vertical"
            scrollToFirstError
          >
            <Title level={5}>商户基本信息</Title>

            <Row gutter={24}>
              <Col xs={24} md={12} lg={8}>
                <Form.Item
                  name="name"
                  label="商户名称"
                  rules={[{ required: true, message: '请输入商户名称' }]}
                >
                  <Input placeholder="请输入商户名称" prefix={<ShopOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Form.Item
                  name="contact_name"
                  label="联系人"
                  rules={[{ required: true, message: '请输入联系人姓名' }]}
                >
                  <Input placeholder="请输入联系人姓名" prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Form.Item
                  name="contact_phone"
                  label="联系电话"
                  rules={[
                    { required: true, message: '请输入联系电话' },
                    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                  ]}
                >
                  <Input placeholder="请输入联系电话" prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} md={12} lg={8}>
                <Form.Item
                  name="category_ids"
                  label="商户分类"
                  rules={[{ required: true, message: '请选择商户分类' }]}
                >
                  <Select
                    placeholder="请选择商户分类"
                    mode="multiple"
                    optionFilterProp="children"
                  >
                    {categories.map(cat => (
                      <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Form.Item
                  name="business_hours"
                  label="营业时间"
                >
                  <Input placeholder="如: 09:00-22:00" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Form.Item
                  name="license_number"
                  label="营业执照号"
                >
                  <Input placeholder="请输入营业执照号" prefix={<BankOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24}>
                <Form.Item
                  name="description"
                  label="商户简介"
                >
                  <TextArea
                    placeholder="请输入商户简介"
                    rows={4}
                    showCount
                    maxLength={500}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>商户图片</Title>

            <Row gutter={24}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="商户Logo"
                  extra="建议尺寸: 200x200像素"
                >
                  <Upload
                    name="logo"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      handleUpload(file, 'logo');
                      return false;
                    }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="商户Logo" style={{ width: '100%' }} />
                    ) : (
                      uploadButton
                    )}
                  </Upload>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="商户封面"
                  extra="建议尺寸: 750x300像素"
                >
                  <Upload
                    name="cover"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      handleUpload(file, 'cover');
                      return false;
                    }}
                  >
                    {coverUrl ? (
                      <img src={coverUrl} alt="商户封面" style={{ width: '100%' }} />
                    ) : (
                      uploadButton
                    )}
                  </Upload>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="营业执照"
                  extra="请上传清晰的营业执照照片"
                >
                  <Upload
                    name="license"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      handleUpload(file, 'license');
                      return false;
                    }}
                  >
                    {licenseUrl ? (
                      <img src={licenseUrl} alt="营业执照" style={{ width: '100%' }} />
                    ) : (
                      uploadButton
                    )}
                  </Upload>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>商户地址与服务范围</Title>

            <Row gutter={24}>
              <Col xs={24} md={24} lg={16}>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="province"
                      label="省份"
                      rules={[{ required: true, message: '请输入省份' }]}
                    >
                      <Input placeholder="省份" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="city"
                      label="城市"
                      rules={[{ required: true, message: '请输入城市' }]}
                    >
                      <Input placeholder="城市" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="district"
                      label="区县"
                      rules={[{ required: true, message: '请输入区县' }]}
                    >
                      <Input placeholder="区县" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="address"
                  label="详细地址"
                  rules={[{ required: true, message: '请输入详细地址' }]}
                >
                  <Input placeholder="详细地址" prefix={<EnvironmentOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={24} lg={8}>
                <Form.Item
                  name="service_radius"
                  label="服务半径(公里)"
                  rules={[{ required: true, message: '请设置服务半径' }]}
                  tooltip="商户可提供服务的最大距离范围"
                >
                  <InputNumber
                    min={0.5}
                    max={50}
                    precision={1}
                    style={{ width: '100%' }}
                    placeholder="请输入服务半径"
                    addonAfter={
                      <Button
                        type="link"
                        size="small"
                        onClick={() => setServiceRadiusModalVisible(true)}
                      >
                        配置
                      </Button>
                    }
                  />
                </Form.Item>
                <div className="radius-note">
                  <Text type="secondary">
                    * 服务半径决定您的商品能被多远范围内的用户看到
                  </Text>
                </div>
              </Col>
            </Row>

            <Form.Item>
              <div className="form-actions">
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saveLoading}
                  onClick={handleSave}
                >
                  保存修改
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Card>
      )
    },
    {
      key: 'security',
      label: (
        <span>
          <LockOutlined />
          安全设置
        </span>
      ),
      children: (
        <Card>
          <div className="security-settings">
            <List
              itemLayout="horizontal"
              dataSource={[
                {
                  title: '账号密码',
                  description: '定期修改密码可以提高账号安全性',
                  action: (
                    <Button
                      type="primary"
                      onClick={() => setPasswordModalVisible(true)}
                    >
                      修改密码
                    </Button>
                  )
                },
                {
                  title: '绑定手机',
                  description: `当前绑定手机: ${merchantData?.contact_phone || '未绑定'}`,
                  action: (
                    <Button>
                      更换手机
                    </Button>
                  )
                },
                {
                  title: '登录设备管理',
                  description: '查看您的账号登录设备',
                  action: (
                    <Button>
                      查看设备
                    </Button>
                  )
                }
              ]}
              renderItem={(item) => (
                <List.Item
                  actions={[item.action]}
                >
                  <List.Item.Meta
                    title={item.title}
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </div>
        </Card>
      )
    }
  ];

  return (
    <div className="merchant-profile">
      <Card className="profile-header">
        <div className="profile-title">
          <div>
            <Title level={4}>商户资料</Title>
            <Text type="secondary">管理您的商户信息和设置</Text>
          </div>
          {renderStatus()}
        </div>
      </Card>

      <div className="profile-content">
        <Tabs defaultActiveKey="basic" items={tabItems} />
      </div>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        onOk={handleChangePassword}
        okText="确认修改"
        cancelText="取消"
      >
        <Form
          form={passwordForm}
          layout="vertical"
        >
          <Form.Item
            name="old_password"
            label="当前密码"
            rules={[
              { required: true, message: '请输入当前密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
              { pattern: /^(?=.*[a-zA-Z])(?=.*\d).+$/, message: '密码必须包含字母和数字' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="确认新密码"
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 服务半径配置弹窗 */}
      <Modal
        title="配置服务半径"
        open={serviceRadiusModalVisible}
        onCancel={() => setServiceRadiusModalVisible(false)}
        onOk={handleUpdateRadius}
        okText="确认修改"
        cancelText="取消"
        width={600}
      >
        <Form
          form={radiusForm}
          layout="vertical"
          initialValues={{
            service_radius: merchantData?.service_radius || 5
          }}
        >
          <div className="radius-info">
            <div className="radius-current">
              <Title level={4}>当前服务范围</Title>
              <div className="radius-value">
                <span className="value">{merchantData?.service_radius || 5}</span>
                <span className="unit">公里</span>
              </div>
              <div className="coverage-area">
                覆盖面积约 {Math.round(Math.PI * Math.pow(merchantData?.service_radius || 5, 2))} 平方公里
              </div>
            </div>

            <Form.Item
              name="service_radius"
              label="设置新的服务半径"
              rules={[
                { required: true, message: '请设置服务半径' }
              ]}
            >
              <InputNumber
                min={0.5}
                max={50}
                precision={1}
                style={{ width: '100%' }}
                placeholder="请输入服务半径"
              />
            </Form.Item>

            <div className="radius-guide">
              <Text type="secondary">
                设置合理的服务半径可以提高配送效率和用户体验:
              </Text>
              <ul>
                <li>餐饮类建议设置3-5公里</li>
                <li>生鲜超市建议设置2-4公里</li>
                <li>商超便利店建议设置1-3公里</li>
                <li>服务类商户可根据实际情况设置</li>
              </ul>
              <Text type="secondary">
                *注意: 服务半径过大可能导致配送时间延长，影响用户体验
              </Text>
            </div>
          </div>
        </Form>
      </Modal>

      {/* 联系客服模态框 */}
      <Modal
        title="联系平台客服"
        open={contactModalVisible}
        onCancel={() => setContactModalVisible(false)}
        footer={null}
      >
        <p>如需帮助，请联系平台客服：</p>
        <p><strong>电话：</strong> 400-123-4567</p>
        <p><strong>邮箱：</strong> support@example.com</p>
        <p><strong>工作时间：</strong> 周一至周五 9:00-18:00</p>
      </Modal>
    </div>
  );
};

export default Profile;