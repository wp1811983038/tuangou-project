// src/pages/Groups/components/GroupForm.jsx
import React, { useState, useEffect } from 'react';
import { 
  Modal, Form, Input, InputNumber, Select, Upload, 
  Button, DatePicker, Space, Typography, Row, Col, message
} from 'antd';
import { PlusOutlined, InboxOutlined } from '@ant-design/icons';
import { useRequest } from '../../../hooks/useRequest';
import moment from 'moment';
import './GroupForm.less';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;
const { RangePicker } = DatePicker;

const normFile = (e) => {
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

const GroupForm = ({ 
  visible, 
  onCancel, 
  onSubmit, 
  initialValues = null,
  products = [] 
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  
  const { fetchData } = useRequest();
  
  // 初始化表单数据
  useEffect(() => {
    if (initialValues) {
      // 设置团购基础信息
      form.setFieldsValue({
        product_id: initialValues.product_id,
        title: initialValues.title,
        price: initialValues.price,
        min_participants: initialValues.min_participants,
        max_participants: initialValues.max_participants,
        description: initialValues.description,
        is_featured: initialValues.is_featured,
        date_range: [
          moment(initialValues.start_time),
          moment(initialValues.end_time)
        ]
      });
      
      // 设置封面图
      if (initialValues.cover_image) {
        setCoverImageUrl(initialValues.cover_image);
      }
      
      // 设置选中的商品
      setSelectedProduct(initialValues.product);
    }
  }, [form, initialValues]);
  
  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      // 计算团购持续天数
      const dateRange = values.date_range;
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      const durationDays = endDate.diff(startDate, 'days') + 1;
      
      // 格式化提交数据
      const formData = {
        product_id: values.product_id,
        title: values.title,
        cover_image: coverImageUrl || selectedProduct?.thumbnail,
        price: values.price,
        min_participants: values.min_participants,
        max_participants: values.max_participants,
        description: values.description,
        is_featured: values.is_featured,
        duration_days: durationDays
      };
      
      // 如果是编辑，需要添加特定字段
      if (initialValues) {
        formData.end_time = endDate.format();
      }
      
      await onSubmit(formData);
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // 处理选择商品
  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product);
    
    if (product) {
      // 自动填充团购价格
      if (product.group_price) {
        form.setFieldsValue({ price: product.group_price });
      } else {
        // 如果没有团购价，默认使用现价的9折
        const discountPrice = Math.floor(product.current_price * 0.9 * 100) / 100;
        form.setFieldsValue({ price: discountPrice });
      }
      
      // 自动填充团购标题
      if (!form.getFieldValue('title')) {
        form.setFieldsValue({ title: `${product.name}限时团购` });
      }
      
      // 如果没有自定义封面图，使用商品缩略图
      if (!coverImageUrl) {
        setCoverImageUrl(product.thumbnail);
      }
    }
  };
  
  // 处理封面图上传
  const handleCoverUpload = async (options) => {
    const { file, onSuccess, onError } = options;
    
    // 创建FormData对象
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
        setCoverImageUrl(res.data.url);
        onSuccess(res, file);
      } else {
        onError(new Error('上传失败'));
      }
    } catch (error) {
      console.error('上传失败:', error);
      onError(error);
    }
  };
  
  // 表单初始值
  const getInitialValues = () => {
    if (initialValues) {
      return {};
    }
    
    return {
      min_participants: 2,
      is_featured: false,
      date_range: [moment(), moment().add(7, 'days')]
    };
  };
  
  // 禁用过去的日期
  const disabledDate = (current) => {
    return current && current < moment().startOf('day');
  };
  
  return (
    <Modal
      title={initialValues ? '编辑团购' : '发起团购'}
      open={visible}
      width={800}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          取消
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={submitting} 
          onClick={handleSubmit}
        >
          {initialValues ? '保存' : '发起团购'}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={getInitialValues()}
      >
        <Title level={5}>基本信息</Title>
        
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="product_id"
              label="选择商品"
              rules={[{ required: true, message: '请选择商品' }]}
            >
              <Select
                placeholder="请选择商品"
                onChange={handleProductChange}
                showSearch
                optionFilterProp="children"
                disabled={!!initialValues}
              >
                {products.map(product => (
                  <Option key={product.id} value={product.id}>
                    {product.name} - ¥{product.current_price.toFixed(2)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="title"
              label="团购标题"
              rules={[{ required: true, message: '请输入团购标题' }]}
            >
              <Input placeholder="请输入团购标题" maxLength={100} />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col sm={24} md={12}>
            <Form.Item
              name="price"
              label="团购价格(元)"
              rules={[
                { required: true, message: '请输入团购价格' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || !selectedProduct) {
                      return Promise.resolve();
                    }
                    if (value >= selectedProduct.current_price) {
                      return Promise.reject(new Error('团购价应低于商品现价'));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber
                min={0.01}
                precision={2}
                step={0.1}
                style={{ width: '100%' }}
                placeholder="请输入团购价格"
                disabled={!selectedProduct}
              />
            </Form.Item>
          </Col>
          <Col sm={24} md={12}>
            <Form.Item
              name="date_range"
              label="团购时间"
              rules={[{ required: true, message: '请选择团购时间范围' }]}
            >
              <RangePicker 
                style={{ width: '100%' }}
                disabledDate={disabledDate}
                disabled={!!initialValues}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col sm={24} md={12}>
            <Form.Item
              name="min_participants"
              label="最小成团人数"
              rules={[
                { required: true, message: '请输入最小成团人数' },
                { type: 'number', min: 2, message: '最小成团人数不能少于2人' }
              ]}
            >
              <InputNumber
                min={2}
                step={1}
                style={{ width: '100%' }}
                placeholder="请输入最小成团人数"
              />
            </Form.Item>
          </Col>
          <Col sm={24} md={12}>
            <Form.Item
              name="max_participants"
              label="最大参与人数"
              extra="不填则不限制人数"
              rules={[
                { type: 'number', min: 2, message: '最大参与人数不能少于2人' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || !getFieldValue('min_participants')) {
                      return Promise.resolve();
                    }
                    if (value < getFieldValue('min_participants')) {
                      return Promise.reject(new Error('最大人数不能小于最小成团人数'));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber
                min={2}
                step={1}
                style={{ width: '100%' }}
                placeholder="请输入最大参与人数"
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col sm={24} md={initialValues ? 24 : 12}>
            <Form.Item
              name="is_featured"
              label="是否推荐"
              valuePropName="checked"
            >
              <Select>
                <Option value={true}>是 - 在首页推荐位展示</Option>
                <Option value={false}>否 - 不在推荐位展示</Option>
              </Select>
            </Form.Item>
          </Col>
          {!initialValues && (
            <Col sm={24} md={12}>
              <Form.Item
                label="团购封面图"
                extra="不上传则使用商品图片"
              >
                <Upload
                  name="file"
                  listType="picture-card"
                  className="cover-uploader"
                  showUploadList={false}
                  customRequest={handleCoverUpload}
                  beforeUpload={(file) => {
                    const isImage = file.type.startsWith('image/');
                    const isLt2M = file.size / 1024 / 1024 < 2;
                    
                    if (!isImage) {
                      message.error('只能上传图片文件!');
                      return false;
                    }
                    
                    if (!isLt2M) {
                      message.error('图片不能超过2MB!');
                      return false;
                    }
                    
                    return isImage && isLt2M;
                  }}
                >
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt="封面图" style={{ width: '100%' }} />
                  ) : (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>上传</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
            </Col>
          )}
        </Row>
        
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="description"
              label="团购描述"
            >
              <TextArea 
                rows={4} 
                placeholder="请输入团购活动描述" 
                maxLength={500} 
                showCount
              />
            </Form.Item>
          </Col>
        </Row>
        
        {/* 团购规则说明 */}
        <div className="group-rules">
          <Title level={5}>团购规则说明</Title>
          <ul>
            <li>团购需要在指定时间内达到最小成团人数才能成功</li>
            <li>成团成功后，系统将自动通知所有参与者支付订单</li>
            <li>团购失败后，不会生成订单，系统会自动通知参与者</li>
            <li>团购一旦发起，不可更改商品和起止时间</li>
            <li>团购进行中可修改标题、描述、封面图等信息</li>
          </ul>
        </div>
      </Form>
    </Modal>
  );
};

export default GroupForm;