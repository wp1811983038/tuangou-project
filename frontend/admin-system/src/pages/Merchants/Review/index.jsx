// src/pages/Merchants/Review/index.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Descriptions, Badge, Button, Form, Radio, Input, Space, Divider, 
  Image, Row, Col, message 
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { fetchMerchantDetail, updateMerchantStatus } from '@/api/merchant';

const { TextArea } = Input;

const MerchantReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [merchant, setMerchant] = useState(null);

  // 加载商户详情
  const loadMerchantDetail = async () => {
    try {
      setLoading(true);
      const response = await fetchMerchantDetail(id);
      setMerchant(response);
    } catch (error) {
      message.error('获取商户详情失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    if (id) {
      loadMerchantDetail();
    }
  }, [id]);

  // 提交审核
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      const { reviewResult, reviewReason } = values;
      
      // 调用API更新商户状态
      await updateMerchantStatus(id, {
        status: reviewResult === 'approve' ? 1 : 2,
        review_reason: reviewReason || null
      });
      
      message.success('审核完成');
      navigate('/merchants/list');
    } catch (error) {
      message.error('审核失败');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !merchant) {
    return (
      <Card loading={loading} title="商户审核">
        加载中...
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            type="link"
          />
          <span>商户审核</span>
        </Space>
      }
    >
      <Row gutter={24}>
        <Col span={16}>
          <Descriptions
            title="基本信息"
            bordered
            column={{ xxl: 2, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 }}
          >
            <Descriptions.Item label="商户名称" span={2}>
              {merchant.name}
              <Badge
                status="warning"
                text="待审核"
                style={{ marginLeft: 8 }}
              />
            </Descriptions.Item>
            <Descriptions.Item label="联系人">
              {merchant.contact_name}
            </Descriptions.Item>
            <Descriptions.Item label="联系电话">
              {merchant.contact_phone}
            </Descriptions.Item>
            <Descriptions.Item label="所在地址" span={2}>
              {`${merchant.province}${merchant.city}${merchant.district}${merchant.address}`}
            </Descriptions.Item>
            <Descriptions.Item label="营业执照号">
              {merchant.license_number || '未提供'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {merchant.created_at}
            </Descriptions.Item>
            <Descriptions.Item label="经营分类" span={2}>
              {merchant.categories?.map(category => (
                <Tag key={category.id} color="blue">{category.name}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="商户描述" span={2}>
              {merchant.description || '暂无描述'}
            </Descriptions.Item>
          </Descriptions>

          {merchant.license_image && (
            <div style={{ marginTop: 24 }}>
              <Divider orientation="left">营业执照</Divider>
              <Image
                src={merchant.license_image}
                alt="营业执照"
                style={{ maxWidth: 400 }}
                fallback="https://via.placeholder.com/400x300?text=No+License+Image"
              />
            </div>
          )}
        </Col>
        
        <Col span={8}>
          <Card title="商户图片">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Image
                src={merchant.logo || 'https://via.placeholder.com/200?text=No+Logo'}
                alt="商户Logo"
                style={{ width: '100%', maxWidth: 200, height: 'auto', borderRadius: 8 }}
                fallback="https://via.placeholder.com/200?text=No+Logo"
              />
              <div style={{ marginTop: 8 }}>商户Logo</div>
            </div>
            
            {merchant.cover && (
              <div style={{ textAlign: 'center' }}>
                <Image
                  src={merchant.cover}
                  alt="封面图"
                  style={{ width: '100%', height: 'auto', borderRadius: 8 }}
                  fallback="https://via.placeholder.com/400x225?text=No+Cover"
                />
                <div style={{ marginTop: 8 }}>封面图</div>
              </div>
            )}
          </Card>
          
          <Card title="审核" style={{ marginTop: 16 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ reviewResult: 'approve' }}
            >
              <Form.Item
                name="reviewResult"
                label="审核结果"
                rules={[{ required: true, message: '请选择审核结果' }]}
              >
                <Radio.Group>
                  <Radio value="approve">通过</Radio>
                  <Radio value="reject">拒绝</Radio>
                </Radio.Group>
              </Form.Item>
              
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.reviewResult !== currentValues.reviewResult
                }
              >
                {({ getFieldValue }) => 
                  getFieldValue('reviewResult') === 'reject' && (
                    <Form.Item
                      name="reviewReason"
                      label="拒绝原因"
                      rules={[{ required: true, message: '请输入拒绝原因' }]}
                    >
                      <TextArea rows={4} placeholder="请输入拒绝原因" />
                    </Form.Item>
                  )
                }
              </Form.Item>
              
              <Form.Item>
                <Space>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={submitting}
                  >
                    提交审核
                  </Button>
                  <Button onClick={() => navigate(-1)}>
                    返回
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default MerchantReview;