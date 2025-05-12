// src/pages/Merchants/List/index.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Table, Card, Button, Input, Select, Space, message, Tag } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import request from '../../../utils/request';

const { Option } = Select;

const MerchantList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [merchants, setMerchants] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    keyword: '',
    category_id: null,
    status: null
  });

  // 防止API重复调用的标志
  const apiCallInProgress = useRef(false);
  const hasLoadedInitialData = useRef(false);
  const loadDataRef = useRef();

  // 状态标签颜色映射
  const statusColors = {
    0: 'orange',    // 待审核
    1: 'green',     // 正常
    2: 'red'        // 已禁用
  };

  // 状态文本映射
  const statusText = {
    0: '待审核',
    1: '正常',
    2: '已禁用'
  };

  // 更新loadData函数引用
  useEffect(() => {
    loadDataRef.current = async (params = {}) => {
      // 防止同时多次调用API
      if (apiCallInProgress.current) {
        console.log("API调用已在进行中，跳过重复请求");
        return;
      }
      
      try {
        apiCallInProgress.current = true;
        setLoading(true);
        
        const { current, pageSize, ...restParams } = params;
        
        // 构建查询参数，使用最新的filters状态
        const queryParams = {
          page: current || pagination.current,
          page_size: pageSize || pagination.pageSize,
          keyword: params.keyword !== undefined ? params.keyword : filters.keyword,
          category_id: params.category_id !== undefined ? params.category_id : filters.category_id,
          status: params.status !== undefined ? params.status : filters.status,
          ...restParams
        };
        
        console.log("开始请求商户列表数据...", queryParams);
        
        // 调用API获取数据
        const response = await request({
          url: '/merchants/', // 添加尾部斜杠避免重定向
          method: 'get',
          params: queryParams,
          // 减少超时时间
          timeout: 8000
        });
        
        console.log("获取商户列表成功:", response);
        
        // 解构API返回数据
        const { items = [], total = 0, page = 1, page_size = 10 } = response.data || {};
        
        // 更新状态
        setMerchants(items);
        setPagination({
          current: page,
          pageSize: page_size,
          total
        });
        
      } catch (error) {
        console.error("获取商户列表失败:", error);
        message.error('获取商户列表失败');
        
        // 设置空数据
        setMerchants([]);
        setPagination({
          ...pagination,
          total: 0
        });
      } finally {
        setLoading(false);
        apiCallInProgress.current = false;
      }
    };
  }, [filters, pagination]); // 依赖项更新引用

  // 首次加载数据
  useEffect(() => {
    if (!hasLoadedInitialData.current) {
      console.log("首次加载商户列表...");
      loadDataRef.current();
      hasLoadedInitialData.current = true;
    }
  }, []);

  // 处理表格变化
  const handleTableChange = (paginationData, filtersData, sorter) => {
    loadDataRef.current({
      current: paginationData.current,
      pageSize: paginationData.pageSize,
      sort_by: sorter.field,
      sort_order: sorter.order === 'descend' ? 'desc' : 'asc'
    });
  };

  // 处理搜索
  const handleSearch = () => {
    // 搜索时重置到第一页
    loadDataRef.current({ current: 1 });
  };

  // 处理过滤器变化
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 清空过滤器
  const handleClearFilters = () => {
    setFilters({
      keyword: '',
      category_id: null,
      status: null
    });
    // 重置过滤器后重新加载数据
    loadDataRef.current({
      current: 1,
      keyword: '',
      category_id: null,
      status: null
    });
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '商户名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {record.logo && (
            <img 
              src={record.logo} 
              alt={text} 
              style={{ width: '30px', height: '30px', borderRadius: '4px' }} 
              onError={(e) => {e.target.src = 'https://via.placeholder.com/30'}}
            />
          )}
          {text}
        </Space>
      )
    },
    {
      title: '联系人',
      dataIndex: 'contact_name',
      key: 'contact_name'
    },
    {
      title: '联系电话',
      dataIndex: 'contact_phone',
      key: 'contact_phone'
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (text, record) => (
        <span>{`${record.province || ''}${record.city || ''}${record.district || ''}${text || ''}`}</span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={statusColors[status] || 'default'}>
          {statusText[status] || '未知'}
        </Tag>
      )
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 100
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            size="small"
            onClick={() => navigate(`/merchants/detail/${record.id}`)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            size="small"
            onClick={() => navigate(`/merchants/edit/${record.id}`)}
          >
            编辑
          </Button>
          {record.status === 0 && (
            <Button 
              type="link" 
              size="small"
              onClick={() => navigate(`/merchants/review/${record.id}`)}
            >
              审核
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <Card 
      title="商户列表"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/merchants/create')}
        >
          新增商户
        </Button>
      }
    >
      {/* 搜索工具栏 */}
      <div style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Input
            placeholder="商户名称/联系人/电话"
            value={filters.keyword}
            onChange={(e) => handleFilterChange('keyword', e.target.value)}
            style={{ width: 230 }}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            allowClear
          />
          
          <Select
            placeholder="商户状态"
            style={{ width: 120 }}
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            allowClear
          >
            <Option value={0}>待审核</Option>
            <Option value={1}>正常</Option>
            <Option value={2}>已禁用</Option>
          </Select>
          
          <Button type="primary" onClick={handleSearch}>搜索</Button>
          <Button onClick={handleClearFilters}>重置</Button>
        </Space>
      </div>
      
      {/* 商户列表表格 */}
      <Table
        columns={columns}
        dataSource={merchants}
        rowKey="id"
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: '暂无商户数据' }}
      />
    </Card>
  );
};

export default MerchantList;