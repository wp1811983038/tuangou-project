// src/pages/Merchants/Detail/index.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Descriptions, Badge, Button, Tabs, Table, Image, Row, Col, Space, 
  Statistic, Divider, message, Modal, Tag 
} from 'antd';
import { 
  ArrowLeftOutlined, EditOutlined, ShopOutlined, EnvironmentOutlined,
  PhoneOutlined, UserOutlined, ShoppingOutlined, OrderedListOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import request from '../../../utils/request';

const { TabPane } = Tabs;

const MerchantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const isLoadingRef = useRef(false);
  
  // 状态标签映射
  const statusMap = {
    0: { text: '待审核', color: 'orange' },
    1: { text: '正常', color: 'green' },
    2: { text: '已禁用', color: 'red' }
  };

  // 使用useRef存储函数
  const loadMerchantDetailRef = useRef();
  const loadMerchantProductsRef = useRef();
  const loadMerchantOrdersRef = useRef();

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
        
        setMerchant(response.data);
      } catch (error) {
        console.error('获取商户详情失败', error);
        message.error('获取商户详情失败');
        setMerchant(null);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };
    
    loadMerchantProductsRef.current = async () => {
      if (activeTab !== 'products') return;
      
      try {
        const response = await request({
          url: '/products/',
          method: 'get',
          params: { merchant_id: id, page_size: 10 },
          timeout: 8000
        });
        
        setProducts(response.data.items || []);
      } catch (error) {
        console.error('获取商户商品失败', error);
        message.error('获取商户商品失败');
        setProducts([]);
      }
    };
    
    loadMerchantOrdersRef.current = async () => {
      if (activeTab !== 'orders') return;
      
      try {
        const response = await request({
          url: '/orders/',
          method: 'get',
          params: { merchant_id: id, page_size: 10 },
          timeout: 8000
        });
        
        setOrders(response.data.items || []);
      } catch (error) {
        console.error('获取商户订单失败', error);
        message.error('获取商户订单失败');
        setOrders([]);
      }
    };
  }, [id, activeTab]);

  // 首次加载商户详情
  useEffect(() => {
    if (id) {
      loadMerchantDetailRef.current();
    }
  }, [id]);

  // Tab切换时加载对应数据
  useEffect(() => {
    if (activeTab === 'products') {
      loadMerchantProductsRef.current();
    } else if (activeTab === 'orders') {
      loadMerchantOrdersRef.current();
    }
  }, [activeTab]);

  // 处理Tab切换
  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  // 处理状态变更
  const handleStatusChange = async (newStatus) => {
    const statusText = newStatus === 1 ? '启用' : '禁用';
    
    Modal.confirm({
      title: `确定要${statusText}该商户吗？`,
      content: `此操作将${statusText}商户的所有功能，请谨慎操作。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await request({
            url: `/merchants/${id}/status/`,
            method: 'put',
            data: { status: newStatus }
          });
          
          message.success(`商户${statusText}成功`);
          loadMerchantDetailRef.current(); // 刷新商户信息
        } catch (error) {
          message.error(`商户${statusText}失败`);
          console.error(error);
        }
      }
    });
  };

  // 商品列表列配置
  const productColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {record.thumbnail && (
            <Image 
              src={record.thumbnail} 
              alt={text} 
              width={40} 
              height={40} 
              style={{ objectFit: 'cover' }}
              fallback="https://via.placeholder.com/40"
            />
          )}
          {text}
        </Space>
      )
    },
    {
      title: '价格',
      dataIndex: 'current_price',
      key: 'current_price',
      render: (price) => `￥${price?.toFixed(2) || '0.00'}`
    },
    {
      title: '销量',
      dataIndex: 'sales',
      key: 'sales'
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 1 ? 'success' : 'default'} 
          text={status === 1 ? '上架' : '下架'} 
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/products/detail/${record.id}`)}
        >
          查看
        </Button>
      )
    }
  ];

  // 订单列表列配置
  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no'
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name'
    },
    {
      title: '金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `￥${amount?.toFixed(2) || '0.00'}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          0: { text: '待支付', status: 'warning' },
          1: { text: '已支付', status: 'processing' },
          2: { text: '已配送', status: 'processing' },
          3: { text: '已完成', status: 'success' },
          4: { text: '已取消', status: 'default' },
          5: { text: '已退款', status: 'error' }
        };
        const statusInfo = statusMap[status] || { text: '未知', status: 'default' };
        return <Badge status={statusInfo.status} text={statusInfo.text} />;
      }
    },
    {
      title: '下单时间',
      dataIndex: 'created_at',
      key: 'created_at'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/orders/detail/${record.id}`)}
        >
          查看
        </Button>
      )
    }
  ];

  // 如果数据正在加载或未找到，显示加载状态
  if (loading || !merchant) {
    return (
      <Card loading={loading} title="商户详情">
        加载中...
      </Card>
    );
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              type="link"
            />
            <span>商户详情</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/merchants/edit/${id}`)}
            >
              编辑商户
            </Button>
            {merchant.status !== 0 && (
              <Button
                type={merchant.status === 1 ? 'default' : 'primary'}
                danger={merchant.status === 1}
                onClick={() => handleStatusChange(merchant.status === 1 ? 2 : 1)}
              >
                {merchant.status === 1 ? '禁用商户' : '启用商户'}
              </Button>
            )}
            {merchant.status === 0 && (
              <Button
                type="primary"
                onClick={() => navigate(`/merchants/review/${id}`)}
              >
                审核商户
              </Button>
            )}
          </Space>
        }
      >
        <Row gutter={24}>
          <Col span={6}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Image
                src={merchant.logo || 'https://via.placeholder.com/200'}
                alt={merchant.name}
                style={{ width: '100%', maxWidth: 200, height: 'auto', borderRadius: 8 }}
                fallback="https://via.placeholder.com/200?text=No+Image"
              />
            </div>
            <Card>
              <Statistic
                title="商户评分"
                value={merchant.rating || 0}
                precision={1}
                suffix="/5.0"
                valueStyle={{ color: '#3f8600' }}
              />
              <Divider style={{ margin: '16px 0' }} />
              <Statistic
                title="佣金率"
                value={(merchant.commission_rate || 0) * 100}
                precision={1}
                suffix="%"
              />
              <Divider style={{ margin: '16px 0' }} />
              <Statistic
                title="账户余额"
                value={merchant.balance || 0}
                precision={2}
                prefix="￥"
              />
            </Card>
          </Col>
          <Col span={18}>
            <Tabs defaultActiveKey="info" onChange={handleTabChange}>
              <TabPane tab="基本信息" key="info">
                <Descriptions
                  bordered
                  column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}
                >
                  <Descriptions.Item label="商户名称" span={3}>
                    <Space>
                      <ShopOutlined />
                      {merchant.name}
                      <Badge
                        status={merchant.status === 1 ? 'success' : merchant.status === 0 ? 'processing' : 'error'}
                        text={statusMap[merchant.status]?.text || '未知状态'}
                      />
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="联系人">
                    <Space>
                      <UserOutlined />
                      {merchant.contact_name}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="联系电话">
                    <Space>
                      <PhoneOutlined />
                      {merchant.contact_phone}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="营业时间">
                    {merchant.business_hours || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item label="所在地址" span={3}>
                    <Space>
                      <EnvironmentOutlined />
                      {`${merchant.province || ''}${merchant.city || ''}${merchant.district || ''}${merchant.address || ''}`}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="营业执照号">
                    {merchant.license_number || '未提供'}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {merchant.created_at}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间">
                    {merchant.updated_at}
                  </Descriptions.Item>
                  <Descriptions.Item label="经营分类" span={3}>
                    {merchant.categories?.map(category => (
                      <Tag key={category.id} color="blue">{category.name}</Tag>
                    ))}
                  </Descriptions.Item>
                  <Descriptions.Item label="商户描述" span={3}>
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
              </TabPane>
              
              <TabPane 
                tab={<span><ShoppingOutlined /> 商品列表</span>} 
                key="products"
              >
                <Table
                  columns={productColumns}
                  dataSource={products}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  locale={{ emptyText: '暂无商品数据' }}
                />
              </TabPane>
              
              <TabPane 
                tab={<span><OrderedListOutlined /> 订单列表</span>} 
                key="orders"
              >
                <Table
                  columns={orderColumns}
                  dataSource={orders}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  locale={{ emptyText: '暂无订单数据' }}
                />
              </TabPane>
            </Tabs>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default MerchantDetail;