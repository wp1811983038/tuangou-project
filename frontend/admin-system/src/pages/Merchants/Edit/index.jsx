// src/pages/Merchants/Edit/index.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, message, Spin, Button, Space, Alert, Divider } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import request from '../../../utils/request';
import MerchantForm from '../components/MerchantForm';

// 将两个组件声明合并为一个
const EditMerchant = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dataReady, setDataReady] = useState(false);
  const isLoadingRef = useRef(false);
  const formRef = useRef(null);
  
  // 添加用户角色和权限检查
  const { userInfo, roles } = useSelector((state) => state.user);
  
  // 检查管理员身份
  useEffect(() => {
    console.log("当前用户信息:", userInfo);
    console.log("用户角色:", roles);
    console.log("是否管理员:", roles?.includes('admin'));
  }, [userInfo, roles]);

  // 加载商户详情数据
  const loadMerchantDetail = async () => {
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setErrorMsg('');
      
      console.log(`正在获取商户ID ${id} 的详情...`);
      
      // 调用API获取商户详情
      const response = await request({
        url: `/merchants/${id}`,
        method: 'get',
        timeout: 10000
      });
      
      console.log("获取商户详情成功:", response);
      
      // 处理API返回的数据
      let merchantData;
      if (response && response.data) {
        merchantData = { ...response.data };
      } else if (response && typeof response === 'object' && response.name) {
        merchantData = { ...response };
      } else {
        console.error("无效的响应数据格式:", response);
        throw new Error('返回数据格式错误');
      }
      
      // 处理分类数据
      if (merchantData.categories && Array.isArray(merchantData.categories)) {
        merchantData.category_ids = merchantData.categories.map(cat => cat?.id).filter(Boolean);
      } else {
        merchantData.category_ids = [];
      }
      
      setMerchant(merchantData);
      setDataReady(true);
    } catch (error) {
      console.error('获取商户详情失败:', error);
      setErrorMsg(`获取商户详情失败: ${error.message || '未知错误'}`);
      setMerchant(null);
      setDataReady(false);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
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
      setErrorMsg('');
      
      // 打印提交数据和管理员状态
      console.log("提交商户更新数据:", values);
      console.log("是否管理员:", roles?.includes('admin'));
      
      // 确保重要字段存在
      const safeValues = { ...values };
      
      // 处理图片路径 - 如果是默认路径就不提交
      ['logo', 'cover', 'license_image'].forEach(field => {
        if (safeValues[field]?.includes('/assets/images/')) {
          delete safeValues[field];
        }
      });
      
      // 调用API更新商户 - 管理员专用API
      await request({
        url: `/merchants/${id}`,
        method: 'put',
        data: safeValues,
        timeout: 15000 // 增加超时时间
      });
      
      message.success('商户更新成功');
      
      // 更新成功后导航到详情页
      navigate(`/merchants/detail/${id}`);
    } catch (error) {
      console.error('商户更新失败:', error);
      
      // 安全地获取错误消息
      let errorDetail = "未知错误";
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        errorDetail = typeof detail === 'string' ? detail : JSON.stringify(detail);
      } else if (error.message) {
        errorDetail = error.message;
      }
      
      setErrorMsg(`商户更新失败: ${errorDetail}`);
      message.error('商户更新失败，请检查表单数据或网络连接');
    } finally {
      setSubmitting(false);
    }
  };

  // 调试功能：手动触发表单填充
  const triggerFormFill = () => {
    if (!merchant) return;
    
    if (formRef.current) {
      formRef.current.setFieldsValue(merchant);
      message.success('已手动填充表单数据');
    } else {
      message.warning('表单引用不可用');
    }
  };

  // 传递表单引用的函数
  const setFormRef = (ref) => {
    formRef.current = ref;
    
    // 获取到表单引用后，尝试自动填充数据
    if (ref && merchant) {
      console.log("获取到表单引用，尝试填充数据");
      setTimeout(() => {
        ref.setFieldsValue(merchant);
      }, 100);
    }
  };

  // 渲染错误提示 - 确保错误消息是字符串
  const renderError = () => {
    if (!errorMsg) return null;
    
    // 确保错误消息是字符串
    const safeErrorMsg = typeof errorMsg === 'object' 
      ? JSON.stringify(errorMsg) 
      : String(errorMsg);
    
    return (
      <Alert
        message="错误"
        description={safeErrorMsg}
        type="error"
        showIcon
        closable
        style={{ marginBottom: 16 }}
        action={
          <Button size="small" type="primary" onClick={loadMerchantDetail}>
            重试
          </Button>
        }
      />
    );
  };

  // 渲染调试面板 (仅在开发环境)
  const renderDebugPanel = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div style={{ 
        marginBottom: 16, 
        padding: 12, 
        background: '#f9f9f9', 
        border: '1px dashed #ddd',
        borderRadius: 4
      }}>
        <h4 style={{ margin: '0 0 8px' }}>调试信息</h4>
        <p style={{ margin: '0 0 8px' }}>
          商户ID: {id}, 数据状态: {dataReady ? '已加载' : '未加载'}, 
          表单引用: {formRef.current ? '已获取' : '未获取'}
        </p>
        <p style={{ margin: '0 0 8px' }}>
          用户ID: {userInfo?.id}, 
          角色: {JSON.stringify(roles)}, 
          是管理员: {roles?.includes('admin') ? '是' : '否'}
        </p>
        {merchant && (
          <p style={{ margin: '0 0 8px' }}>
            商户名称: {merchant.name}, 
            联系人: {merchant.contact_name}, 
            分类IDs: {JSON.stringify(merchant.category_ids)}
          </p>
        )}
        <Space>
          <Button size="small" onClick={loadMerchantDetail} icon={<ReloadOutlined />}>
            重新加载数据
          </Button>
          <Button size="small" onClick={triggerFormFill} disabled={!merchant}>
            手动填充表单
          </Button>
          <Button 
            size="small" 
            type="primary"
            onClick={() => {
              if (merchant) {
                console.log("当前商户数据完整对象:", merchant);
                message.info('已在控制台打印商户数据');
              }
            }}
            disabled={!merchant}
          >
            查看数据
          </Button>
        </Space>
      </div>
    );
  };

  // 渲染加载状态
  if (loading) {
    return (
      <Card title="编辑商户">
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>正在加载商户信息...</p>
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
          {merchant && (
            <span style={{ color: '#888', fontSize: '14px' }}>
              - {merchant.name}
            </span>
          )}
        </Space>
      }
      extra={
        <Space>
          {dataReady && (
            <span style={{ color: '#52c41a' }}>
              <CheckCircleOutlined /> 数据已加载
            </span>
          )}
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={submitting}
            onClick={() => {
              // 通过表单引用提交
              if (formRef.current) {
                formRef.current.submit();
              } else {
                message.warning('无法获取表单引用，请直接点击表单底部的保存按钮');
              }
            }}
            disabled={!dataReady}
          >
            保存
          </Button>
        </Space>
      }
    >
      {/* 错误提示 */}
      {renderError()}
      
      {/* 调试面板 */}
      {renderDebugPanel()}
      
      {/* 编辑表单 */}
      {merchant ? (
        <MerchantForm 
          key={`merchant-${id}-${Date.now()}`} // 确保组件是全新挂载的
          initialValues={merchant}
          onFinish={handleSubmit}
          loading={submitting}
          formRef={setFormRef}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p>未能加载商户信息</p>
          <Button type="primary" onClick={loadMerchantDetail} icon={<ReloadOutlined />}>
            重新加载
          </Button>
        </div>
      )}
    </Card>
  );
};

export default EditMerchant;