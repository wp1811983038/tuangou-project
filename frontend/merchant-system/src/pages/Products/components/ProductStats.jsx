// src/pages/Products/components/ProductStats.jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, Tabs, Statistic, Row, Col, DatePicker,
  Empty, Spin, Alert, Typography, Space, Divider
} from 'antd';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  ShoppingOutlined, EyeOutlined, HeartOutlined,
  DollarOutlined, BarChartOutlined, RiseOutlined,
  ShoppingCartOutlined, TeamOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { useRequest } from '../../../hooks/useRequest';
import { formatPrice } from '../../../utils/format';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

// 颜色配置
const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];
const AREA_COLORS = ['#4285f4', '#55acee', '#1DA1F2', '#7B68EE', '#00BFFF'];

const ProductStats = ({ product }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    moment().subtract(7, 'days'),
    moment()
  ]);
  const [statsData, setStatsData] = useState({
    overview: {
      total_views: 0,
      total_sales: 0,
      total_amount: 0,
      total_favorites: 0,
      avg_price: 0,
      conversion_rate: 0
    },
    trends: {
      views: [],
      sales: [],
      amount: [],
      favorites: []
    },
    conversion: {
      view_to_cart: 0,
      cart_to_order: 0,
      view_to_order: 0
    },
    customerProfile: {
      age_groups: [],
      gender_ratio: [],
      city_distribution: []
    }
  });
  
  const { fetchData } = useRequest();
  
  // 加载统计数据
  useEffect(() => {
    if (!product) return;
    
    const loadStatsData = async () => {
      setLoading(true);
      try {
        // 这里应该调用实际的API获取数据，目前使用模拟数据
        // const response = await fetchData({
        //   url: `/api/v1/products/${product.id}/stats`,
        //   method: 'GET',
        //   params: {
        //     start_date: dateRange[0].format('YYYY-MM-DD'),
        //     end_date: dateRange[1].format('YYYY-MM-DD')
        //   }
        // });
        
        // 生成模拟数据
        const mockData = generateMockData(product, dateRange);
        setStatsData(mockData);
      } catch (error) {
        console.error('加载统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStatsData();
  }, [product, dateRange]);
  
  // 生成模拟数据
  const generateMockData = (product, dateRange) => {
    const days = [];
    const currentDate = moment(dateRange[0]);
    const endDate = moment(dateRange[1]);
    
    // 生成日期序列
    while (currentDate <= endDate) {
      days.push(currentDate.format('YYYY-MM-DD'));
      currentDate.add(1, 'days');
    }
    
    // 生成浏览量趋势数据
    const viewsTrend = days.map(date => {
      const views = Math.floor(Math.random() * 50) + 10;
      return { date, views };
    });
    
    // 生成销量趋势数据
    const salesTrend = days.map(date => {
      const sales = Math.floor(Math.random() * 10) + 1;
      return { date, sales };
    });
    
    // 生成销售额趋势数据
    const amountTrend = days.map(date => {
      const amount = (Math.floor(Math.random() * 10) + 1) * product.current_price;
      return { date, amount };
    });
    
    // 生成收藏趋势数据
    const favoritesTrend = days.map(date => {
      const favorites = Math.floor(Math.random() * 5);
      return { date, favorites };
    });
    
    // 生成综合趋势数据
    const combinedTrend = days.map(date => {
      const views = Math.floor(Math.random() * 50) + 10;
      const sales = Math.floor(Math.random() * 10) + 1;
      const amount = (Math.floor(Math.random() * 10) + 1) * product.current_price;
      const favorites = Math.floor(Math.random() * 5);
      return { date, views, sales, amount, favorites };
    });
    
    // 计算总数据
    const totalViews = viewsTrend.reduce((sum, item) => sum + item.views, 0);
    const totalSales = salesTrend.reduce((sum, item) => sum + item.sales, 0);
    const totalAmount = amountTrend.reduce((sum, item) => sum + item.amount, 0);
    const totalFavorites = favoritesTrend.reduce((sum, item) => sum + item.favorites, 0);
    
    // 生成分布数据
    const ageGroups = [
      { name: '18岁以下', value: Math.floor(Math.random() * 10) + 5 },
      { name: '18-24岁', value: Math.floor(Math.random() * 20) + 15 },
      { name: '25-34岁', value: Math.floor(Math.random() * 30) + 25 },
      { name: '35-44岁', value: Math.floor(Math.random() * 20) + 10 },
      { name: '45岁以上', value: Math.floor(Math.random() * 10) + 5 }
    ];
    
    const genderRatio = [
      { name: '男性', value: Math.floor(Math.random() * 60) + 30 },
      { name: '女性', value: Math.floor(Math.random() * 60) + 30 }
    ];
    
    // 保证百分比总和为100
    const genderTotal = genderRatio.reduce((sum, item) => sum + item.value, 0);
    genderRatio.forEach(item => {
      item.value = Math.round(item.value / genderTotal * 100);
    });
    
    const cityDistribution = [
      { name: '北京', value: Math.floor(Math.random() * 20) + 10 },
      { name: '上海', value: Math.floor(Math.random() * 20) + 10 },
      { name: '广州', value: Math.floor(Math.random() * 15) + 8 },
      { name: '深圳', value: Math.floor(Math.random() * 15) + 8 },
      { name: '其他', value: Math.floor(Math.random() * 30) + 20 }
    ];
    
    // 返回统计数据
    return {
      overview: {
        total_views: totalViews,
        total_sales: totalSales,
        total_amount: totalAmount,
        total_favorites: totalFavorites,
        avg_price: totalSales > 0 ? totalAmount / totalSales : product.current_price,
        conversion_rate: totalViews > 0 ? (totalSales / totalViews * 100).toFixed(2) : 0
      },
      trends: {
        views: viewsTrend,
        sales: salesTrend,
        amount: amountTrend,
        favorites: favoritesTrend,
        combined: combinedTrend
      },
      conversion: {
        view_to_cart: Math.floor(Math.random() * 20) + 5,
        cart_to_order: Math.floor(Math.random() * 50) + 30,
        view_to_order: Math.floor(Math.random() * 10) + 2
      },
      customerProfile: {
        age_groups: ageGroups,
        gender_ratio: genderRatio,
        city_distribution: cityDistribution
      }
    };
  };
  
  // 处理日期范围变化
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };
  
  // 如果没有商品数据，显示空状态
  if (!product) {
    return <Empty description="暂无商品数据" />;
  }
  
  // 自定义tooltip格式化
  const formatTooltipValue = (value, name) => {
    if (name === 'amount') return formatPrice(value);
    return value;
  };
  
  return (
    <div className="product-stats">
      <Card>
        <div className="stats-header">
          <Space direction="vertical" size="small" style={{ marginBottom: 16 }}>
            <Title level={4}>{product.name}</Title>
            <Text type="secondary">商品统计分析</Text>
          </Space>
          
          <RangePicker 
            value={dateRange}
            onChange={handleDateRangeChange}
            allowClear={false}
          />
        </div>
        
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                概览
              </span>
            }
            key="overview"
          >
            {loading ? (
              <div className="loading-container">
                <Spin size="large" />
              </div>
            ) : (
              <div className="stats-overview">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Card className="stats-card">
                      <Statistic 
                        title="总浏览量"
                        value={statsData.overview.total_views}
                        prefix={<EyeOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Card className="stats-card">
                      <Statistic 
                        title="总销量"
                        value={statsData.overview.total_sales}
                        suffix={product.unit || '件'}
                        prefix={<ShoppingOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Card className="stats-card">
                      <Statistic 
                        title="总销售额"
                        value={formatPrice(statsData.overview.total_amount)}
                        prefix={<DollarOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Card className="stats-card">
                      <Statistic 
                        title="总收藏数"
                        value={statsData.overview.total_favorites}
                        prefix={<HeartOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>
                
                <Divider orientation="left">转化率数据</Divider>
                
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <Card className="stats-card">
                      <Statistic 
                        title="浏览-加购转化率"
                        value={statsData.conversion.view_to_cart}
                        suffix="%"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card className="stats-card">
                      <Statistic 
                        title="加购-下单转化率"
                        value={statsData.conversion.cart_to_order}
                        suffix="%"
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card className="stats-card">
                      <Statistic 
                        title="总体转化率"
                        value={statsData.conversion.view_to_order}
                        suffix="%"
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                </Row>
                
                <Divider orientation="left">趋势概览</Divider>
                
                <Card title="数据趋势" className="chart-card">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart 
                      data={statsData.trends.combined} 
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={formatTooltipValue} />
                      <Legend />
                      <Line type="monotone" dataKey="views" name="浏览量" stroke="#1890ff" />
                      <Line type="monotone" dataKey="sales" name="销量" stroke="#52c41a" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}
          </TabPane>
          
          <TabPane
            tab={
              <span>
                <RiseOutlined />
                趋势分析
              </span>
            }
            key="trends"
          >
            {loading ? (
              <div className="loading-container">
                <Spin size="large" />
              </div>
            ) : (
              <div className="trends-analysis">
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Card title="浏览量趋势" className="chart-card">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                          data={statsData.trends.views}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="views" 
                            name="浏览量" 
                            stroke="#1890ff" 
                            fill="#1890ff" 
                            fillOpacity={0.3} 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Card title="销量趋势" className="chart-card">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={statsData.trends.sales}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="sales" 
                            name="销量" 
                            fill="#52c41a" 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Card title="销售额趋势" className="chart-card">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={statsData.trends.amount}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value) => formatPrice(value)}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="amount" 
                            name="销售额" 
                            stroke="#f5222d" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  
                  <Col span={24}>
                    <Card title="收藏趋势" className="chart-card">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={statsData.trends.favorites}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="favorites" 
                            name="收藏数" 
                            fill="#722ed1" 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>
              </div>
            )}
          </TabPane>
          
          <TabPane
            tab={
              <span>
                <TeamOutlined />
                客户分析
              </span>
            }
            key="customers"
          >
            {loading ? (
              <div className="loading-container">
                <Spin size="large" />
              </div>
            ) : (
              <div className="customer-analysis">
                <Alert 
                  message="数据说明" 
                  description="以下数据为基于采购此商品的客户分析，帮助您了解客户画像。" 
                  type="info" 
                  showIcon 
                  style={{ marginBottom: 16 }}
                />
                
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card title="年龄分布" className="chart-card">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statsData.customerProfile.age_groups}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {statsData.customerProfile.age_groups.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Card title="性别比例" className="chart-card">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statsData.customerProfile.gender_ratio}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill="#1890ff" />
                            <Cell fill="#ff6b81" />
                          </Pie>
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  
                  <Col span={24}>
                    <Card title="城市分布" className="chart-card">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={statsData.customerProfile.city_distribution}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar 
                            dataKey="value" 
                            name="占比" 
                            fill="#13c2c2" 
                            barSize={30}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>
              </div>
            )}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default ProductStats;