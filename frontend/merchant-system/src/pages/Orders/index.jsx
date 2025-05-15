// src/pages/Orders/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Button, Input, Space, Tag, Tooltip, 
  message, Select, Row, Col, Badge, Drawer, Typography,
  Descriptions, Steps, Timeline, Divider, List, Statistic
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, EyeOutlined, 
  PrinterOutlined, SendOutlined, CheckOutlined, 
  CloseOutlined, ClockCircleOutlined, FileDoneOutlined
} from '@ant-design/icons';
import { useRequest } from '../../hooks/useRequest';
import { formatPrice } from '../../utils/format';
import moment from 'moment';
import './index.less';

const { Option } = Select;
const { Text, Title } = Typography;
const { Step } = Steps;

const OrderList = () => {
  const [orderList, setOrderList] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    status: undefined,
    order_type: undefined,
    start_date: undefined,
    end_date: undefined
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  const { fetchData } = useRequest();
  
  // 加载订单列表
  const loadOrders = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        page: pagination.current,
        page_size: pagination.pageSize,
        ...searchParams,
        ...params
      };
      
      // 移除未定义的参数
      Object.keys(queryParams).forEach(key => 
        queryParams[key] === undefined && delete queryParams[key]
      );
      
      // 构建查询字符串
      const queryString = Object.keys(queryParams)
        .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
        .join('&');
      
      const res = await fetchData({
        url: `/api/v1/orders/merchant?${queryString}`,
        method: 'GET'
      });
      
      if (res?.data) {
        setOrderList(res.data.items || []);
        setPagination({
          ...pagination,
          current: res.data.page,
          pageSize: res.data.page_size,
          total: res.data.total
        });
      }
    } catch (error) {
      console.error('加载订单列表失败:', error);
      message.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [fetchData, pagination, searchParams]);
  
  // 初始加载
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
  
  // 处理表格翻页
  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
    loadOrders({
      page: pagination.current,
      page_size: pagination.pageSize,
      sort_by: sorter.field,
      sort_order: sorter.order === 'descend' ? 'desc' : 'asc'
    });
  };
  
  // 处理搜索
  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    loadOrders({ page: 1 });
  };
  
  // 处理重置搜索
  const handleReset = () => {
    setSearchParams({
      keyword: '',
      status: undefined,
      order_type: undefined,
      start_date: undefined,
      end_date: undefined
    });
    setPagination({ ...pagination, current: 1 });
    loadOrders({ 
      page: 1,
      keyword: '',
      status: undefined,
      order_type: undefined,
      start_date: undefined,
      end_date: undefined
    });
  };
  
  // 处理查看订单详情
  const handleViewOrder = async (orderId) => {
    try {
      setLoading(true);
      const res = await fetchData({
        url: `/api/v1/orders/${orderId}`,
        method: 'GET'
      });
      
      if (res) {
        setSelectedOrder(res);
        setDrawerVisible(true);
      }
    } catch (error) {
      console.error('获取订单详情失败:', error);
      message.error('获取订单详情失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理订单发货
  const handleShipOrder = async (orderId) => {
    try {
      await fetchData({
        url: `/api/v1/orders/${orderId}/ship`,
        method: 'POST',
        data: {}
      });
      message.success('订单发货成功');
      loadOrders();
    } catch (error) {
      console.error('订单发货失败:', error);
      message.error('订单发货失败');
    }
  };
  
  // 处理订单完成
  const handleCompleteOrder = async (orderId) => {
    try {
      await fetchData({
        url: `/api/v1/orders/${orderId}/complete`,
        method: 'POST'
      });
      message.success('订单已完成');
      loadOrders();
    } catch (error) {
      console.error('完成订单失败:', error);
      message.error('完成订单失败');
    }
  };
  
  // 处理取消订单
  const handleCancelOrder = async (orderId) => {
    try {
      await fetchData({
        url: `/api/v1/orders/${orderId}/cancel`,
        method: 'POST'
      });
      message.success('订单已取消');
      loadOrders();
    } catch (error) {
      console.error('取消订单失败:', error);
      message.error('取消订单失败');
    }
  };
  
  // 订单状态映射
  const getOrderStatus = (status) => {
    const statusMap = {
      0: { text: '待支付', color: 'warning', step: 0 },
      1: { text: '已支付', color: 'processing', step: 1 },
      2: { text: '已发货', color: 'processing', step: 2 },
      3: { text: '已完成', color: 'success', step: 3 },
      4: { text: '已取消', color: 'error', step: -1 },
      5: { text: '已退款', color: 'error', step: -1 }
    };
    return statusMap[status] || { text: '未知', color: 'default', step: 0 };
  };
  
  // 订单类型映射
  const getOrderType = (type) => {
    const typeMap = {
      'normal': { text: '普通订单', color: 'default' },
      'group': { text: '团购订单', color: 'blue' },
      'pickup': { text: '自提订单', color: 'green' },
      'delivery': { text: '配送订单', color: 'purple' }
    };
    return typeMap[type] || { text: '未知', color: 'default' };
  };
  
  // 渲染订单状态步骤条
  const renderOrderSteps = (status) => {
    const orderStatus = getOrderStatus(status);
    return (
      <Steps 
        current={orderStatus.step} 
        direction="horizontal"
        size="small"
        status={status === 4 || status === 5 ? 'error' : 'process'}
      >
        <Step title="待支付" />
        <Step title="已支付" />
        <Step title="已发货" />
        <Step title="已完成" />
      </Steps>
    );
  };
  
  // 渲染订单时间轴
  const renderOrderTimeline = (order) => {
    if (!order) return null;
    
    const timelineItems = [];
    
    // 创建时间
    timelineItems.push({
      color: 'blue',
      children: (
        <div>
          <p><Text strong>订单创建</Text></p>
          <p><Text type="secondary">{moment(order.created_at).format('YYYY-MM-DD HH:mm:ss')}</Text></p>
        </div>
      )
    });
    
    // 支付时间
    if (order.status >= 1) {
      timelineItems.push({
        color: 'green',
        children: (
          <div>
            <p><Text strong>订单支付</Text></p>
            <p><Text type="secondary">{moment(order.paid_at).format('YYYY-MM-DD HH:mm:ss')}</Text></p>
          </div>
        )
      });
    }
    
    // 发货时间
    if (order.status >= 2) {
      timelineItems.push({
        color: 'green',
        children: (
          <div>
            <p><Text strong>订单发货</Text></p>
            <p><Text type="secondary">{moment(order.ship_at).format('YYYY-MM-DD HH:mm:ss')}</Text></p>
          </div>
        )
      });
    }
    
    // 完成时间
    if (order.status >= 3) {
      timelineItems.push({
        color: 'green',
        children: (
          <div>
            <p><Text strong>订单完成</Text></p>
            <p><Text type="secondary">{moment(order.complete_at).format('YYYY-MM-DD HH:mm:ss')}</Text></p>
          </div>
        )
      });
    }
    
    // 取消/退款时间
    if (order.status === 4) {
      timelineItems.push({
        color: 'red',
        children: (
          <div>
            <p><Text strong>订单取消</Text></p>
            <p><Text type="secondary">{moment(order.cancel_at).format('YYYY-MM-DD HH:mm:ss')}</Text></p>
          </div>
        )
      });
    } else if (order.status === 5) {
      timelineItems.push({
        color: 'red',
        children: (
          <div>
            <p><Text strong>订单退款</Text></p>
            <p><Text type="secondary">{moment(order.refund_at).format('YYYY-MM-DD HH:mm:ss')}</Text></p>
          </div>
        )
      });
    }
    
    return <Timeline items={timelineItems} />;
  };
  
  // 表格列配置
  const columns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      ellipsis: true,
      width: 180,
    },
    {
      title: '客户信息',
      key: 'user',
      width: 180,
      render: (_, record) => (
        <div>
          <div>{record.user?.nickname || '匿名用户'}</div>
          {record.user?.phone && (
            <div className="user-phone">{record.user.phone}</div>
          )}
        </div>
      )
    },
    {
      title: '订单金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      sorter: true,
      render: (text) => <span className="order-amount">{formatPrice(text)}</span>
    },
    {
      title: '订单类型',
      dataIndex: 'order_type',
      key: 'order_type',
      width: 120,
      render: (type) => {
        const typeInfo = getOrderType(type);
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      }
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusInfo = getOrderStatus(status);
        return (
          <Badge 
            status={statusInfo.color} 
            text={statusInfo.text}
          />
        );
      }
    },
    {
      title: '下单时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: true,
      render: (text) => moment(text).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewOrder(record.id)}
            />
          </Tooltip>
          
          {record.status === 1 && (
            <Tooltip title="发货">
              <Button 
                type="text" 
                size="small" 
                icon={<SendOutlined />} 
                onClick={() => handleShipOrder(record.id)}
              />
            </Tooltip>
          )}
          
          {record.status === 2 && (
            <Tooltip title="完成订单">
              <Button 
                type="text" 
                size="small" 
                icon={<CheckOutlined />} 
                onClick={() => handleCompleteOrder(record.id)}
              />
            </Tooltip>
          )}
          
          {record.status === 0 && (
            <Tooltip title="取消订单">
              <Button 
                type="text" 
                size="small" 
                danger
                icon={<CloseOutlined />} 
                onClick={() => handleCancelOrder(record.id)}
              />
            </Tooltip>
          )}
          
          <Tooltip title="打印订单">
            <Button 
              type="text" 
              size="small" 
              icon={<PrinterOutlined />} 
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
  
  return (
    <div className="order-list-page">
      <Card className="search-card">
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6} lg={6}>
            <Input
              placeholder="订单号/客户姓名/电话"
              value={searchParams.keyword}
              onChange={(e) => setSearchParams({ ...searchParams, keyword: e.target.value })}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={6}>
            <Select
              placeholder="订单状态"
              value={searchParams.status}
              onChange={(value) => setSearchParams({ ...searchParams, status: value })}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value={0}>待支付</Option>
              <Option value={1}>已支付</Option>
              <Option value={2}>已发货</Option>
              <Option value={3}>已完成</Option>
              <Option value={4}>已取消</Option>
              <Option value={5}>已退款</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6}>
            <Select
              placeholder="订单类型"
              value={searchParams.order_type}
              onChange={(value) => setSearchParams({ ...searchParams, order_type: value })}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="normal">普通订单</Option>
              <Option value="group">团购订单</Option>
              <Option value="pickup">自提订单</Option>
              <Option value="delivery">配送订单</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} className="search-buttons">
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button onClick={handleReset} icon={<ReloadOutlined />}>
              重置
            </Button>
          </Col>
        </Row>
      </Card>
      
      <Card 
        title="订单列表" 
        className="order-table-card"
        extra={
          <div className="card-extra">
            <div className="order-stat">
              <span>今日订单: </span>
              <span className="order-count">23</span>
            </div>
            <div className="order-stat">
              <span>今日销售: </span>
              <span className="order-amount">¥1,234.56</span>
            </div>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={orderList}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1100 }}
        />
      </Card>
      
      {/* 订单详情抽屉 */}
      <Drawer
        title="订单详情"
        placement="right"
        width={640}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <div className="drawer-footer">
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>
                关闭
              </Button>
              <Button type="primary" icon={<PrinterOutlined />}>
                打印订单
              </Button>
            </Space>
          </div>
        }
      >
        {selectedOrder && (
          <div className="order-detail">
            <div className="order-header">
              <Title level={4}>订单 #{selectedOrder.order_no}</Title>
              <div className="order-status">
                <Badge 
                  status={getOrderStatus(selectedOrder.status).color} 
                  text={getOrderStatus(selectedOrder.status).text}
                />
              </div>
            </div>
            
            <div className="order-steps">
              {renderOrderSteps(selectedOrder.status)}
            </div>
            
            <Divider />
            
            <div className="order-section">
              <Title level={5}>基本信息</Title>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="订单编号">{selectedOrder.order_no}</Descriptions.Item>
                <Descriptions.Item label="订单类型">{getOrderType(selectedOrder.order_type).text}</Descriptions.Item>
                <Descriptions.Item label="下单时间">{moment(selectedOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                <Descriptions.Item label="订单状态">{getOrderStatus(selectedOrder.status).text}</Descriptions.Item>
                {selectedOrder.remark && (
                  <Descriptions.Item label="订单备注">{selectedOrder.remark}</Descriptions.Item>
                )}
              </Descriptions>
            </div>
            
            <div className="order-section">
              <Title level={5}>客户信息</Title>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="客户姓名">{selectedOrder.user?.nickname || '匿名用户'}</Descriptions.Item>
                {selectedOrder.user?.phone && (
                  <Descriptions.Item label="联系电话">{selectedOrder.user.phone}</Descriptions.Item>
                )}
                {selectedOrder.address && (
                  <Descriptions.Item label="收货地址">
                    {`${selectedOrder.address.province}${selectedOrder.address.city}${selectedOrder.address.district}${selectedOrder.address.detail}`}
                  </Descriptions.Item>
                )}
                {selectedOrder.address && (
                  <Descriptions.Item label="收货人">
                    {selectedOrder.address.recipient} {selectedOrder.address.phone}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
            
            <div className="order-section">
              <Title level={5}>商品清单</Title>
              <List
                bordered
                dataSource={selectedOrder.items || []}
                renderItem={(item) => (
                  <List.Item>
                    <div className="order-item">
                      <div className="item-image">
                        <img src={item.product_image} alt={item.product_name} />
                      </div>
                      <div className="item-info">
                        <div className="item-name">{item.product_name}</div>
                        {item.product_spec && (
                          <div className="item-spec">{item.product_spec}</div>
                        )}
                      </div>
                      <div className="item-price">¥{item.price.toFixed(2)}</div>
                      <div className="item-quantity">x{item.quantity}</div>
                      <div className="item-total">¥{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  </List.Item>
                )}
              />
            </div>
            
            <div className="order-section">
              <Title level={5}>费用信息</Title>
              <div className="order-amount-info">
                <div className="amount-row">
                  <span className="amount-label">商品总额:</span>
                  <span className="amount-value">¥{selectedOrder.goods_amount.toFixed(2)}</span>
                </div>
                {selectedOrder.delivery_fee > 0 && (
                  <div className="amount-row">
                    <span className="amount-label">配送费:</span>
                    <span className="amount-value">¥{selectedOrder.delivery_fee.toFixed(2)}</span>
                  </div>
                )}
                {selectedOrder.discount_amount > 0 && (
                  <div className="amount-row">
                    <span className="amount-label">优惠金额:</span>
                    <span className="amount-value">-¥{selectedOrder.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="amount-row total">
                  <span className="amount-label">订单总额:</span>
                  <span className="amount-value">¥{selectedOrder.total_amount.toFixed(2)}</span>
                </div>
                <div className="amount-row">
                  <span className="amount-label">支付方式:</span>
                  <span className="amount-value">{selectedOrder.payment_method === 'wechat' ? '微信支付' : '未知'}</span>
                </div>
              </div>
            </div>
            
            <div className="order-section">
              <Title level={5}>订单进度</Title>
              {renderOrderTimeline(selectedOrder)}
            </div>
            
            <div className="order-actions">
              <Space>
                {selectedOrder.status === 1 && (
                  <Button 
                    type="primary" 
                    icon={<SendOutlined />}
                    onClick={() => {
                      handleShipOrder(selectedOrder.id);
                      setDrawerVisible(false);
                    }}
                  >
                    发货
                  </Button>
                )}
                {selectedOrder.status === 2 && (
                  <Button 
                    type="primary" 
                    icon={<CheckOutlined />}
                    onClick={() => {
                      handleCompleteOrder(selectedOrder.id);
                      setDrawerVisible(false);
                    }}
                  >
                    完成订单
                  </Button>
                )}
                {selectedOrder.status === 0 && (
                  <Button 
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => {
                      handleCancelOrder(selectedOrder.id);
                      setDrawerVisible(false);
                    }}
                  >
                    取消订单
                  </Button>
                )}
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default OrderList;