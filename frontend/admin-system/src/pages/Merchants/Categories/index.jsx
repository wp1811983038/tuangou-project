// src/pages/Merchants/Categories/index.jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Space, Modal, Form, Input, Switch, Upload, 
  message, Popconfirm, Tag 
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { 
  fetchMerchantCategories, 
  createMerchantCategory, 
  updateMerchantCategory, 
  deleteMerchantCategory 
} from '@/api/merchant';

const MerchantCategories = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  // 加载分类数据
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetchMerchantCategories();
      setCategories(response);
    } catch (error) {
      message.error('获取分类列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    loadCategories();
  }, []);

  // 打开创建模态框
  const showCreateModal = () => {
    setEditingCategory(null);
    setImageUrl('');
    form.resetFields();
    setModalVisible(true);
  };

  // 打开编辑模态框
  const showEditModal = (category) => {
    setEditingCategory(category);
    setImageUrl(category.icon);
    form.setFieldsValue({
      name: category.name,
      icon: category.icon,
      sort_order: category.sort_order,
      is_active: category.is_active
    });
    setModalVisible(true);
  };

  // 关闭模态框
  const handleCancel = () => {
    setModalVisible(false);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingCategory) {
        // 更新分类
        await updateMerchantCategory(editingCategory.id, values);
        message.success('分类更新成功');
      } else {
        // 创建分类
        await createMerchantCategory(values);
        message.success('分类创建成功');
      }
      
      setModalVisible(false);
      loadCategories();
    } catch (error) {
      message.error('操作失败');
      console.error(error);
    }
  };

  // 删除分类
  const handleDelete = async (categoryId) => {
    try {
      await deleteMerchantCategory(categoryId);
      message.success('分类删除成功');
      loadCategories();
    } catch (error) {
      message.error('删除失败');
      console.error(error);
    }
  };

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
  const customUpload = async ({ file, onSuccess, onError }) => {
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
      setImageUrl(result.url);
      form.setFieldsValue({ icon: result.url });
      onSuccess(result, file);
    } catch (error) {
      console.error('上传错误:', error);
      onError(error);
    } finally {
      setUploadLoading(false);
    }
  };

  // 表格列配置
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '分类图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 100,
      render: (icon) => (
        icon ? (
          <img src={icon} alt="分类图标" style={{ width: 40, height: 40 }} />
        ) : (
          <Tag color="default">无图标</Tag>
        )
      )
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showEditModal(record)}
          />
          <Popconfirm
            title="确定要删除此分类吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card
      title="商户分类管理"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showCreateModal}
        >
          新增分类
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={categories}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      
      {/* 新增/编辑分类模态框 */}
      <Modal
        title={editingCategory ? '编辑分类' : '新增分类'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="分类名称"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 20, message: '分类名称不能超过20个字符' }
            ]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          
          <Form.Item
            name="icon"
            label="分类图标"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList;
            }}
          >
            <Upload
              name="icon"
              listType="picture-card"
              showUploadList={false}
              beforeUpload={beforeUpload}
              customRequest={customUpload}
              maxCount={1}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="icon" style={{ width: '100%' }} />
              ) : (
                <div>
                  {uploadLoading ? <LoadingOutlined /> : <UploadOutlined />}
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          
          <Form.Item
            name="sort_order"
            label="排序号"
            initialValue={0}
            tooltip="数字越小越靠前"
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="is_active"
            label="是否启用"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default MerchantCategories;