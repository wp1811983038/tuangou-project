// src/pages/Merchants/components/MerchantForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, InputNumber, Upload, Button, Space, Row, Col,
  Card, Divider, message, Tooltip
} from 'antd';
import {
  LoadingOutlined, PlusOutlined, InfoCircleOutlined, 
  EnvironmentOutlined // 新增图标
} from '@ant-design/icons';
import request from '../../../utils/request'; // 添加这一行导入request

import { fetchMerchantCategories } from '../../../api/merchant';


const { Option } = Select;
const { TextArea } = Input;

const MerchantForm = ({ initialValues, onFinish, loading, formRef }) => {
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [licenseUrl, setLicenseUrl] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  // 新增状态
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  // 传递表单引用给父组件
  useEffect(() => {
    if (formRef) {
      formRef(form);
    }
  }, [form, formRef]);

  // 加载商户分类
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetchMerchantCategories();
      console.log("加载商户分类成功:", response);
      setCategories(response || []);
    } catch (error) {
      console.error('获取商户分类失败:', error);
      message.error('获取商户分类失败');
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadCategories();
  }, []);

  // 处理初始值
  useEffect(() => {
    // 打印完整的初始值对象，用于调试
    console.log("MerchantForm 收到的初始值:", initialValues);

    // 设置表单字段值
    if (initialValues && initialValues.id) {
      console.log("设置表单字段值...");

      // 设置图片URL
      if (initialValues.logo) {
        console.log("设置Logo URL:", initialValues.logo);
        setLogoUrl(initialValues.logo);
      }

      if (initialValues.cover) {
        console.log("设置Cover URL:", initialValues.cover);
        setCoverUrl(initialValues.cover);
      }

      if (initialValues.license_image) {
        console.log("设置License URL:", initialValues.license_image);
        setLicenseUrl(initialValues.license_image);
      }

      // 手动设置所有字段值
      try {
        // 创建要设置的表单值对象
        const formValues = {
          name: initialValues.name || '',
          contact_name: initialValues.contact_name || '',
          contact_phone: initialValues.contact_phone || '',
          business_hours: initialValues.business_hours || '',
          description: initialValues.description || '',
          category_ids: initialValues.category_ids || [],
          province: initialValues.province || '',
          city: initialValues.city || '',
          district: initialValues.district || '',
          address: initialValues.address || '',
          latitude: initialValues.latitude || null,
          longitude: initialValues.longitude || null,
          license_number: initialValues.license_number || '',
          license_image: initialValues.license_image || '',
          logo: initialValues.logo || '',
          cover: initialValues.cover || '',
          status: initialValues.status !== undefined ? initialValues.status : 1,
          commission_rate: initialValues.commission_rate !== undefined ? initialValues.commission_rate : 0.05,
          rating: initialValues.rating !== undefined ? initialValues.rating : 5.0
        };

        console.log("设置表单值:", formValues);
        form.setFieldsValue(formValues);

        // 在短暂延迟后再次检查表单值是否已设置
        setTimeout(() => {
          const currentValues = form.getFieldsValue();
          console.log("表单当前值:", currentValues);

          // 检查关键字段是否正确设置
          const nameField = form.getFieldValue('name');
          if (!nameField && initialValues.name) {
            console.warn("名称字段未能正确设置，再次尝试");
            form.setFieldValue('name', initialValues.name);
          }

          // 再次设置图片URL (以防延迟加载导致状态未及时更新)
          if (initialValues.logo && !logoUrl) setLogoUrl(initialValues.logo);
          if (initialValues.cover && !coverUrl) setCoverUrl(initialValues.cover);
          if (initialValues.license_image && !licenseUrl) setLicenseUrl(initialValues.license_image);
        }, 300);

      } catch (error) {
        console.error("设置表单值出错:", error);
        message.warning('自动填充表单数据出错，请手动检查数据');
      }
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
    formData.append('folder', 'images');  // 指定目录为images

    // 如果当前正在编辑商户，添加商户ID
    if (initialValues && initialValues.id) {
      formData.append('merchant_id', initialValues.id);
    }

    try {
      // 调用上传API
      const response = await request({
        url: '/uploads/file',  // 使用文件上传API端点
        method: 'post',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // 获取返回的URL
      const imageUrl = response.url || '';
      console.log(`上传成功，获得图片URL: ${imageUrl}`);

      // 根据字段名设置不同的URL
      if (filename === 'logo') {
        setLogoUrl(imageUrl);
        form.setFieldsValue({ logo: imageUrl });
      } else if (filename === 'cover') {
        setCoverUrl(imageUrl);
        form.setFieldsValue({ cover: imageUrl });
      } else if (filename === 'license_image') {
        setLicenseUrl(imageUrl);
        form.setFieldsValue({ license_image: imageUrl });
      }

      if (onSuccess) onSuccess({ url: imageUrl }, file);
      message.success(`${file.name} 上传成功`);
    } catch (error) {
      console.error('上传错误:', error);
      if (onError) onError(error);
      message.error(`${file.name} 上传失败: ${error.friendlyMessage || error.message || '未知错误'}`);
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

  // 表单提交处理
  const handleFinish = (values) => {
    console.log("表单提交值:", values);
    // 触发父组件的提交处理
    if (onFinish) {
      onFinish(values);
    }
  };

  // 新增获取经纬度的函数
  const handleGetCoordinates = async () => {
    // 获取表单中的地址信息
    const province = form.getFieldValue('province');
    const city = form.getFieldValue('city');
    const district = form.getFieldValue('district');
    const address = form.getFieldValue('address');

    // 验证地址信息是否完整
    if (!province || !city || !district || !address) {
      message.error('请先填写完整的地址信息（省市区和详细地址）');
      return;
    }

    try {
      setGeocodingLoading(true);
      
      // 调用后端地址转经纬度API
      const response = await request({
        url: '/locations/geocode',
        method: 'post',
        data: {
          province,
          city,
          district,
          address,
        }
      });

      // 检查返回数据
      if (response && response.latitude && response.longitude) {
        // 设置经纬度到表单
        form.setFieldsValue({
          latitude: response.latitude,
          longitude: response.longitude,
        });

        message.success(`获取经纬度成功：(${response.latitude.toFixed(6)}, ${response.longitude.toFixed(6)})`);
      } else {
        message.error('获取经纬度失败，请稍后再试');
      }
    } catch (error) {
      console.error('获取经纬度出错:', error);
      message.error(error.friendlyMessage || '获取经纬度失败');
    } finally {
      setGeocodingLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        status: 1,
        commission_rate: 0.05,
        rating: 5.0,
        ...initialValues // 确保初始值也在这里传入
      }}
      requiredMark={true}
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
                loading={categoriesLoading}
                optionFilterProp="children"
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

            {/* 添加获取经纬度按钮 */}
            <Form.Item>
              <Button
                type="primary"
                icon={<EnvironmentOutlined />}
                onClick={handleGetCoordinates}
                loading={geocodingLoading}
                style={{ marginBottom: 16 }}
              >
                获取经纬度坐标
              </Button>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="latitude"
                  label="纬度"
                  tooltip="纬度范围: -90 到 90"
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
                  tooltip="经度范围: -180 到 180"
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
                  <img
                    src={licenseUrl}
                    alt="营业执照"
                    style={{ width: '100%' }}
                    onError={(e) => {
                      console.warn('执照图片加载失败:', licenseUrl);
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlOWVjZWYiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNmM3NTdkIj7miqXnmb08L3RleHQ+PC9zdmc+';
                    }}
                  />
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
              getValueFromEvent={(e) => {
                // 处理Upload组件的事件，返回正确的字符串值
                if (e && e.file && e.file.response && e.file.response.url) {
                  return e.file.response.url;
                }
                if (e && e.url) {
                  return e.url;
                }
                if (typeof e === 'string') {
                  return e;
                }
                return '';
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
                  <img
                    src={logoUrl}
                    alt="logo"
                    style={{ width: '100%' }}
                    onError={(e) => {
                      console.warn('Logo图片加载失败:', logoUrl);
                      // 使用内联SVG作为备用
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlOWVjZWYiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNmM3NTdkIj5Mb2dvPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                ) : (
                  uploadButton
                )}
              </Upload>
            </Form.Item>

            <Form.Item
              name="cover"
              label="封面图"
              tooltip="建议上传宽高比为16:9的图片"
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
                  <img
                    src={coverUrl}
                    alt="cover"
                    style={{ width: '100%' }}
                    onError={(e) => {
                      console.warn('Cover图片加载失败:', coverUrl);
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlOWVjZWYiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNmM3NTdkIj7lsIHpnaI8L3RleHQ+PC9zdmc+';
                    }}
                  />
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
              label={
                <span>
                  佣金率
                  <Tooltip title="商户佣金率，0-1之间的小数，表示百分比">
                    <InfoCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
              rules={[{ required: true, message: '请输入佣金率' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={1}
                precision={2}
                step={0.01}
                formatter={value => `${(value * 100).toFixed(0)}%`}
                parser={value => parseFloat(value.replace('%', '')) / 100}
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

          {/* 调试信息面板 - 仅在开发环境显示 */}
          {process.env.NODE_ENV === 'development' && (
            <Card title="表单调试" style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>字段状态:</div>
                <div>名称: {form.getFieldValue('name') || '未设置'}</div>
                <div>联系人: {form.getFieldValue('contact_name') || '未设置'}</div>
                <div>分类IDs: {JSON.stringify(form.getFieldValue('category_ids') || [])}</div>
                <Button
                  size="small"
                  onClick={() => {
                    console.log("表单当前所有值:", form.getFieldsValue());
                    message.info('表单值已在控制台打印');
                  }}
                >
                  查看所有字段值
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    if (initialValues) {
                      form.setFieldsValue(initialValues);
                      message.success('已重置表单数据');
                    } else {
                      message.warning('无初始值可用');
                    }
                  }}
                >
                  重置为初始值
                </Button>
              </Space>
            </Card>
          )}
        </Col>
      </Row>

      <Divider />

      <Form.Item>
        <Space>
          <Button
            id="merchant-form-submit"
            type="primary"
            htmlType="submit"
            loading={loading}
          >
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