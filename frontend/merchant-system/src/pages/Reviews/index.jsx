// src/pages/Reviews/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Button, Input, Space, Rate, Tooltip, 
  message, Select, Row, Col, Badge, Modal, Form, 
  Avatar, Tag, Image, Typography, List, Divider, 
  Comment, Tabs
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, EyeOutlined, 
  MessageOutlined, CloseOutlined, UserOutlined,
  StarOutlined, LikeOutlined, StarFilled
} from '@ant-design/icons';
import { useRequest } from '../../hooks/useRequest';
import moment from 'moment';
import './index.less';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;
const { TabPane } = Tabs;

const ReviewList = () => {
  const [reviewList, setReviewList] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    product_id: undefined,
    status: undefined,
    min_rating: undefined,
    max_rating: undefined,
    has_reply: undefined,
    has_image: undefined,
  });
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [replyForm] = Form.useForm();
  const [reviewStats, setReviewStats] = useState({
    total_count: 0,
    avg_rating: 5.0,
    rating_counts: {},
    image_count: 0,
    good_count: 0,
    good_rate: 100
  });
  
  const { fetchData } = useRequest();
  
  // 加载商品列表
  const loadProducts = useCallback(async () => {
    try {
      const res = await fetchData({
        url: '/api/v1/products?status=1&page_size=100',
        method: 'GET'
      });
      if (res?.data?.items) {
        setProducts(res.data.items);
      }
    } catch (error) {
      console.error('加载商品列表失败:', error);
      message.error('加载商品列表失败');
    }
  }, [fetchData]);
  
  // 加载统计数据
  const loadReviewStats = useCallback(async (productId) => {
    if (!productId) {
      setReviewStats({
        total_count: 0,
        avg_rating: 5.0,
        rating_counts: {},
        image_count: 0,
        good_count: 0,
        good_rate: 100
      });
      return;
    }
    
    try {
      const res = await fetchData({
        url: `/api/v1/reviews/product/${productId}/stats`,
        method: 'GET'
      });
      if (res) {
        setReviewStats(res);
      }
    } catch (error) {
      console.error('加载评价统计数据失败:', error);
    }
  }, [fetchData]);
  
  // 加载评价列表
  const loadReviews = useCallback(async (params = {}) => {
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
        url: `/api/v1/reviews?${queryString}`,
        method: 'GET'
      });
      
      if (res?.data) {
        setReviewList(res.data.items || []);
        setPagination({
          ...pagination,
          current: res.data.page,
          pageSize: res.data.page_size,
          total: res.data.total
        });
      }
    } catch (error) {
      console.error('加载评价列表失败:', error);
      message.error('加载评价列表失败');
    } finally {
      setLoading(false);
    }
  }, [fetchData, pagination, searchParams]);
  
  // 初始加载
  useEffect(() => {
    loadProducts();
    loadReviews();
  }, [loadProducts, loadReviews]);
  
  // 处理表格翻页
  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
    loadReviews({
      page: pagination.current,
      page_size: pagination.pageSize,
      sort_by: sorter.field,
      sort_order: sorter.order === 'descend' ? 'desc' : 'asc'
    });
  };
  
  // 处理搜索
  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    loadReviews({ page: 1 });
    loadReviewStats(searchParams.product_id);
  };
  
  // 处理重置搜索
  const handleReset = () => {
    setSearchParams({
      keyword: '',
      product_id: undefined,
      status: undefined,
      min_rating: undefined,
      max_rating: undefined,
      has_reply: undefined,
      has_image: undefined,
    });
    setPagination({ ...pagination, current: 1 });
    loadReviews({ page: 1 });
    loadReviewStats(undefined);
  };
  
  // 处理查看评价详情
  const handleViewReview = (review) => {
    setSelectedReview(review);
    setDetailModalVisible(true);
  };
  
  // 处理回复评价
  const handleReplyReview = (review) => {
    setSelectedReview(review);
    replyForm.setFieldsValue({
      reply_content: review.reply_content || ''
    });
    setReplyModalVisible(true);
  };
  
  // 提交回复
  const handleSubmitReply = async () => {
    try {
      const values = await replyForm.validateFields();
      
      await fetchData({
        url: `/api/v1/reviews/${selectedReview.id}/reply`,
        method: 'POST',
        data: {
          review_id: selectedReview.id,
          reply_content: values.reply_content
        }
      });
      
      message.success('回复成功');
      setReplyModalVisible(false);
      loadReviews();
    } catch (error) {
      console.error('回复失败:', error);
      message.error('回复失败');
    }
  };
  
  // 评价状态映射
  const getReviewStatus = (status) => {
    const statusMap = {
      0: { text: '待审核', color: 'warning' },
      1: { text: '已审核', color: 'success' },
      2: { text: '已拒绝', color: 'error' }
    };
    return statusMap[status] || { text: '未知', color: 'default' };
  };
  
  // 表格列配置
  const columns = [
    {
      title: '商品',
      key: 'product',
      width: 240,
      render: (_, record) => (
        <div className="product-cell">
          <div className="product-image">
            <img src={record.product_image} alt={record.product_name} />
          </div>
          <div className="product-info">
            <div className="product-name">{record.product_name}</div>
            <div className="product-order">订单号: {record.order_id}</div>
          </div>
        </div>
      )
    },
    {
      title: '评价内容',
      key: 'content',
      ellipsis: true,
      render: (_, record) => (
        <div className="review-content">
          <div className="review-rating">
            <Rate disabled value={record.rating} />
            <span className="review-time">{moment(record.created_at).format('YYYY-MM-DD')}</span>
          </div>
          <div className="review-text">{record.content}</div>
          {record.images && record.images.length > 0 && (
            <div className="review-images">
              {record.images.slice(0, 3).map((img, index) => (
                <div key={index} className="image-item">
                  <img src={img.image_url} alt={`图片${index+1}`} />
                </div>
              ))}
              {record.images.length > 3 && (
                <div className="image-more">+{record.images.length - 3}</div>
              )}
            </div>
          )}
          {record.reply_content && (
            <div className="review-reply">
              <Text type="secondary">商家回复: </Text>
              {record.reply_content}
            </div>
          )}
        </div>
      )
    },
    {
      title: '评价者',
      dataIndex: 'user',
      key: 'user',
      width: 150,
      render: (user, record) => (
        <div className="user-info">
          <Avatar
            src={user?.avatar_url}
            icon={<UserOutlined />}
            size="small"
          />
          <span className="user-name">
            {record.is_anonymous ? '匿名用户' : (user?.nickname || '未知用户')}
          </span>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusInfo = getReviewStatus(status);
        return (
          <Badge 
            status={statusInfo.color} 
            text={statusInfo.text}
          />
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewReview(record)}
            />
          </Tooltip>
          
          <Tooltip title="回复评价">
            <Button 
              type="text" 
              size="small" 
              icon={<MessageOutlined />} 
              onClick={() => handleReplyReview(record)}
              disabled={record.status !== 1}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
  
  return (
    <div className="review-list-page">
      <Card className="search-card">
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6} lg={6}>
            <Input
              placeholder="评价内容"
              value={searchParams.keyword}
              onChange={(e) => setSearchParams({ ...searchParams, keyword: e.target.value })}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={6}>
            <Select
              placeholder="选择商品"
              value={searchParams.product_id}
              onChange={(value) => {
                setSearchParams({ ...searchParams, product_id: value });
                loadReviewStats(value);
              }}
              style={{ width: '100%' }}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {products.map(product => (
                <Option key={product.id} value={product.id}>{product.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6}>
            <Select
              placeholder="评分筛选"
              value={searchParams.min_rating}
              onChange={(value) => setSearchParams({ 
                ...searchParams, 
                min_rating: value,
                max_rating: value
              })}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value={5}>5星</Option>
              <Option value={4}>4星</Option>
              <Option value={3}>3星</Option>
              <Option value={2}>2星</Option>
              <Option value={1}>1星</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6}>
            <Select
              placeholder="评价状态"
              value={searchParams.status}
              onChange={(value) => setSearchParams({ ...searchParams, status: value })}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value={0}>待审核</Option>
              <Option value={1}>已审核</Option>
              <Option value={2}>已拒绝</Option>
            </Select>
          </Col>
          
          <Col xs={24} sm={12} md={6} lg={6}>
            <Select
              placeholder="有无回复"
              value={searchParams.has_reply}
              onChange={(value) => setSearchParams({ ...searchParams, has_reply: value })}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value={true}>已回复</Option>
              <Option value={false}>未回复</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6}>
            <Select
              placeholder="有无图片"
              value={searchParams.has_image}
              onChange={(value) => setSearchParams({ ...searchParams, has_image: value })}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value={true}>有图评价</Option>
              <Option value={false}>无图评价</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12} className="search-buttons">
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button onClick={handleReset} icon={<ReloadOutlined />}>
              重置
            </Button>
          </Col>
        </Row>
      </Card>
      
      {searchParams.product_id && reviewStats.total_count > 0 && (
        <Card className="stats-card">
          <div className="stats-header">
            <div className="rating-overview">
              <div className="rating-overall">
                <div className="rating-score">{reviewStats.avg_rating.toFixed(1)}</div>
                <div className="rating-stars">
                  <Rate disabled value={reviewStats.avg_rating} />
                </div>
              </div>
              <div className="rating-detail">
                {[5, 4, 3, 2, 1].map(star => (
                  <div key={star} className="rating-row">
                    <span className="star-label">{star}星</span>
                    <div className="progress-bar">
                      <div 
                        className="progress-inner" 
                        style={{ 
                          width: `${reviewStats.total_count > 0 
                            ? (reviewStats.rating_counts[star] || 0) / reviewStats.total_count * 100 
                            : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="count">{reviewStats.rating_counts[star] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="stats-summary">
              <div className="stat-item">
                <div className="stat-value">{reviewStats.total_count}</div>
                <div className="stat-label">总评价数</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{`${reviewStats.good_rate.toFixed(0)}%`}</div>
                <div className="stat-label">好评率</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{reviewStats.image_count}</div>
                <div className="stat-label">有图评价</div>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      <Card 
        title="评价列表" 
        className="review-table-card"
      >
        <Table
          columns={columns}
          dataSource={reviewList}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          expandable={{
            expandedRowRender: record => (
              <div className="expanded-review">
                <div className="expanded-content">
                  <Text type="secondary">评价内容: </Text>
                  <div>{record.content}</div>
                </div>
                {record.reply_content && (
                  <div className="expanded-reply">
                    <Text type="secondary">商家回复: </Text>
                    <div>{record.reply_content}</div>
                    <div className="reply-time">
                      {moment(record.reply_time).format('YYYY-MM-DD HH:mm')}
                    </div>
                  </div>
                )}
              </div>
            ),
          }}
        />
      </Card>
      
      {/* 回复评价弹窗 */}
      <Modal
        title="回复评价"
        open={replyModalVisible}
        onCancel={() => setReplyModalVisible(false)}
        onOk={handleSubmitReply}
        okText="提交"
        cancelText="取消"
      >
        {selectedReview && (
          <div className="reply-modal-content">
            <div className="review-info">
              <div className="review-user">
                <Avatar
                  src={selectedReview.user?.avatar_url}
                  icon={<UserOutlined />}
                  size="small"
                />
                <span className="user-name">
                  {selectedReview.is_anonymous ? '匿名用户' : (selectedReview.user?.nickname || '未知用户')}
                </span>
                <Rate disabled value={selectedReview.rating} />
                <span className="review-time">
                  {moment(selectedReview.created_at).format('YYYY-MM-DD')}
                </span>
              </div>
              <div className="review-text">{selectedReview.content}</div>
              {selectedReview.images && selectedReview.images.length > 0 && (
                <div className="image-list">
                  {selectedReview.images.map((img, index) => (
                    <div key={index} className="image-item">
                      <img src={img.image_url} alt={`图片${index+1}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Divider dashed />
            
            <Form form={replyForm}>
              <Form.Item
                name="reply_content"
                rules={[{ required: true, message: '请输入回复内容' }]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="请输入回复内容，不超过200字"
                  maxLength={200}
                  showCount
                />
              </Form.Item>
            </Form>
            
            <div className="reply-tips">
              <Text type="secondary">
                * 回复评价将直接显示给用户，请注意语言得体，不要包含敏感信息
              </Text>
            </div>
          </div>
        )}
      </Modal>
      
      {/* 评价详情弹窗 */}
      <Modal
        title="评价详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="reply"
            type="primary"
            onClick={() => {
              setDetailModalVisible(false);
              handleReplyReview(selectedReview);
            }}
            disabled={selectedReview?.status !== 1}
          >
            回复评价
          </Button>
        ]}
        width={700}
      >
        {selectedReview && (
          <div className="review-detail-content">
            <div className="review-product">
              <div className="product-image">
                <img src={selectedReview.product_image} alt={selectedReview.product_name} />
              </div>
              <div className="product-info">
                <div className="product-name">{selectedReview.product_name}</div>
                <div className="order-info">
                  <Text type="secondary">订单编号: </Text>
                  {selectedReview.order_id}
                </div>
              </div>
            </div>
            
            <Divider />
            
            <Tabs defaultActiveKey="review">
              <TabPane 
                tab={
                  <span>
                    <StarOutlined />
                    评价详情
                  </span>
                } 
                key="review"
              >
                <div className="review-full">
                  <div className="review-header">
                    <div className="user-info">
                      <Avatar
                        src={selectedReview.user?.avatar_url}
                        icon={<UserOutlined />}
                        size="default"
                      />
                      <div className="user-meta">
                        <div className="user-name">
                          {selectedReview.is_anonymous ? '匿名用户' : (selectedReview.user?.nickname || '未知用户')}
                        </div>
                        <div className="review-time">
                          {moment(selectedReview.created_at).format('YYYY-MM-DD HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="review-rating">
                      <Rate disabled value={selectedReview.rating} />
                    </div>
                  </div>
                  
                  <div className="review-body">
                    <Paragraph>
                      {selectedReview.content}
                    </Paragraph>
                    
                    {selectedReview.images && selectedReview.images.length > 0 && (
                      <div className="image-gallery">
                        {selectedReview.images.map((img, index) => (
                          <div key={index} className="gallery-item">
                            <Image
                              src={img.image_url}
                              alt={`评价图片${index+1}`}
                              width={120}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedReview.reply_content && (
                    <div className="merchant-reply">
                      <Comment
                        author={<b>商家回复</b>}
                        avatar={
                          <Avatar
                            style={{ backgroundColor: '#1890ff' }}
                            icon={<UserOutlined />}
                          />
                        }
                        content={<p>{selectedReview.reply_content}</p>}
                        datetime={
                          <span>
                            {moment(selectedReview.reply_time).format('YYYY-MM-DD HH:mm')}
                          </span>
                        }
                      />
                    </div>
                  )}
                </div>
              </TabPane>
              <TabPane 
                tab={
                  <span>
                    <MessageOutlined />
                    评价回复
                  </span>
                } 
                key="reply"
              >
                {selectedReview.reply_content ? (
                  <div className="reply-history">
                    <Title level={5}>已回复内容</Title>
                    <div className="reply-content">
                      {selectedReview.reply_content}
                    </div>
                    <div className="reply-time">
                      回复时间: {moment(selectedReview.reply_time).format('YYYY-MM-DD HH:mm')}
                    </div>
                    
                    <Divider dashed />
                    
                    <div className="reply-actions">
                      <Button
                        type="primary"
                        onClick={() => {
                          setDetailModalVisible(false);
                          handleReplyReview(selectedReview);
                        }}
                      >
                        修改回复
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="no-reply">
                    <div className="empty-message">
                      还没有回复该评价
                    </div>
                    <div className="reply-actions">
                      <Button
                        type="primary"
                        onClick={() => {
                          setDetailModalVisible(false);
                          handleReplyReview(selectedReview);
                        }}
                        disabled={selectedReview.status !== 1}
                      >
                        立即回复
                      </Button>
                      {selectedReview.status !== 1 && (
                        <div className="reply-note">
                          <Text type="warning">评价审核通过后才能回复</Text>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabPane>
            </Tabs>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReviewList;