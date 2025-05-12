// src/pages/Merchants/Edit/index.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, message, Spin } from 'antd';
import MerchantForm from '../components/MerchantForm';
import { fetchMerchantDetail, updateMerchant } from '@/api/merchant';

const EditMerchant = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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

  // 更新商户
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      await updateMerchant(id, values);
      message.success('商户更新成功');
      navigate('/merchants/list');
    } catch (error) {
      message.error('商户更新失败');
      console.error(error);
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
    <Card title="编辑商户">
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