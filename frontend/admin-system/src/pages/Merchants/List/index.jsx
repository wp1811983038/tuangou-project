// src/pages/Merchants/List/index.jsx
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Space, message, Tag } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { fetchMerchantList } from '../../../api/merchant'; // 确保路径正确

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

  // 加载商户列表数据
  const loadData = async (params = {}) => {
    try {
      setLoading(true);
      const { current, pageSize, ...restParams } = params;
      
      // 构建查询参数
      const queryParams = {
        page: current || pagination.current,
        page_size: pageSize || pagination.pageSize,
        keyword: filters.keyword,
        category_id: filters.category_id,
        status: filters.status,
        ...restParams
      };
      
      // 如果API尚未实现，使用测试数据
      let response;
      try {
        response = await fetchMerchantList(queryParams);
      } catch (error) {
        console.warn('API调用失败，使用测试数据', error);
        // 测试数据
        response = {
          data: {
            items: [
              {
                id: 1,
                name: '示例商户1',
                logo: 'https://via.placeholder.com/50',
                contact_name: '张三',
                contact_phone: '13800138000',
                province: '广东省',
                city: '深圳市',
                district: '南山区',
                address: '科技园路123号',
                status: 1,
                rating: 4.5,
                commission_rate: 0.05,
                created_at: '2023-05-12 10:30:00'
              },
              {
                id: 2,
                name: '示例商户2',
                logo: 'https://via.placeholder.com/50',
                contact_name: '李四',
                contact_phone: '13900139000',
                province: '广东省',
                city: '广州市',
                district: '天河区',
                address: '天河路456号',
                status: 0,
                rating: 5.0,
                commission_rate: 0.03,
                created_at: '2023-05-10 14:20:00'
              }
            ],
            total: 2,
            page: 1,
            page_size: 10
          }
        };
      }
      
      const { items, total, page, page_size } = response.data;
      
      // 更新数据和分页
      setMerchants(items);
      setPagination({
        current: page,
        pageSize: page_size,
        total
      });
    } catch (error) {
      console.error('获取商户列表失败', error);
      message.error('获取商户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    loadData();
  }, []);

  // 处理表格变化
  const handleTableChange = (pagination, filters, sorter) => {
    loadData({
      current: pagination.current,
      pageSize: pagination.pageSize,
      sort_by: sorter.field,
      sort_order: sorter.order === 'descend' ? 'desc' : 'asc'
    });
  };

  // 处理搜索
  const handleSearch = () => {
    loadData({
      current: 1
    });
  };

  // 定义表格列
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
        <span>{`${record.province}${record.city}${record.district}${text || ''}`}</span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={statusColors[status]}>
          {statusText[status]}
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
      <div style={{ marginBottom: 16, display: 'flex' }}>
        <Space size="large">
          <Input
            placeholder="商户名称/联系人/电话"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            style={{ width: 230 }}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="商户状态"
            style={{ width: 120 }}
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            allowClear
          >
            <Option value={0}>待审核</Option>
            <Option value={1}>正常</Option>
            <Option value={2}>已禁用</Option>
          </Select>
          
          <Button type="primary" onClick={handleSearch}>搜索</Button>
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
      />
    </Card>
  );
};

export default MerchantList;