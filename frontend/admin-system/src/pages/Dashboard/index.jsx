import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import {
  UserOutlined,
  ShopOutlined,
  ShoppingOutlined,
  OrderedListOutlined
} from '@ant-design/icons';

// 使用内联样式确保显示正常
const cardStyle = {
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  borderRadius: '8px',
  marginBottom: '16px'
};

const statisticTitleStyle = {
  fontSize: '14px',
  color: 'rgba(0,0,0,0.65)'
};

const statisticContentStyle = {
  fontSize: '24px',
  fontWeight: 500
};

const Dashboard = () => {
  return (
    <div style={{ padding: '16px' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span style={statisticTitleStyle}>用户总数</span>}
              value={8846}
              prefix={<UserOutlined />}
              valueStyle={{ ...statisticContentStyle, color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span style={statisticTitleStyle}>商户数量</span>}
              value={93}
              prefix={<ShopOutlined />}
              valueStyle={{ ...statisticContentStyle, color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span style={statisticTitleStyle}>商品总数</span>}
              value={1258}
              prefix={<ShoppingOutlined />}
              valueStyle={{ ...statisticContentStyle, color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span style={statisticTitleStyle}>订单总数</span>}
              value={6782}
              prefix={<OrderedListOutlined />}
              valueStyle={{ ...statisticContentStyle, color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Card 
        title="欢迎使用社区团购管理系统" 
        style={{ marginTop: '16px', borderRadius: '8px' }}
      >
        <p>这里是系统仪表盘页面，您可以查看系统的重要数据和统计信息。</p>
        <p>未来这里将展示更多数据图表和关键指标。</p>
      </Card>
    </div>
  );
};

export default Dashboard;