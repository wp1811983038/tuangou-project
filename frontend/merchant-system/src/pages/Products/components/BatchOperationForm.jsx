// src/pages/Products/components/BatchOperationForm.jsx
import React, { useState } from 'react';
import { 
  Form, Input, Button, Select, Switch, Radio, 
  Divider, Typography, Space, Alert
} from 'antd';
import {
  TagsOutlined, AppstoreOutlined, CheckOutlined,
  CloseOutlined, ShoppingOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Title, Text } = Typography;

const BatchOperationForm = ({ categories, selectedCount, onSubmit, onCancel }) => {
  const [form] = Form.useForm();
  const [operationType, setOperationType] = useState('setHot');
  
  // 处理操作类型变更
  const handleOperationTypeChange = (value) => {
    setOperationType(value);
    form.resetFields(['value', 'categoryIds']);
  };
  
  // 处理表单提交
  const handleSubmit = () => {
    form.validateFields().then(values => {
      onSubmit(operationType, values);
    }).catch(info => {
      console.log('验证失败:', info);
    });
  };
  
  // 渲染不同操作类型的表单内容
  const renderFormContent = () => {
    switch (operationType) {
      case 'setHot':
        return (
          <Form.Item
            name="value"
            label="设置热门状态"
            rules={[{ required: true, message: '请选择是否热门' }]}
          >
            <Radio.Group>
              <Radio value={true}>设为热门</Radio>
              <Radio value={false}>取消热门</Radio>
            </Radio.Group>
          </Form.Item>
        );
      case 'setNew':
        return (
          <Form.Item
            name="value"
            label="设置新品状态"
            rules={[{ required: true, message: '请选择是否新品' }]}
          >
            <Radio.Group>
              <Radio value={true}>设为新品</Radio>
              <Radio value={false}>取消新品</Radio>
            </Radio.Group>
          </Form.Item>
        );
      case 'setRecommend':
        return (
          <Form.Item
            name="value"
            label="设置推荐状态"
            rules={[{ required: true, message: '请选择是否推荐' }]}
          >
            <Radio.Group>
              <Radio value={true}>设为推荐</Radio>
              <Radio value={false}>取消推荐</Radio>
            </Radio.Group>
          </Form.Item>
        );
      case 'setCategory':
        return (
          <Form.Item
            name="categoryIds"
            label="选择分类"
            rules={[{ required: true, message: '请选择分类', type: 'array' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择分类"
              style={{ width: '100%' }}
            >
              {categories.map(category => (
                <Option key={category.id} value={category.id}>
                  {category.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="batch-operation-form">
      <Alert 
        message={`已选择 ${selectedCount} 个商品`} 
        type="info" 
        showIcon 
        style={{ marginBottom: 16 }} 
      />
      
      <Form 
        form={form} 
        layout="vertical"
        initialValues={{
          value: true,
          categoryIds: []
        }}
      >
        <Form.Item
          name="operationType"
          label="批量操作类型"
          rules={[{ required: true, message: '请选择操作类型' }]}
        >
          <Select onChange={handleOperationTypeChange} value={operationType}>
            <Option value="setHot">
              <TagsOutlined /> 设置热门标签
            </Option>
            <Option value="setNew">
              <TagsOutlined /> 设置新品标签
            </Option>
            <Option value="setRecommend">
              <TagsOutlined /> 设置推荐标签
            </Option>
            <Option value="setCategory">
              <AppstoreOutlined /> 修改商品分类
            </Option>
            <Option value="onSale">
              <CheckOutlined /> 批量上架
            </Option>
            <Option value="offSale">
              <CloseOutlined /> 批量下架
            </Option>
          </Select>
        </Form.Item>
        
        {renderFormContent()}
        
        <Divider />
        
        <div className="form-actions">
          <Space>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              确认操作
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default BatchOperationForm;