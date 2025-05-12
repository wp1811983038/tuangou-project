// src/pages/Merchants/components/MerchantForm.jsx
import React, { useState, useEffect } from 'react';
import { 
  Form, Input, Select, InputNumber, Upload, Button, Space, Row, Col, 
  Card, Divider, message 
} from 'antd';
import { UploadOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { fetchMerchantCategories } from '@/api/merchant';

const { Option } = Select;
const { TextArea } = Input;

const MerchantForm = ({ initialValues, onFinish, loading }) => {
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [logoUrl, setLogoUrl] = useState(initialValues?.logo || '');
  const [coverUrl, setCoverUrl] = useState(initialValues?.cover || '');
  const [licenseUrl, setLicenseUrl] = useState(initialValues?.license_image || '');
  const [uploadLoading, setUploadLoading] = useState(false);

  // 加载商户分类
  const loadCategories = async () => {
    try {
      const response = await fetchMerchantCategories();
      setCategories(response);
    } catch (error) {
      message.error('获取商户分类失败');
      console.error(error);
    }
  };

  // 初始加载
  useEffect(() => {
    loadCategories();
    
    // 如果有初始值，设置表单的初始值
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        category_ids: initialValues.categories?.map(cat => cat.id) || []
      });
    }
  }, [initialValues, form]);

  // 图片上传前验证
  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('只能上传JPG/PNG格式的图片!');
    }
    
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过2MB!');
    }
    
    return isJpgOrPng && isLt2M;
  };

  // 自定义上传函数
  const customUpload = async ({ file, onSuccess, onError, filename }) => {
    setUploadLoading(true);
    
    // 创建FormData对象
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // 调用上传API（需要后端支持）
      const response = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('上传失败');
      }
      
      const result = await response.json();
      
      // 根据字段名设置不同的URL
      if (filename === 'logo') {
        setLogoUrl(result.url);
        form.setFieldsValue({ logo: result.url });
      } else if (filename === 'cover') {
        setCoverUrl(result.url);
        form.setFieldsValue({ cover: result.url });
      } else if (filename === 'license_image') {
        setLicenseUrl(result.url);
        form.setFieldsValue({ license_image: result.url });
      }
      
      onSuccess(result, file);
    } catch (error) {
      console.error('上传错误:', error);
      onError(error);
    } finally {
      setUploadLoading(false);
    }
  };

  // 上传按钮组件
  const uploadButton = (
    <div>
      {uploadLoading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={initialValues || {
        status: 1,
        commission_rate: 0.05,
        rating: 5.0
      }}
    >
      <Row gutter={24}>
        <Col span={16}>
          <Card title="基本信息">
            <Form.Item
              name="name"
              label="商户名称"
              rules={[
                { required: true, message: '请输入商户名称' },
                { max: 50, message: '商户名称不能超过50个字符' }
              ]}
            >
              <Input placeholder="请输入商户名称" />
            </Form.Item>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="contact_name"
                  label="联系人"
                  rules={[{ required: true, message: '请输入联系人姓名' }]}
                >
                  <Input placeholder="请输入联系人姓名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="contact_phone"
                  label="联系电话"
                  rules={[
                    { required: true, message: '请输入联系电话' },
                    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
                  ]}
                >
                  <Input placeholder="请输入联系电话" />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item
              name="business_hours"
              label="营业时间"
            >
              <Input placeholder="例如：09:00-22:00" />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="商户描述"
            >
              <TextArea 
                rows={4} 
                placeholder="请输入商户描述信息" 
                maxLength={500} 
                showCount 
              />
            </Form.Item>
            
            <Form.Item
              name="category_ids"
              label="经营分类"
              rules={[{ required: true, message: '请选择至少一个经营分类' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择经营分类"
                style={{ width: '100%' }}
              >
                {categories.map(category => (
                  <Option key={category.id} value={category.id}>
                    {category.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Card>
          
          <Card title="地址信息" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="province"
                  label="省份"
                  rules={[{ required: true, message: '请输入省份' }]}
                >
                  <Input placeholder="省份" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="city"
                  label="城市"
                  rules={[{ required: true, message: '请输入城市' }]}
                >
                  <Input placeholder="城市" />
                </Form.Item>
              </Col>
              <Col span={8}>
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
              <Input placeholder="请输入详细地址" />
            </Form.Item>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="latitude"
                  label="纬度"
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    placeholder="纬度" 
                    precision={6} 
                    min={-90} 
                    max={90} 
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="longitude"
                  label="经度"
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    placeholder="经度" 
                    precision={6} 
                    min={-180} 
                    max={180} 
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
          
          <Card title="资质信息" style={{ marginTop: 16 }}>
            <Form.Item
              name="license_number"
              label="营业执照号"
            >
              <Input placeholder="请输入营业执照号码" />
            </Form.Item>
            
            <Form.Item
              name="license_image"
              label="营业执照图片"
              valuePropName="fileList"
              getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                  return e;
                }
                return e?.fileList;
              }}
            >
              <Upload
                name="license_image"
                listType="picture-card"
                showUploadList={false}
                beforeUpload={beforeUpload}
                customRequest={({ file, onSuccess, onError }) => 
                  customUpload({ file, onSuccess, onError, filename: 'license_image' })
                }
              >
                {licenseUrl ? (
                  <img src={licenseUrl} alt="营业执照" style={{ width: '100%' }} />
                ) : (
                  uploadButton
                )}
              </Upload>
            </Form.Item>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="商户图片">
            <Form.Item
              name="logo"
              label="商户Logo"
              tooltip="建议上传正方形图片，尺寸至少200x200像素"
              valuePropName="fileList"
              getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                  return e;
                }
                return e?.fileList;
              }}
            >
              <Upload
                name="logo"
                listType="picture-card"
                showUploadList={false}
                beforeUpload={beforeUpload}
                customRequest={({ file, onSuccess, onError }) => 
                  customUpload({ file, onSuccess, onError, filename: 'logo' })
                }
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="logo" style={{ width: '100%' }} />
                ) : (
                  uploadButton
                )}
              </Upload>
            </Form.Item>
            
            <Form.Item
              name="cover"
              label="封面图"
              tooltip="建议上传宽高比为16:9的图片"
              valuePropName="fileList"
              getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                  return e;
                }
                return e?.fileList;
              }}
            >
              <Upload
                name="cover"
                listType="picture-card"
                showUploadList={false}
                beforeUpload={beforeUpload}
                customRequest={({ file, onSuccess, onError }) => 
                  customUpload({ file, onSuccess, onError, filename: 'cover' })
                }
              >
                {coverUrl ? (
                  <img src={coverUrl} alt="cover" style={{ width: '100%' }} />
                ) : (
                  uploadButton
                )}
              </Upload>
            </Form.Item>
          </Card>
          
          <Card title="商户状态" style={{ marginTop: 16 }}>
            <Form.Item
              name="status"
              label="状态"
            >
              <Select>
                <Option value={0}>待审核</Option>
                <Option value={1}>正常</Option>
                <Option value={2}>已禁用</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="commission_rate"
              label="佣金率"
              tooltip="商户佣金率，0-1之间的小数"
              rules={[
                { required: true, message: '请输入佣金率' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={1}
                precision={2}
                step={0.01}
                formatter={value => `${(value * 100).toFixed(0)}%`}
                parser={value => value.replace('%', '') / 100}
              />
            </Form.Item>
            
            <Form.Item
              name="rating"
              label="商户评分"
              tooltip="商户默认评分，1-5之间"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={5}
                precision={1}
                step={0.1}
              />
            </Form.Item>
          </Card>
        </Col>
      </Row>
      
      <Divider />
      
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存
          </Button>
          <Button onClick={() => window.history.back()}>
            取消
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default MerchantForm;