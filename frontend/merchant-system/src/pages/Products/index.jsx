// src/pages/Products/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Button, Input, Space, Tag, Tooltip, Popconfirm, 
  message, Select, Row, Col, Badge, Image
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SearchOutlined, ReloadOutlined, ShoppingOutlined
} from '@ant-design/icons';
import ProductForm from './components/ProductForm';
import { useRequest } from '../../hooks/useRequest';
import { formatPrice } from '../../utils/format';
import './index.less';

const { Option } = Select;

const ProductList = () => {
  const [productList, setProductList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    category_id: undefined,
    status: undefined
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  
  const { fetchData } = useRequest();
  
  // 加载商品分类
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetchData({
        url: '/api/v1/merchants/categories/all',
        method: 'GET'
      });
      setCategories(res || []);
    } catch (error) {
      console.error('加载分类失败:', error);
      message.error('加载分类失败');
    }
  }, [fetchData]);
  
  // 加载商品列表
  const loadProducts = useCallback(async (params = {}) => {
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
        url: `/api/v1/products?${queryString}`,
        method: 'GET'
      });
      
      if (res?.data) {
        setProductList(res.data.items || []);
        setPagination({
          ...pagination,
          current: res.data.page,
          pageSize: res.data.page_size,
          total: res.data.total
        });
      }
    } catch (error) {
      console.error('加载商品列表失败:', error);
      message.error('加载商品列表失败');
    } finally {
      setLoading(false);
    }
  }, [fetchData, pagination, searchParams]);
  
  // 初始加载
useEffect(() => {
  loadProducts();
  loadCategories();
}, []); 
  
  // 处理表格翻页
  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
    loadProducts({
      page: pagination.current,
      page_size: pagination.pageSize,
      sort_by: sorter.field,
      sort_order: sorter.order === 'descend' ? 'desc' : 'asc'
    });
  };
  
  // 处理搜索
  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    loadProducts({ page: 1 });
  };
  
  // 处理重置搜索
  const handleReset = () => {
    setSearchParams({
      keyword: '',
      category_id: undefined,
      status: undefined
    });
    setPagination({ ...pagination, current: 1 });
    loadProducts({ 
      page: 1, 
      keyword: '',
      category_id: undefined,
      status: undefined
    });
  };
  
  // 处理新增商品
  const handleAddProduct = () => {
    setSelectedProduct(null);
    setFormVisible(true);
  };
  
  // 处理编辑商品
  const handleEditProduct = (record) => {
    setSelectedProduct(record);
    setFormVisible(true);
  };
  
  // 处理删除商品
  const handleDeleteProduct = async (id) => {
    try {
      await fetchData({
        url: `/api/v1/products/${id}`,
        method: 'DELETE'
      });
      message.success('删除商品成功');
      loadProducts();
    } catch (error) {
      console.error('删除商品失败:', error);
      message.error('删除商品失败');
    }
  };
  
  // 处理表单提交
  const handleFormSubmit = async (values) => {
    try {
      if (selectedProduct) {
        // 更新商品
        await fetchData({
          url: `/api/v1/products/${selectedProduct.id}`,
          method: 'PUT',
          data: values
        });
        message.success('更新商品成功');
      } else {
        // 新增商品
        await fetchData({
          url: '/api/v1/products',
          method: 'POST',
          data: values
        });
        message.success('新增商品成功');
      }
      setFormVisible(false);
      loadProducts();
    } catch (error) {
      console.error('保存商品失败:', error);
      message.error('保存商品失败');
    }
  };
  
  // 表格列配置
  const columns = [
    {
      title: '商品图片',
      dataIndex: 'thumbnail',
      key: 'thumbnail',
      width: 80,
      render: (text) => (
        <Image
          width={60}
          height={60}
          src={text}
          alt="商品图片"
          fallback="data:image/png;base64,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"
        />
      )
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'categories',
      key: 'categories',
      render: (categories) => (
        <Space>
          {(categories || []).map((cat) => (
            <Tag key={cat.id} color="blue">{cat.name}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '价格(元)',
      dataIndex: 'current_price',
      key: 'current_price',
      align: 'right',
      sorter: true,
      render: (text, record) => (
        <div>
          <div className="current-price">{formatPrice(text)}</div>
          {record.original_price > text && (
            <div className="original-price">{formatPrice(record.original_price)}</div>
          )}
        </div>
      )
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      align: 'right',
      sorter: true,
      render: (text) => text || 0
    },
    {
      title: '销量',
      dataIndex: 'sales',
      key: 'sales',
      align: 'right',
      sorter: true,
      render: (text) => text || 0
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => {
        const statusMap = {
          0: { text: '下架', color: 'default' },
          1: { text: '上架', color: 'success' },
        };
        return (
          <Badge 
            status={statusMap[status]?.color || 'default'} 
            text={statusMap[status]?.text || '未知'}
          />
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => {}}
            />
          </Tooltip>
          <Tooltip title="编辑商品">
            <Button 
              type="text" 
              size="small" 
              icon={<EditOutlined />} 
              onClick={() => handleEditProduct(record)}
            />
          </Tooltip>
          <Tooltip title="删除商品">
            <Popconfirm
              title="确定要删除该商品吗？"
              onConfirm={() => handleDeleteProduct(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                type="text" 
                size="small" 
                danger 
                icon={<DeleteOutlined />} 
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];
  
  return (
    <div className="product-list-page">
      <Card className="search-card">
        <Row gutter={16}>
          <Col xs={24} sm={8} md={6} lg={6}>
            <Input
              placeholder="商品名称"
              value={searchParams.keyword}
              onChange={(e) => setSearchParams({ ...searchParams, keyword: e.target.value })}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={6} lg={6}>
            <Select
              placeholder="选择分类"
              value={searchParams.category_id}
              onChange={(value) => setSearchParams({ ...searchParams, category_id: value })}
              style={{ width: '100%' }}
              allowClear
            >
              {categories.map(cat => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6} lg={6}>
            <Select
              placeholder="商品状态"
              value={searchParams.status}
              onChange={(value) => setSearchParams({ ...searchParams, status: value })}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value={1}>上架</Option>
              <Option value={0}>下架</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={6} lg={6} className="search-buttons">
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
        title="商品列表" 
        className="product-table-card"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddProduct}
          >
            新增商品
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={productList}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
      </Card>
      
      {formVisible && (
        <ProductForm
          visible={formVisible}
          onCancel={() => setFormVisible(false)}
          onSubmit={handleFormSubmit}
          initialValues={selectedProduct}
          categories={categories}
        />
      )}
    </div>
  );
};

export default ProductList;