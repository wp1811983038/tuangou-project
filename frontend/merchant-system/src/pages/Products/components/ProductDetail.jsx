// src/pages/Products/components/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import { 
  Descriptions, Card, Image, Tag, Divider, Button, Tabs,
  Typography, Space, Row, Col, Carousel, Statistic,
  Timeline, Empty, Table
} from 'antd';
import {
  EditOutlined, ShopOutlined, AppstoreOutlined, 
  TagsOutlined, BarChartOutlined, PictureOutlined,
  InboxOutlined, DollarOutlined, TeamOutlined,
  ClockCircleOutlined, EyeOutlined, LikeOutlined,
  DownOutlined, UpOutlined
} from '@ant-design/icons';
import { formatPrice, formatDateTime } from '../../../utils/format';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const ProductDetail = ({ product, onEdit }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [specDataSource, setSpecDataSource] = useState([]);
  const [expandedDescription, setExpandedDescription] = useState(false);
  
  // 初始化规格表格数据
  useEffect(() => {
    if (product?.specifications) {
      const dataSource = product.specifications.map((spec, index) => ({
        key: spec.id || index,
        name: spec.name,
        value: spec.value,
        price_adjustment: spec.price_adjustment,
        stock: spec.stock
      }));
      setSpecDataSource(dataSource);
    }
  }, [product]);
  
  // 如果没有商品信息，显示空状态
  if (!product) {
    return (
      <Empty description="暂无商品信息" />
    );
  }
  
  // 规格表格列定义
  const specColumns = [
    {
      title: '规格名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '规格值',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '价格调整',
      dataIndex: 'price_adjustment',
      key: 'price_adjustment',
      render: (text) => (
        text > 0 ? `+${formatPrice(text)}` : text < 0 ? `-${formatPrice(Math.abs(text))}` : '无调整'
      )
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
    }
  ];
  
  // 格式化商品描述内容
  const formatDescription = (description) => {
    if (!description) return '暂无商品描述';
    
    // 如果内容太长，且没有展开，则截断
    if (description.length > 200 && !expandedDescription) {
      return (
        <>
          {description.slice(0, 200)}...
          <Button type="link" onClick={() => setExpandedDescription(true)}>
            展开 <DownOutlined />
          </Button>
        </>
      );
    }
    
    // 如果已展开，显示完整内容
    return (
      <>
        {description}
        {description.length > 200 && (
          <Button type="link" onClick={() => setExpandedDescription(false)}>
            收起 <UpOutlined />
          </Button>
        )}
      </>
    );
  };
  
  // 处理HTML内容渲染
  const renderHTML = (htmlContent) => {
    if (!htmlContent) return <Empty description="暂无详细内容" />;
    
    return (
      <div className="product-html-content">
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>
    );
  };
  
  return (
    <div className="product-detail">
      <Card>
        <Row gutter={24}>
          <Col span={10}>
            <div className="product-main-image">
              {product.thumbnail ? (
                <Image
                  src={product.thumbnail}
                  alt={product.name}
                  width="100%"
                  height={250}
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <div className="image-placeholder">
                  <PictureOutlined style={{ fontSize: 48 }} />
                  <div>暂无图片</div>
                </div>
              )}
            </div>
          </Col>
          <Col span={14}>
            <Title level={4}>{product.name}</Title>
            
            <div className="product-tags">
              <Space wrap>
                <Tag color={product.status === 1 ? 'green' : 'red'}>
                  {product.status === 1 ? '在售' : '下架'}
                </Tag>
                {product.is_hot && <Tag color="volcano">热门</Tag>}
                {product.is_new && <Tag color="blue">新品</Tag>}
                {product.is_recommend && <Tag color="purple">推荐</Tag>}
                {product.has_group && <Tag color="green">团购</Tag>}
                {(product.categories || []).map(cat => (
                  <Tag key={cat.id} color="cyan">{cat.name}</Tag>
                ))}
              </Space>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div className="product-price-info">
              <div className="price-item">
                <span className="price-label">现价:</span>
                <span className="price-value primary">{formatPrice(product.current_price)}</span>
              </div>
              {product.original_price > product.current_price && (
                <div className="price-item">
                  <span className="price-label">原价:</span>
                  <span className="price-value original">{formatPrice(product.original_price)}</span>
                </div>
              )}
              {product.group_price && (
                <div className="price-item">
                  <span className="price-label">团购价:</span>
                  <span className="price-value group">{formatPrice(product.group_price)}</span>
                </div>
              )}
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div className="product-brief-info">
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic 
                    title="库存" 
                    value={product.stock} 
                    suffix={product.unit || '件'}
                    valueStyle={product.stock < 10 ? { color: '#cf1322' } : {}}
                  />
                </Col>
                <Col span={8}>
                  <Statistic title="销量" value={product.sales || 0} />
                </Col>
                <Col span={8}>
                  <Statistic title="浏览量" value={product.views || 0} />
                </Col>
              </Row>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div className="product-action">
              <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={onEdit}
              >
                编辑商品
              </Button>
            </div>
          </Col>
        </Row>
      </Card>
      
      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        className="product-detail-tabs"
        style={{ marginTop: 16 }}
      >
        <TabPane 
          tab={
            <span>
              <AppstoreOutlined />
              基本信息
            </span>
          } 
          key="info"
        >
          <Card>
            <Descriptions title="基本信息" bordered column={2} size="middle">
              <Descriptions.Item label="商品ID">{product.id}</Descriptions.Item>
              <Descriptions.Item label="商品名称">{product.name}</Descriptions.Item>
              <Descriptions.Item label="商户ID">{product.merchant_id}</Descriptions.Item>
              <Descriptions.Item label="商户名称">{product.merchant_name}</Descriptions.Item>
              <Descriptions.Item label="商品分类">
                {(product.categories || []).map(cat => (
                  <Tag key={cat.id} color="blue">{cat.name}</Tag>
                ))}
              </Descriptions.Item>
              <Descriptions.Item label="计量单位">{product.unit || '件'}</Descriptions.Item>
              <Descriptions.Item label="商品状态">
                <Tag color={product.status === 1 ? 'green' : 'red'}>
                  {product.status === 1 ? '在售' : '下架'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="商品标签">
                <Space>
                  {product.is_hot && <Tag color="volcano">热门</Tag>}
                  {product.is_new && <Tag color="blue">新品</Tag>}
                  {product.is_recommend && <Tag color="purple">推荐</Tag>}
                  {product.has_group && <Tag color="green">团购</Tag>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDateTime(product.created_at)}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{formatDateTime(product.updated_at)}</Descriptions.Item>
            </Descriptions>
            
            <Divider orientation="left">价格信息</Divider>
            
            <Descriptions bordered column={3} size="middle">
              <Descriptions.Item label="现价">{formatPrice(product.current_price)}</Descriptions.Item>
              <Descriptions.Item label="原价">{formatPrice(product.original_price)}</Descriptions.Item>
              <Descriptions.Item label="团购价">{formatPrice(product.group_price || product.current_price * 0.9)}</Descriptions.Item>
            </Descriptions>
            
            <Divider orientation="left">销售数据</Divider>
            
            <Descriptions bordered column={3} size="middle">
              <Descriptions.Item label="库存">{product.stock} {product.unit || '件'}</Descriptions.Item>
              <Descriptions.Item label="销量">{product.sales || 0}</Descriptions.Item>
              <Descriptions.Item label="浏览量">{product.views || 0}</Descriptions.Item>
            </Descriptions>
            
            <Divider orientation="left">商品描述</Divider>
            
            <div className="product-description">
              <Paragraph>
                {formatDescription(product.description)}
              </Paragraph>
            </div>
          </Card>
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <PictureOutlined />
              商品图片
            </span>
          } 
          key="images"
        >
          <Card>
            {(product.images && product.images.length > 0) ? (
              <div className="product-images">
                <Carousel autoplay>
                  {product.images.map((image, index) => (
                    <div key={image.id || index}>
                      <div className="carousel-item">
                        <Image 
                          src={image.image_url} 
                          alt={`商品图片${index + 1}`}
                          width="100%"
                          height={400}
                          style={{ objectFit: 'contain' }}
                        />
                      </div>
                    </div>
                  ))}
                </Carousel>
                
                <Divider orientation="left">图片列表</Divider>
                
                <div className="image-gallery">
                  <Row gutter={[16, 16]}>
                    {product.images.map((image, index) => (
                      <Col span={6} key={image.id || index}>
                        <Card 
                          hoverable 
                          cover={
                            <Image 
                              src={image.image_url} 
                              alt={`商品图片${index + 1}`}
                              width="100%"
                              height={150}
                              style={{ objectFit: 'cover' }}
                            />
                          }
                        >
                          <div className="image-caption">图片 {index + 1}</div>
                          <div className="image-sort">排序: {image.sort_order || index}</div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              </div>
            ) : (
              <Empty description="暂无商品图片" />
            )}
          </Card>
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <TagsOutlined />
              规格属性
            </span>
          } 
          key="specs"
        >
          <Card>
            {specDataSource.length > 0 ? (
              <Table 
                dataSource={specDataSource} 
                columns={specColumns} 
                pagination={false}
                bordered
                rowKey="key"
              />
            ) : (
              <Empty description="暂无规格信息" />
            )}
          </Card>
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              商品详情
            </span>
          } 
          key="detail"
        >
          <Card>
            <div className="product-detail-content">
              {renderHTML(product.detail)}
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ProductDetail;