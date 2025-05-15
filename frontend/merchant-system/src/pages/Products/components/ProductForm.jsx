// src/pages/Products/components/ProductForm.jsx
import React, { useState, useEffect } from 'react';
import { 
  Modal, Form, Input, InputNumber, Select, Upload, Button, 
  Switch, Divider, Space, Tag, Typography, Row, Col, message
} from 'antd';
import { 
  PlusOutlined, InboxOutlined, MinusCircleOutlined,
  CloseOutlined, UploadOutlined
} from '@ant-design/icons';
import { useRequest } from '../../../hooks/useRequest';
import './ProductForm.less';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const normFile = (e) => {
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

const ProductForm = ({ 
  visible, 
  onCancel, 
  onSubmit, 
  initialValues = null,
  categories = [] 
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { fetchData } = useRequest();
  
  // 初始化表单数据
  useEffect(() => {
    if (initialValues) {
      // 设置商品基础信息
      form.setFieldsValue({
        name: initialValues.name,
        category_ids: initialValues.categories?.map(cat => cat.id) || [],
        original_price: initialValues.original_price,
        current_price: initialValues.current_price,
        stock: initialValues.stock,
        unit: initialValues.unit || '件',
        description: initialValues.description,
        status: initialValues.status === 1,
        is_hot: initialValues.is_hot,
        is_new: initialValues.is_new,
        is_recommend: initialValues.is_recommend,
      });
      
      // 设置商品缩略图
      if (initialValues.thumbnail) {
        setThumbnailUrl(initialValues.thumbnail);
      }
      
      // 设置商品规格
      if (initialValues.specifications && initialValues.specifications.length > 0) {
        form.setFieldsValue({
          specifications: initialValues.specifications.map(spec => ({
            name: spec.name,
            value: spec.value,
            price_adjustment: spec.price_adjustment,
            stock: spec.stock,
          }))
        });
      }
      
      // 设置商品图片
      if (initialValues.images && initialValues.images.length > 0) {
        const images = initialValues.images.map((img, index) => ({
          uid: img.id || `-${index}`,
          name: `图片${index + 1}`,
          status: 'done',
          url: img.image_url,
          thumbUrl: img.image_url,
          response: { data: { url: img.image_url } },
        }));
        setFileList(images);
        form.setFieldsValue({ images });
      }
    }
  }, [form, initialValues]);
  
  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      // 格式化提交数据
      const formData = {
        ...values,
        status: values.status ? 1 : 0,
        thumbnail: thumbnailUrl,
        images: fileList.map((file, index) => ({
          image_url: file.response?.data?.url || file.url,
          sort_order: index
        })),
        specifications: values.specifications || []
      };
      
      await onSubmit(formData);
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // 处理缩略图上传
  const handleThumbnailUpload = async (options) => {
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
        setThumbnailUrl(res.data.url);
        onSuccess(res, file);
      } else {
        onError(new Error('上传失败'));
      }
    } catch (error) {
      console.error('上传失败:', error);
      onError(error);
    }
  };
  
  // 处理商品图片上传
  const handleImagesUpload = async (options) => {
    const { file, onSuccess, onError } = options;
    
    // 创建FormData对象
    const formData = new FormData();
    formData.append('files', file);
    formData.append('folder', 'images');
    
    try {
      const res = await fetchData({
        url: '/api/v1/uploads/images',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (res?.data?.files && res.data.files.length > 0) {
        onSuccess({ data: { url: res.data.files[0].url } }, file);
      } else {
        onError(new Error('上传失败'));
      }
    } catch (error) {
      console.error('上传失败:', error);
      onError(error);
    }
  };
  
  return (
    <Modal
      title={initialValues ? '编辑商品' : '新增商品'}
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
          保存
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          unit: '件',
          status: true,
          is_hot: false,
          is_new: true,
          is_recommend: false,
          specifications: [],
        }}
      >
        <Title level={5}>基本信息</Title>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="name"
              label="商品名称"
              rules={[{ required: true, message: '请输入商品名称' }]}
            >
              <Input placeholder="请输入商品名称" maxLength={100} />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col sm={24} md={12}>
            <Form.Item
              name="category_ids"
              label="商品分类"
              rules={[{ required: true, message: '请选择商品分类' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择商品分类"
                style={{ width: '100%' }}
              >
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col sm={24} md={12}>
            <Form.Item
              name="unit"
              label="计量单位"
              rules={[{ required: true, message: '请输入计量单位' }]}
            >
              <Input placeholder="如: 件、个、箱" />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col sm={24} md={8}>
            <Form.Item
              name="original_price"
              label="原价(元)"
              rules={[{ required: true, message: '请输入原价' }]}
            >
              <InputNumber
                min={0}
                precision={2}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="请输入原价"
              />
            </Form.Item>
          </Col>
          <Col sm={24} md={8}>
            <Form.Item
              name="current_price"
              label="现价(元)"
              rules={[
                { required: true, message: '请输入现价' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('original_price') >= value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('现价不能大于原价'));
                  },
                }),
              ]}
            >
              <InputNumber
                min={0}
                precision={2}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="请输入现价"
              />
            </Form.Item>
          </Col>
          <Col sm={24} md={8}>
            <Form.Item
              name="stock"
              label="库存"
              rules={[{ required: true, message: '请输入库存' }]}
            >
              <InputNumber
                min={0}
                precision={0}
                style={{ width: '100%' }}
                placeholder="请输入库存"
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col sm={24} md={6}>
            <Form.Item
              name="status"
              label="商品状态"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="上架" 
                unCheckedChildren="下架" 
              />
            </Form.Item>
          </Col>
          <Col sm={24} md={6}>
            <Form.Item
              name="is_hot"
              label="热门商品"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col sm={24} md={6}>
            <Form.Item
              name="is_new"
              label="新品"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col sm={24} md={6}>
            <Form.Item
              name="is_recommend"
              label="推荐商品"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="description"
              label="商品简介"
            >
              <TextArea 
                rows={4} 
                placeholder="请输入商品简介" 
                maxLength={500} 
                showCount
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Divider />
        <Title level={5}>商品图片</Title>
        
        <Row gutter={16}>
          <Col sm={24} md={10}>
            <Form.Item
              label="商品缩略图"
              name="thumbnail"
              valuePropName="fileList"
              getValueFromEvent={normFile}
              rules={[{ required: true, message: '请上传商品缩略图' }]}
              extra="建议尺寸: 400x400像素，图片不超过2MB"
            >
              <Upload
                name="file"
                listType="picture-card"
                className="thumbnail-uploader"
                showUploadList={false}
                customRequest={handleThumbnailUpload}
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
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="缩略图" style={{ width: '100%' }} />
                ) : (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>上传</div>
                  </div>
                )}
              </Upload>
            </Form.Item>
          </Col>
          <Col sm={24} md={14}>
            <Form.Item
              label="商品图片集"
              name="images"
              valuePropName="fileList"
              getValueFromEvent={normFile}
              extra="最多上传5张商品图片，单张图片不超过2MB"
            >
              <Upload
                name="files"
                listType="picture-card"
                className="product-images-uploader"
                fileList={fileList}
                customRequest={handleImagesUpload}
                onChange={({ fileList }) => setFileList(fileList)}
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
                  
                  if (fileList.length >= 5) {
                    message.error('最多上传5张图片!');
                    return false;
                  }
                  
                  return isImage && isLt2M;
                }}
              >
                {fileList.length >= 5 ? null : (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>上传</div>
                  </div>
                )}
              </Upload>
            </Form.Item>
          </Col>
        </Row>
        
        <Divider />
        <Title level={5}>商品规格</Title>
        
        <Form.List name="specifications">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Row gutter={16} key={key} className="spec-item">
                  <Col sm={24} md={6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      rules={[{ required: true, message: '规格名称不能为空' }]}
                    >
                      <Input placeholder="规格名称，如颜色、尺寸" />
                    </Form.Item>
                  </Col>
                  <Col sm={24} md={6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'value']}
                      rules={[{ required: true, message: '规格值不能为空' }]}
                    >
                      <Input placeholder="规格值，如红色、L码" />
                    </Form.Item>
                  </Col>
                  <Col sm={24} md={5}>
                    <Form.Item
                      {...restField}
                      name={[name, 'price_adjustment']}
                      initialValue={0}
                    >
                      <InputNumber 
                        placeholder="加价" 
                        min={-9999} 
                        max={9999}
                        precision={2}
                        style={{ width: '100%' }}
                        prefix="加价:"
                      />
                    </Form.Item>
                  </Col>
                  <Col sm={24} md={5}>
                    <Form.Item
                      {...restField}
                      name={[name, 'stock']}
                      initialValue={0}
                    >
                      <InputNumber 
                        placeholder="库存" 
                        min={0}
                        style={{ width: '100%' }}
                        prefix="库存:"
                      />
                    </Form.Item>
                  </Col>
                  <Col sm={24} md={2} className="delete-spec-btn">
                    <MinusCircleOutlined 
                      className="dynamic-delete-button" 
                      onClick={() => remove(name)} 
                    />
                  </Col>
                </Row>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  添加规格
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
        
        <Divider />
        <Title level={5}>商品详情</Title>
        
        <Form.Item
          name="detail"
          label="商品详情"
        >
          <TextArea 
            rows={8} 
            placeholder="请输入商品详情，支持简单的HTML标签" 
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProductForm;