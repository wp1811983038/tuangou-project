// src/pages/Products/components/ProductForm.jsx
import React, { useState, useEffect } from 'react';
import { 
  Form, Input, InputNumber, Select, Upload, Button, 
  Switch, Divider, Space, Typography, Row, Col, message,
  Tabs, Card, Tag, Tooltip, Radio, Alert, Spin
} from 'antd';
import { 
  PlusOutlined, MinusCircleOutlined, UploadOutlined, 
  InfoCircleOutlined, AppstoreOutlined, DollarOutlined,
  TagsOutlined, PictureOutlined, SettingOutlined,
  EyeOutlined, FileTextOutlined
} from '@ant-design/icons';
import { useRequest } from '../../../hooks/useRequest';
import { formatPrice } from '../../../utils/format';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const normFile = (e) => {
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

const ProductForm = ({ initialValues, categories = [], onSubmit, onCancel }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [isCreateMode, setIsCreateMode] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [specListChanged, setSpecListChanged] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  
  const { fetchData } = useRequest();
  
  // 初始化表单数据
  useEffect(() => {
    if (initialValues) {
      setIsCreateMode(false);
      
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
        group_price: initialValues.group_price,
        min_purchase: initialValues.min_purchase || 1,
        max_purchase: initialValues.max_purchase,
        shipping_fee: initialValues.shipping_fee || 0,
        detail: initialValues.detail,
      });
      
      // 设置当前价格和原价，用于计算折扣
      setCurrentPrice(initialValues.current_price);
      setOriginalPrice(initialValues.original_price);
      
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
    } else {
      // 新建商品时的默认值
      form.setFieldsValue({
        unit: '件',
        status: true,
        is_hot: false,
        is_new: true,
        is_recommend: false,
        specifications: [],
        min_purchase: 1,
        shipping_fee: 0
      });
    }
  }, [form, initialValues]);
  
  // 当价格变更时，更新状态
  useEffect(() => {
    const currentPrice = form.getFieldValue('current_price');
    const originalPrice = form.getFieldValue('original_price');
    
    if (currentPrice !== undefined) {
      setCurrentPrice(currentPrice);
    }
    
    if (originalPrice !== undefined) {
      setOriginalPrice(originalPrice);
    }
  }, [form]);
  
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
      message.error('表单验证失败，请检查输入');
    } finally {
      setSubmitting(false);
    }
  };
  
  // 处理缩略图上传
  const handleThumbnailUpload = async (options) => {
    const { file, onSuccess, onError } = options;
    
    // 验证文件类型和大小
    const isImage = file.type.startsWith('image/');
    const isLt2M = file.size / 1024 / 1024 < 2;
    
    if (!isImage) {
      message.error('只能上传图片文件!');
      onError(new Error('只能上传图片文件!'));
      return;
    }
    
    if (!isLt2M) {
      message.error('图片不能超过2MB!');
      onError(new Error('图片不能超过2MB!'));
      return;
    }
    
    // 创建FormData对象
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'products');
    
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
    
    // 验证文件类型和大小
    const isImage = file.type.startsWith('image/');
    const isLt2M = file.size / 1024 / 1024 < 2;
    
    if (!isImage) {
      message.error('只能上传图片文件!');
      onError(new Error('只能上传图片文件!'));
      return;
    }
    
    if (!isLt2M) {
      message.error('图片不能超过2MB!');
      onError(new Error('图片不能超过2MB!'));
      return;
    }
    
    // 创建FormData对象
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'products');
    
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
        onSuccess({ data: { url: res.data.url } }, file);
      } else {
        onError(new Error('上传失败'));
      }
    } catch (error) {
      console.error('上传失败:', error);
      onError(error);
    }
  };
  
  // 处理图片预览
  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await new Promise(resolve => {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj);
        reader.onload = () => resolve(reader.result);
      });
    }
    
    setPreviewImage(file.url || file.preview);
    setPreviewVisible(true);
    setPreviewTitle(file.name || file.url.substring(file.url.lastIndexOf('/') + 1));
  };
  
  // 处理图片列表变化
  const handleImageChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };
  
  // 上传按钮
  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  );
  
  // 计算折扣率
  const calculateDiscount = () => {
    if (originalPrice && currentPrice && originalPrice > currentPrice) {
      const discount = (currentPrice / originalPrice * 10).toFixed(1);
      return `${discount}折`;
    }
    return null;
  };
  
  // 处理自动设置团购价
  const handleSetGroupPrice = () => {
    const currentPrice = form.getFieldValue('current_price');
    if (currentPrice) {
      // 默认团购价为现价的9折
      const groupPrice = Math.floor(currentPrice * 0.9 * 100) / 100;
      form.setFieldsValue({ group_price: groupPrice });
    }
  };
  
  return (
    <div className="product-form">
      <Alert
        message={isCreateMode ? "创建新商品" : "编辑商品信息"}
        description={isCreateMode ? "请填写商品基本信息，带*号的为必填项" : "您可以修改商品信息，商品ID和创建时间不可修改"}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <AppstoreOutlined />
              基本信息
            </span>
          }
          key="basic"
        >
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            scrollToFirstError
          >
            <Card title="基本信息" className="form-card">
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="name"
                    label="商品名称"
                    rules={[
                      { required: true, message: '请输入商品名称' },
                      { max: 100, message: '商品名称不能超过100个字符' }
                    ]}
                  >
                    <Input placeholder="请输入商品名称" maxLength={100} showCount />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="category_ids"
                    label="商品分类"
                    rules={[
                      { required: true, message: '请选择商品分类', type: 'array' }
                    ]}
                  >
                    <Select
                      mode="multiple"
                      placeholder="请选择商品分类"
                      style={{ width: '100%' }}
                      showSearch
                      optionFilterProp="children"
                    >
                      {categories.map(cat => (
                        <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="unit"
                    label="计量单位"
                    rules={[{ required: true, message: '请输入计量单位' }]}
                    tooltip="商品的计量单位，如：件、个、箱、kg等"
                  >
                    <Input placeholder="如: 件、个、箱、kg" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col xs={24} md={8}>
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
                      onChange={(value) => setOriginalPrice(value)}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="current_price"
                    label={
                      <span>
                        现价(元) 
                        {calculateDiscount() && (
                          <Tag color="red" style={{ marginLeft: 8 }}>
                            {calculateDiscount()}
                          </Tag>
                        )}
                      </span>
                    }
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
                      onChange={(value) => setCurrentPrice(value)}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
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
                <Col xs={24} md={8}>
                  <Form.Item
                    name="group_price"
                    label={
                      <span>
                        团购价(元)
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={handleSetGroupPrice}
                          style={{ padding: '0 4px' }}
                        >
                          自动设置
                        </Button>
                      </span>
                    }
                    tooltip="团购活动时的价格，可以低于现价"
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      step={0.01}
                      style={{ width: '100%' }}
                      placeholder="不填则使用现价"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="min_purchase"
                    label="最小购买数量"
                    tooltip="单次下单最少购买数量"
                  >
                    <InputNumber
                      min={1}
                      precision={0}
                      style={{ width: '100%' }}
                      placeholder="默认为1"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="max_purchase"
                    label="最大购买数量"
                    tooltip="单次下单最大购买数量，不填则不限制"
                  >
                    <InputNumber
                      min={1}
                      precision={0}
                      style={{ width: '100%' }}
                      placeholder="不填则不限制"
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item
                    name="description"
                    label="商品简介"
                    tooltip="简要描述商品特点，将显示在商品列表页"
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
            </Card>
            
            <Card title="商品设置" className="form-card" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={6}>
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
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    name="is_hot"
                    label="热门商品"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    name="is_new"
                    label="新品"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    name="is_recommend"
                    label="推荐商品"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
              
              <Divider orientation="left">高级设置</Divider>
              
              <Button
                type="link"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                style={{ marginBottom: 16 }}
              >
                {showAdvancedOptions ? '收起高级设置' : '显示高级设置'} 
                <SettingOutlined />
              </Button>
              
              {showAdvancedOptions && (
                <Row gutter={16}>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item
                      name="shipping_fee"
                      label="运费(元)"
                      tooltip="单独购买此商品的配送费，0表示免运费"
                    >
                      <InputNumber
                        min={0}
                        precision={2}
                        step={0.5}
                        style={{ width: '100%' }}
                        placeholder="0表示免运费"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item
                      name="weight"
                      label="商品重量(kg)"
                      tooltip="商品重量，用于计算运费"
                    >
                      <InputNumber
                        min={0}
                        precision={3}
                        step={0.1}
                        style={{ width: '100%' }}
                        placeholder="可不填"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item
                      name="volume"
                      label="商品体积(m³)"
                      tooltip="商品体积，用于计算运费"
                    >
                      <InputNumber
                        min={0}
                        precision={3}
                        step={0.001}
                        style={{ width: '100%' }}
                        placeholder="可不填"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </Card>
          </Form>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <PictureOutlined />
              图片管理
            </span>
          }
          key="images"
        >
          <Card title="商品图片">
            <Row gutter={16}>
              <Col xs={24} md={10}>
                <Form.Item
                  label="商品缩略图"
                  extra="建议尺寸: 400x400像素，图片不超过2MB"
                  tooltip="商品主图，将显示在列表页面"
                  rules={[{ required: true, message: '请上传商品缩略图' }]}
                >
                  <Upload
                    name="file"
                    listType="picture-card"
                    className="thumbnail-uploader"
                    showUploadList={false}
                    customRequest={handleThumbnailUpload}
                  >
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt="缩略图" style={{ width: '100%' }} />
                    ) : (
                      uploadButton
                    )}
                  </Upload>
                </Form.Item>
              </Col>
              <Col xs={24} md={14}>
                <Form.Item
                  label="商品图片集"
                  name="images"
                  valuePropName="fileList"
                  getValueFromEvent={normFile}
                  extra="最多上传9张商品图片，单张图片不超过2MB"
                  tooltip="商品详情页展示的图片集"
                >
                  <Upload
                    name="file"
                    listType="picture-card"
                    fileList={fileList}
                    customRequest={handleImagesUpload}
                    onPreview={handlePreview}
                    onChange={handleImageChange}
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
                      
                      if (fileList.length >= 9) {
                        message.error('最多上传9张图片!');
                        return false;
                      }
                      
                      return true;
                    }}
                  >
                    {fileList.length >= 9 ? null : uploadButton}
                  </Upload>
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <TagsOutlined />
              规格管理
            </span>
          }
          key="specs"
        >
          <Card title="商品规格" extra={specListChanged && <Tag color="warning">规格已修改</Tag>}>
            <Alert
              message="规格说明"
              description="添加商品规格后，消费者可以选择不同规格进行购买。每个规格可以设置不同的价格调整和库存。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Form.List name="specifications">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row gutter={16} key={key} className="spec-item">
                      <Col xs={24} sm={24} md={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          rules={[{ required: true, message: '规格名称不能为空' }]}
                        >
                          <Input placeholder="规格名称，如颜色、尺寸" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={24} md={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'value']}
                          rules={[{ required: true, message: '规格值不能为空' }]}
                        >
                          <Input placeholder="规格值，如红色、L码" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={5}>
                        <Form.Item
                          {...restField}
                          name={[name, 'price_adjustment']}
                          initialValue={0}
                          tooltip="正数表示加价，负数表示减价"
                        >
                          <InputNumber 
                            placeholder="加价" 
                            min={-9999} 
                            max={9999}
                            precision={2}
                            style={{ width: '100%' }}
                            prefix="价格调整:"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={5}>
                        <Form.Item
                          {...restField}
                          name={[name, 'stock']}
                          initialValue={0}
                          tooltip="此规格的库存数量"
                        >
                          <InputNumber 
                            placeholder="库存" 
                            min={0}
                            style={{ width: '100%' }}
                            prefix="库存:"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={2} className="delete-spec-btn">
                        <MinusCircleOutlined 
                          className="dynamic-delete-button" 
                          onClick={() => {
                            remove(name);
                            setSpecListChanged(true);
                          }} 
                        />
                      </Col>
                    </Row>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => {
                        add();
                        setSpecListChanged(true);
                      }}
                      block
                      icon={<PlusOutlined />}
                    >
                      添加规格
                    </Button>
                    <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                      提示: 如添加了多个规格，顾客下单时需要选择对应的规格
                    </Text>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Card>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <FileTextOutlined />
              详细描述
            </span>
          }
          key="detail"
        >
          <Card title="商品详情">
            <Form.Item
              name="detail"
              label="商品详情"
              tooltip="支持HTML格式，可以详细描述商品特点、参数等信息"
            >
              <TextArea 
                rows={12} 
                placeholder="请输入商品详情描述，支持HTML格式" 
                showCount
              />
            </Form.Item>
          </Card>
        </TabPane>
      </Tabs>
      
      <div className="form-actions" style={{ marginTop: 16, textAlign: 'center' }}>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button 
            type="primary" 
            onClick={handleSubmit} 
            loading={submitting}
          >
            {isCreateMode ? '创建商品' : '保存修改'}
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default ProductForm;