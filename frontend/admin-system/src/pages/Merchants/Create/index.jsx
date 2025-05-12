// src/pages/Merchants/Create/index.jsx
import React, { useState } from 'react';
import { Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import MerchantForm from '../components/MerchantForm';
import { createMerchant } from '../../../api/merchant';

const CreateMerchant = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 创建商户
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      await createMerchant(values);
      message.success('商户创建成功');
      navigate('/merchants/list');
    } catch (error) {
      message.error('商户创建失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="创建商户">
      <MerchantForm 
        onFinish={handleSubmit}
        loading={loading}
      />
    </Card>
  );
};

export default CreateMerchant;