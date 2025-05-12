// src/pages/Merchants/Edit/index.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, message, Spin, Button, Space } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import request from '../../../utils/request';
import MerchantForm from '../components/MerchantForm';

const EditMerchant = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const isLoadingRef = useRef(false);
  const loadMerchantDetailRef = useRef();

  // 更新函数引用
  useEffect(() => {
    loadMerchantDetailRef.current = async () => {
    if (isLoadingRef.current) return;
    
    try {
        isLoadingRef.current = true;
        setLoading(true);
        
        // 调用API获取商户详情
        const response = await request({
        url: `/merchants/${id}/`,
        method: 'get',
        timeout: 8000
        });
        
        // 处理API返回的数据，添加空值检查
        const merchantData = response?.data || {};
        
        // 从categories提取category_ids，添加安全检查
        try {
        if (merchantData.categories && Array.isArray(merchantData.categories)) {
            merchantData.category_ids = merchantData.categories.map(cat => cat?.id).filter(Boolean);
        } else {
            merchantData.category_ids = [];
        }
        } catch (error) {
        console.error('处理分类数据出错:', error);
        merchantData.category_ids = [];
        }
        
        setMerchant(merchantData);
    } catch (error) {
        console.error('获取商户详情失败', error);
        message.error('获取商户详情失败');
        setMerchant(null);
    } finally {
        setLoading(false);
        isLoadingRef.current = false;
    }
    };
  }, [id]);

  // 首次加载
  useEffect(() => {
    if (id) {
      loadMerchantDetailRef.current();
    }
  }, [id]);

  // 更新商户
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      // 调用API更新商户
      await request({
        url: `/merchants/${id}/`,
        method: 'put',
        data: values,
        timeout: 8000
      });
      
      message.success('商户更新成功');
      navigate(`/merchants/detail/${id}`);
    } catch (error) {
      console.error('商户更新失败', error);
      message.error('商户更新失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card title="编辑商户">
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
        </div>
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
          <span>编辑商户</span>
        </Space>
      }
      extra={
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={submitting}
          onClick={() => document.getElementById('merchant-form-submit').click()}
        >
          保存
        </Button>
      }
    >
      {merchant && (
        <MerchantForm 
          initialValues={merchant}
          onFinish={handleSubmit}
          loading={submitting}
        />
      )}
    </Card>
  );
};

export default EditMerchant;