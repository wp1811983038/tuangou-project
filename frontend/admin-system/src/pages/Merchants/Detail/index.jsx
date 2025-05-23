// src/pages/Merchants/Detail/index.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Descriptions, Badge, Button, Tabs, Table, Image, Row, Col, Space,
  Statistic, Divider, message, Modal, Tag, Typography, Skeleton, Empty, Tooltip,
  Collapse, Alert
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, ShopOutlined, EnvironmentOutlined,
  PhoneOutlined, UserOutlined, ShoppingOutlined, OrderedListOutlined,
  PieChartOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  InfoCircleOutlined, ReloadOutlined, AimOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import request from '../../../utils/request';
import './index.less'; // 确保样式文件被导入

const { TabPane } = Tabs;
const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

const MerchantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0, avgRating: 0 });
  const [boundaryPoints, setBoundaryPoints] = useState(null);
  const isLoadingRef = useRef(false);

  // 状态标签映射
  const statusMap = {
    0: { text: '待审核', color: 'orange' },
    1: { text: '正常', color: 'green' },
    2: { text: '已禁用', color: 'red' }
  };

  // 计算服务半径边界的函数
  const calculateBoundaryCoordinates = (latitude, longitude, radius) => {
    if (!latitude || !longitude || !radius) {
      return null;
    }

    // 地球半径(千米)
    const EARTH_RADIUS = 6371;

    // 转换纬度为弧度
    const latRad = latitude * Math.PI / 180;

    // 计算1度经度对应的公里数（与纬度有关）
    const kmPerLngDegree = 111.32 * Math.cos(latRad);
    // 计算1度纬度对应的公里数（基本固定）
    const kmPerLatDegree = 111.32;

    // 计算边界
    const north = latitude + (radius / kmPerLatDegree);
    const south = latitude - (radius / kmPerLatDegree);
    const east = longitude + (radius / kmPerLngDegree);
    const west = longitude - (radius / kmPerLngDegree);

    return {
      north: north.toFixed(6),
      south: south.toFixed(6),
      east: east.toFixed(6),
      west: west.toFixed(6),
      radius
    };
  };

  // 加载商户详情
  const loadMerchantDetail = async () => {
    if (isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      setLoading(true);

      // 添加时间戳参数，确保获取最新数据
      const timestamp = Date.now();

      // 调用API获取商户详情
      const response = await request({
        url: `/merchants/${id}?_t=${timestamp}`,
        method: 'get',
        timeout: 10000,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      });

      const merchantData = response.data || response;
      setMerchant(merchantData);

      // 计算服务半径边界
      if (merchantData.latitude && merchantData.longitude && merchantData.service_radius) {
        const boundary = calculateBoundaryCoordinates(
          merchantData.latitude,
          merchantData.longitude,
          merchantData.service_radius
        );
        setBoundaryPoints(boundary);
        console.log("服务半径边界计算完成:", boundary);
      } else {
        setBoundaryPoints(null);
      }

      // 加载统计数据 (这里示例数据，实际应从API获取)
      setStats({
        totalSales: Math.floor(Math.random() * 50000),
        totalOrders: Math.floor(Math.random() * 500),
        avgRating: (Math.random() * 2 + 3).toFixed(1)
      });

      console.log("商户详情加载成功，服务半径:", merchantData.service_radius);
    } catch (error) {
      console.error('获取商户详情失败', error);
      message.error('获取商户详情失败');
      setMerchant(null);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // 加载商户商品
  const loadMerchantProducts = async () => {
    if (activeTab !== 'products') return;

    try {
      const response = await request({
        url: '/products/',
        method: 'get',
        params: { merchant_id: id, page_size: 10 },
        timeout: 8000
      });

      setProducts(response.data?.items || []);
    } catch (error) {
      console.error('获取商户商品失败', error);
      message.error('获取商户商品失败');
      setProducts([]);
    }
  };

  // 加载商户订单
  const loadMerchantOrders = async () => {
    if (activeTab !== 'orders') return;

    try {
      const response = await request({
        url: '/orders/',
        method: 'get',
        params: { merchant_id: id, page_size: 10 },
        timeout: 8000
      });

      setOrders(response.data?.items || []);
    } catch (error) {
      console.error('获取商户订单失败', error);
      message.error('获取商户订单失败');
      setOrders([]);
    }
  };

  // 首次加载商户详情
  useEffect(() => {
    if (id) {
      loadMerchantDetail();
    }
  }, [id]);

  // Tab切换时加载对应数据
  useEffect(() => {
    if (activeTab === 'products') {
      loadMerchantProducts();
    } else if (activeTab === 'orders') {
      loadMerchantOrders();
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
      icon: <ExclamationCircleOutlined />,
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
          loadMerchantDetail(); // 刷新商户信息
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
      title: '商品图片',
      dataIndex: 'thumbnail',
      key: 'thumbnail',
      width: 90,
      render: (thumbnail, record) => (
        <Image
          src={thumbnail || 'https://via.placeholder.com/50'}
          alt={record.name}
          width={50}
          height={50}
          style={{ objectFit: 'cover', borderRadius: '4px' }}
          fallback="https://via.placeholder.com/50?text=暂无图片"
        />
      )
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text ellipsis style={{ maxWidth: 200 }}>{text}</Text>
    },
    {
      title: '价格',
      dataIndex: 'current_price',
      key: 'current_price',
      render: (price) => <Text type="success">￥{price?.toFixed(2) || '0.00'}</Text>
    },
    {
      title: '销量',
      dataIndex: 'sales',
      key: 'sales'
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock) => stock < 10 ? <Text type="danger">{stock}</Text> : stock
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
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/products/detail/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/products/edit/${record.id}`)}
          >
            编辑
          </Button>
        </Space>
      )
    }
  ];

  // 订单列表列配置
  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      render: (text) => <Text copyable>{text}</Text>
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
      render: (amount) => <Text type="success">￥{amount?.toFixed(2) || '0.00'}</Text>
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
          size="small"
          onClick={() => navigate(`/orders/detail/${record.id}`)}
        >
          查看
        </Button>
      )
    }
  ];

  // 渲染商户位置地图
  const renderMerchantMap = () => {
    if (!merchant || !merchant.latitude || !merchant.longitude) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无位置信息"
        />
      );
    }

    // 创建包含服务半径的地图URL
    let mapUrl;
    if (merchant.service_radius) {
      // 添加服务区域圆圈
      mapUrl = `https://apis.map.qq.com/ws/staticmap/v2/?center=${merchant.latitude},${merchant.longitude}&zoom=14&size=600*300&markers=size:large|color:blue|label:商|${merchant.latitude},${merchant.longitude}&circle=color:red|weight:1|fillcolor:22FF0000|${merchant.latitude},${merchant.longitude},${Math.min(20, merchant.service_radius) * 1000}&key=您的腾讯地图密钥`;
    } else {
      // 不包含服务区域的普通地图
      mapUrl = `https://apis.map.qq.com/ws/staticmap/v2/?center=${merchant.latitude},${merchant.longitude}&zoom=16&size=600*300&markers=size:large|color:blue|label:商|${merchant.latitude},${merchant.longitude}&key=您的腾讯地图密钥`;
    }

    return (
      <div style={{ textAlign: 'center' }}>
        <Image
          src={mapUrl}
          alt="商户位置"
          fallback="https://via.placeholder.com/600x300?text=地图加载失败"
          style={{ maxWidth: '100%', borderRadius: '8px' }}
        />
        <div style={{ marginTop: 10 }}>
          <Text>地址: {merchant.province}{merchant.city}{merchant.district}{merchant.address}</Text>
          <br />
          <Text type="secondary">经纬度: {merchant.latitude}, {merchant.longitude}</Text>
          {merchant.service_radius && (
            <>
              <br />
              <Text type="secondary">
                服务半径: {merchant.service_radius} 公里
                <Tooltip title="商户提供配送服务的范围">
                  <InfoCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </Text>
            </>
          )}
        </div>

        {/* 服务半径边界坐标信息 */}
        {boundaryPoints && (
          <div style={{ marginTop: 16, textAlign: 'left' }}>
            <Collapse ghost>
              <Panel
                header={
                  <Text strong>
                    <EnvironmentOutlined /> 服务半径边界坐标
                    <Text type="secondary" style={{ marginLeft: 8, fontWeight: 'normal' }}>
                      (点击展开查看详情)
                    </Text>
                  </Text>
                }
                key="boundary"
              >
                <Alert
                  type="info"
                  showIcon
                  message="服务覆盖范围坐标"
                  description={
                    <div>
                      <p style={{ margin: '4px 0' }}>
                        <Text strong>中心点:</Text> {merchant.latitude.toFixed(6)}, {merchant.longitude.toFixed(6)}
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <Text strong>服务半径:</Text> {merchant.service_radius} 公里
                      </p>
                      <Divider style={{ margin: '8px 0' }} />
                      <p style={{ margin: '4px 0' }}>
                        <Text strong>北边界纬度:</Text> {boundaryPoints.north}°
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <Text strong>南边界纬度:</Text> {boundaryPoints.south}°
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <Text strong>东边界经度:</Text> {boundaryPoints.east}°
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <Text strong>西边界经度:</Text> {boundaryPoints.west}°
                      </p>
                      <Divider style={{ margin: '8px 0' }} />
                      <p style={{ margin: '4px 0' }}>
                        <Text strong>覆盖范围:</Text> 约 {(Math.PI * Math.pow(merchant.service_radius, 2)).toFixed(2)} 平方公里
                      </p>
                    </div>
                  }
                />
              </Panel>
            </Collapse>
          </div>
        )}
      </div>
    );
  };

  // 如果数据正在加载，显示加载状态
  if (loading) {
    return (
      <Card title="商户详情" loading={loading}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    );
  }

  // 如果没有找到商户数据
  if (!merchant) {
    return (
      <Card title="商户详情">
        <Empty
          description={
            <span>
              未找到商户信息
              <Button
                type="link"
                onClick={loadMerchantDetail}
                style={{ marginLeft: 8 }}
              >
                重新加载
              </Button>
            </span>
          }
        />
      </Card>
    );
  }

  return (
    <div className="merchant-detail-page">
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/merchants/list')}
              type="link"
            />
            <span>商户详情</span>
          </Space>
        }
        extra={
          <Space>
            {/* 添加刷新按钮 */}
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoading(true);
                loadMerchantDetail().finally(() => {
                  message.success('数据已刷新');
                  setLoading(false);
                });
              }}
            >
              刷新数据
            </Button>
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
          <Col xs={24} sm={24} md={8} lg={7} xl={6}>
            {/* 商户Logo与基本数据 */}
            <Card className="info-card" bordered={false}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <Image
                  src={merchant.logo || 'https://via.placeholder.com/200?text=Logo'}
                  alt={merchant.name}
                  style={{ width: '80%', maxWidth: 180, height: 'auto', borderRadius: 8 }}
                  fallback="https://via.placeholder.com/200?text=无LOGO"
                />
                <Title level={4} style={{ marginTop: 16, marginBottom: 0 }}>
                  {merchant.name}
                  <Badge
                    status={merchant.status === 1 ? 'success' : merchant.status === 0 ? 'processing' : 'error'}
                    text={statusMap[merchant.status]?.text || '未知状态'}
                    style={{ marginLeft: 8 }}
                  />
                </Title>
                <Text type="secondary">
                  ID: {merchant.id}
                </Text>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="评分"
                    value={merchant.rating || stats.avgRating}
                    precision={1}
                    suffix="/5.0"
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="佣金率"
                    value={(merchant.commission_rate || 0) * 100}
                    precision={1}
                    suffix="%"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="余额"
                    value={merchant.balance || 0}
                    precision={2}
                    prefix="￥"
                  />
                </Col>
              </Row>

              <Divider style={{ margin: '16px 0' }} />

              {/* 统计数据 */}
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="销售额"
                    value={stats.totalSales}
                    prefix="￥"
                    groupSeparator=","
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="订单数"
                    value={stats.totalOrders}
                    groupSeparator=","
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="商品数"
                    value={merchant.product_count || 0}
                  />
                </Col>
              </Row>

              {/* 分类标签 */}
              <Divider style={{ margin: '16px 0' }}>分类</Divider>
              <div style={{ textAlign: 'center' }}>
                {merchant.categories?.length > 0 ? (
                  merchant.categories.map(category => (
                    <Tag color="blue" key={category.id} style={{ margin: '0 4px 8px 4px' }}>
                      {category.name}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary">暂无分类</Text>
                )}
              </div>

              {/* 营业时间 */}
              <Divider style={{ margin: '16px 0' }}>营业信息</Divider>
              <p>
                <ClockCircleOutlined style={{ marginRight: 8 }} />
                <Text>营业时间: {merchant.business_hours || '未设置'}</Text>
              </p>
              <p style={{ marginBottom: 0 }}>
                <EnvironmentOutlined style={{ marginRight: 8 }} />
                <Text>地址: {merchant.province}{merchant.city}{merchant.district}{merchant.address}</Text>
              </p>
              {merchant.service_radius && (
                <p style={{ marginTop: 8 }}>
                  <AimOutlined style={{ marginRight: 8 }} />
                  <Text>服务半径: {merchant.service_radius} 公里</Text>
                </p>
              )}
            </Card>
          </Col>

          <Col xs={24} sm={24} md={16} lg={17} xl={18}>
            <Tabs activeKey={activeTab} onChange={handleTabChange} type="card">
              <TabPane tab="基本信息" key="info">
                <Card bordered={false}>
                  <Descriptions
                    title="商户基本信息"
                    bordered
                    column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }}
                  >
                    <Descriptions.Item label="商户名称" span={2}>
                      <Space>
                        <ShopOutlined />
                        {merchant.name}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {merchant.created_at}
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
                    <Descriptions.Item label="营业执照号">
                      {merchant.license_number || '未提供'}
                    </Descriptions.Item>
                    <Descriptions.Item label="营业时间" span={3}>
                      {merchant.business_hours || '未设置'}
                    </Descriptions.Item>
                    {/* 服务半径字段 */}
                    <Descriptions.Item label="服务半径" span={3}>
                      {merchant.service_radius ? (
                        <Space>
                          <Text>{merchant.service_radius} 公里</Text>
                          <Tooltip title="商户提供服务的最大配送范围">
                            <InfoCircleOutlined style={{ color: '#1890ff' }} />
                          </Tooltip>
                        </Space>
                      ) : (
                        '未设置'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="商户描述" span={3}>
                      {merchant.description || '暂无描述'}
                    </Descriptions.Item>
                  </Descriptions>

                  <Divider>位置信息</Divider>
                  {renderMerchantMap()}

                  {merchant.license_image && (
                    <div style={{ marginTop: 24 }}>
                      <Divider orientation="left">营业执照</Divider>
                      <Image
                        src={merchant.license_image}
                        alt="营业执照"
                        style={{ maxWidth: 400 }}
                        fallback="https://via.placeholder.com/400x300?text=无执照图片"
                      />
                    </div>
                  )}
                </Card>
              </TabPane>

              {/* 服务覆盖范围专用标签页 */}
              <TabPane
                tab={<span><AimOutlined /> 服务范围</span>}
                key="service-area"
              >
                <Card bordered={false}>
                  {merchant && merchant.latitude && merchant.longitude && merchant.service_radius ? (
                    <>
                      <Row gutter={[24, 16]}>
                        <Col span={12}>
                          <Statistic
                            title="服务半径"
                            value={merchant.service_radius}
                            suffix="公里"
                            precision={1}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="覆盖面积"
                            value={(Math.PI * Math.pow(merchant.service_radius, 2)).toFixed(2)}
                            suffix="平方公里"
                          />
                        </Col>
                      </Row>

                      <Divider>中心坐标</Divider>

                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic
                            title="纬度"
                            value={merchant.latitude.toFixed(6)}
                            valueStyle={{ fontSize: '18px' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="经度"
                            value={merchant.longitude.toFixed(6)}
                            valueStyle={{ fontSize: '18px' }}
                          />
                        </Col>
                      </Row>

                      // 在服务范围标签页中展示边界坐标<Divider>边界坐标</Divider>

                      {/* 优先使用数据库存储的边界坐标，如果没有则计算 */}
                      {merchant.north_boundary && merchant.south_boundary &&
                        merchant.east_boundary && merchant.west_boundary ? (
                        <Row gutter={[16, 16]}>
                          <Col span={12}>
                            <Card size="small" title="北边界纬度" bordered={false}>
                              {merchant.north_boundary.toFixed(6)}°
                            </Card>
                          </Col>
                          <Col span={12}>
                            <Card size="small" title="南边界纬度" bordered={false}>
                              {merchant.south_boundary.toFixed(6)}°
                            </Card>
                          </Col>
                          <Col span={12}>
                            <Card size="small" title="东边界经度" bordered={false}>
                              {merchant.east_boundary.toFixed(6)}°
                            </Card>
                          </Col>
                          <Col span={12}>
                            <Card size="small" title="西边界经度" bordered={false}>
                              {merchant.west_boundary.toFixed(6)}°
                            </Card>
                          </Col>
                        </Row>
                      ) : (
                        // 如果数据库中没有，则使用前端计算的边界
                        boundaryPoints ? (
                          <Row gutter={[16, 16]}>
                            <Col span={12}>
                              <Card size="small" title="北边界纬度" bordered={false}>
                                {boundaryPoints.north}°
                              </Card>
                            </Col>
                            <Col span={12}>
                              <Card size="small" title="南边界纬度" bordered={false}>
                                {boundaryPoints.south}°
                              </Card>
                            </Col>
                            <Col span={12}>
                              <Card size="small" title="东边界经度" bordered={false}>
                                {boundaryPoints.east}°
                              </Card>
                            </Col>
                            <Col span={12}>
                              <Card size="small" title="西边界经度" bordered={false}>
                                {boundaryPoints.west}°
                              </Card>
                            </Col>
                          </Row>
                        ) : (
                          <Empty description="无法计算边界坐标" />
                        )
                      )}

                      <Divider>覆盖区域说明</Divider>
                      <Alert
                        message="服务半径说明"
                        description={
                          <div>
                            <p>服务半径是指从商户位置出发，能够提供配送服务的最大距离范围。</p>
                            <p>当前设置的服务半径为 {merchant.service_radius} 公里，覆盖面积约 {(Math.PI * Math.pow(merchant.service_radius, 2)).toFixed(2)} 平方公里。</p>
                            <p>在此范围内的用户可以享受商户提供的配送服务。</p>
                          </div>
                        }
                        type="info"
                        showIcon
                      />
                    </>
                  ) : (
                    <Empty description="暂无服务半径信息" />
                  )}
                </Card>
              </TabPane>

              <TabPane
                tab={<span><ShoppingOutlined /> 商品列表</span>}
                key="products"
              >
                <Card bordered={false}>
                  <Row style={{ marginBottom: 16 }}>
                    <Col span={24}>
                      <Space>
                        <Button
                          type="primary"
                          onClick={() => navigate(`/products/create?merchant_id=${id}`)}
                        >
                          添加商品
                        </Button>
                        <Button onClick={loadMerchantProducts}>
                          刷新列表
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                  <Table
                    columns={productColumns}
                    dataSource={products}
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                    locale={{ emptyText: '暂无商品数据' }}
                    size="middle"
                  />
                </Card>
              </TabPane>

              <TabPane
                tab={<span><OrderedListOutlined /> 订单列表</span>}
                key="orders"
              >
                <Card bordered={false}>
                  <Row style={{ marginBottom: 16 }}>
                    <Col span={24}>
                      <Button onClick={loadMerchantOrders}>
                        刷新列表
                      </Button>
                    </Col>
                  </Row>
                  <Table
                    columns={orderColumns}
                    dataSource={orders}
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                    locale={{ emptyText: '暂无订单数据' }}
                    size="middle"
                  />
                </Card>
              </TabPane>

              <TabPane
                tab={<span><PieChartOutlined /> 数据分析</span>}
                key="stats"
              >
                <Card bordered={false}>
                  <Empty
                    description="数据分析功能即将上线"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Button type="primary" disabled>敬请期待</Button>
                  </Empty>
                </Card>
              </TabPane>
            </Tabs>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default MerchantDetail;