// src/pages/Products/index.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Card, Table, Button, Input, Space, Tag, Tooltip, Popconfirm, 
  message, Select, Row, Col, Badge, Image, Drawer, Tabs,
  Switch, Menu, Dropdown, Statistic, Alert, Modal, Typography,
  Form, Divider, Descriptions
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SearchOutlined, ReloadOutlined, UploadOutlined, DownloadOutlined,
  AppstoreOutlined, BarsOutlined, FileExcelOutlined, SortAscendingOutlined,
  SortDescendingOutlined, FilterOutlined, ArrowUpOutlined, ArrowDownOutlined,
  PictureOutlined, SettingOutlined, TagsOutlined, ShoppingOutlined,
  SwapOutlined, TeamOutlined, DollarOutlined, CloseCircleOutlined,
  CheckCircleOutlined, PieChartOutlined, LikeOutlined
} from '@ant-design/icons';
import ProductForm from './components/ProductForm';
import ProductDetail from './components/ProductDetail.jsx';
import ProductStats from './components/ProductStats.jsx';
import BatchOperationForm from './components/BatchOperationForm.jsx';
import { useRequest } from '../../hooks/useRequest';
import { useAuth } from '../../hooks/useAuth';
import { formatPrice, formatDateTime } from '../../utils/format';
import { exportToExcel } from '../../utils/export';
import './index.less';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const Products = () => {
  // 状态定义
  const [productList, setProductList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100']
  });
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    category_id: undefined,
    status: undefined,
    is_hot: undefined,
    is_new: undefined,
    is_recommend: undefined,
    has_group: undefined,
    min_price: undefined,
    max_price: undefined,
    min_stock: undefined
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [advancedFilter, setAdvancedFilter] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' 或 'grid'
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchOperationVisible, setBatchOperationVisible] = useState(false);
  const [sorting, setSorting] = useState({ field: 'created_at', order: 'desc' });
  const [activeTab, setActiveTab] = useState('all');
  const searchInputRef = useRef(null);
  
  const { fetchData } = useRequest();
  const { currentUser, isMerchant, getMerchantId } = useAuth();
  
  // 检查商户权限
  useEffect(() => {
    if (!isMerchant()) {
      message.error('您需要商户权限才能访问商品管理');
      return;
    }
  }, [currentUser, isMerchant]);
  
  // 加载商品分类
  const loadCategories = useCallback(async () => {
    if (!isMerchant()) {
      console.warn('非商户用户，跳过加载分类');
      return;
    }
    
    try {
      const merchantId = getMerchantId();
      if (!merchantId) {
        console.warn('未找到商户ID，跳过加载分类');
        return;
      }
      
      const res = await fetchData({
        url: `/api/v1/categories`,
        method: 'GET'
      });
      setCategories(res || []);
    } catch (error) {
      console.error('加载分类失败:', error);
      message.error('加载分类失败');
    }
  }, [fetchData, isMerchant, getMerchantId]);
  
  // 加载商品列表
  const loadProducts = useCallback(async (params = {}) => {
    if (!isMerchant()) {
      console.warn('非商户用户，跳过加载商品');
      return;
    }
    
    const merchantId = getMerchantId();
    if (!merchantId) {
      message.error('未找到商户信息，无法加载商品');
      return;
    }
    
    setLoading(true);
    try {
      const queryParams = {
        page: pagination.current,
        page_size: pagination.pageSize,
        sort_by: sorting.field,
        sort_order: sorting.order,
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
      
      // 使用商户专用的API路径
      const res = await fetchData({
        url: `/api/v1/products/merchant?${queryString}`,
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
      message.error('加载商品列表失败: ' + (error.message || '请检查网络连接或联系管理员'));
    } finally {
      setLoading(false);
    }
  }, [fetchData, pagination, searchParams, sorting, isMerchant, getMerchantId]);
  
  // 初始加载
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);
  
  // 处理表格翻页
  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
    
    if (sorter.field && sorter.order) {
      setSorting({
        field: sorter.field,
        order: sorter.order === 'descend' ? 'desc' : 'asc'
      });
    }
    
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
      status: undefined,
      is_hot: undefined,
      is_new: undefined,
      is_recommend: undefined,
      has_group: undefined,
      min_price: undefined,
      max_price: undefined,
      min_stock: undefined
    });
    setPagination({ ...pagination, current: 1 });
    setSorting({ field: 'created_at', order: 'desc' });
    loadProducts({ 
      page: 1,
      sort_by: 'created_at',
      sort_order: 'desc'
    });
  };
  
  // 处理切换标签页
  const handleTabChange = (key) => {
    setActiveTab(key);
    let params = {};
    
    switch (key) {
      case 'onSale':
        params = { status: 1 };
        break;
      case 'offSale':
        params = { status: 0 };
        break;
      case 'hot':
        params = { is_hot: true, status: 1 };
        break;
      case 'new':
        params = { is_new: true, status: 1 };
        break;
      case 'recommend':
        params = { is_recommend: true, status: 1 };
        break;
      case 'lowStock':
        params = { status: 1, min_stock: 0, max_stock: 10 };
        break;
      case 'hasGroup':
        params = { has_group: true };
        break;
      default:
        params = {};
        break;
    }
    
    setSearchParams(params);
    setPagination({ ...pagination, current: 1 });
    loadProducts({ page: 1, ...params });
  };
  
  // 获取商品数量统计
  const getProductsCount = () => {
    const productStats = [
      { key: 'all', count: pagination.total },
      { key: 'onSale', count: productList.filter(p => p.status === 1).length },
      { key: 'offSale', count: productList.filter(p => p.status === 0).length },
      { key: 'hot', count: productList.filter(p => p.is_hot).length },
      { key: 'new', count: productList.filter(p => p.is_new).length },
      { key: 'recommend', count: productList.filter(p => p.is_recommend).length },
      { key: 'lowStock', count: productList.filter(p => p.stock < 10).length },
      { key: 'hasGroup', count: productList.filter(p => p.has_group).length }
    ];
    
    return productStats.find(stat => stat.key === activeTab)?.count || 0;
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
  
  // 处理查看商品详情
  const handleViewProduct = (record) => {
    setSelectedProduct(record);
    setDetailVisible(true);
  };
  
  // 处理查看商品统计
  const handleViewStats = (record) => {
    setSelectedProduct(record);
    setStatsVisible(true);
  };
  
  // 处理删除商品
  const handleDeleteProduct = async (id) => {
    if (!isMerchant()) {
      message.error('您需要商户权限才能删除商品');
      return;
    }
    
    try {
      await fetchData({
        url: `/api/v1/products/${id}`,
        method: 'DELETE'
      });
      message.success('删除商品成功');
      loadProducts();
    } catch (error) {
      console.error('删除商品失败:', error);
      
      // 判断错误类型提供更有用的错误信息
      if (error.response?.status === 404) {
        message.error('商品不存在或已被删除');
      } else if (error.response?.status === 403) {
        message.error('您没有权限删除此商品');
      } else {
        message.error('删除商品失败: ' + (error.message || '未知错误'));
      }
    }
  };
  
  // 处理表单提交
  const handleFormSubmit = async (values) => {
    if (!isMerchant()) {
      message.error('您需要商户权限才能操作商品');
      return;
    }
    
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
          url: `/api/v1/products`,
          method: 'POST',
          data: values
        });
        message.success('新增商品成功');
      }
      setFormVisible(false);
      loadProducts();
    } catch (error) {
      console.error('保存商品失败:', error);
      message.error('保存商品失败: ' + (error.message || '未知错误'));
    }
  };
  
  // 处理上下架状态切换
  const handleStatusChange = async (id, status) => {
    if (!isMerchant()) {
      message.error('您需要商户权限才能操作商品');
      return;
    }
    
    try {
      await fetchData({
        url: `/api/v1/products/${id}`,
        method: 'PUT',
        data: { status: status ? 1 : 0 }
      });
      message.success(`商品${status ? '上架' : '下架'}成功`);
      loadProducts();
    } catch (error) {
      console.error('更新商品状态失败:', error);
      message.error('更新商品状态失败');
    }
  };
  
  // 处理热门标签切换
  const handleHotChange = async (id, isHot) => {
    try {
      await fetchData({
        url: `/api/v1/products/${id}`,
        method: 'PUT',
        data: { is_hot: isHot }
      });
      message.success(`设置${isHot ? '热门' : '非热门'}成功`);
      loadProducts();
    } catch (error) {
      console.error('更新商品标签失败:', error);
      message.error('更新商品标签失败');
    }
  };
  
  // 处理新品标签切换
  const handleNewChange = async (id, isNew) => {
    try {
      await fetchData({
        url: `/api/v1/products/${id}`,
        method: 'PUT',
        data: { is_new: isNew }
      });
      message.success(`设置${isNew ? '新品' : '非新品'}成功`);
      loadProducts();
    } catch (error) {
      console.error('更新商品标签失败:', error);
      message.error('更新商品标签失败');
    }
  };
  
  // 处理推荐标签切换
  const handleRecommendChange = async (id, isRecommend) => {
    try {
      await fetchData({
        url: `/api/v1/products/${id}`,
        method: 'PUT',
        data: { is_recommend: isRecommend }
      });
      message.success(`设置${isRecommend ? '推荐' : '非推荐'}成功`);
      loadProducts();
    } catch (error) {
      console.error('更新商品标签失败:', error);
      message.error('更新商品标签失败');
    }
  };
  
  // 处理批量操作
  const handleBatchOperation = (operation, data) => {
    Modal.confirm({
      title: `确定要批量${operation === 'delete' ? '删除' : operation === 'onSale' ? '上架' : '下架'}选中的商品吗？`,
      content: `此操作将影响 ${selectedRowKeys.length} 个商品，请谨慎操作。`,
      onOk: async () => {
        try {
          // 这里应该调用批量操作API，但目前后端可能没有提供，所以需要循环调用单个操作API
          const promises = selectedRowKeys.map(id => {
            switch (operation) {
              case 'delete':
                return fetchData({
                  url: `/api/v1/products/${id}`,
                  method: 'DELETE'
                }).catch(err => {
                  console.warn(`删除商品 ${id} 失败:`, err);
                  return Promise.resolve({ error: true, id });
                });
              case 'onSale':
                return fetchData({
                  url: `/api/v1/products/${id}`,
                  method: 'PUT',
                  data: { status: 1 }
                });
              case 'offSale':
                return fetchData({
                  url: `/api/v1/products/${id}`,
                  method: 'PUT',
                  data: { status: 0 }
                });
              case 'setHot':
                return fetchData({
                  url: `/api/v1/products/${id}`,
                  method: 'PUT',
                  data: { is_hot: data.value }
                });
              case 'setNew':
                return fetchData({
                  url: `/api/v1/products/${id}`,
                  method: 'PUT',
                  data: { is_new: data.value }
                });
              case 'setRecommend':
                return fetchData({
                  url: `/api/v1/products/${id}`,
                  method: 'PUT',
                  data: { is_recommend: data.value }
                });
              case 'setCategory':
                return fetchData({
                  url: `/api/v1/products/${id}`,
                  method: 'PUT',
                  data: { category_ids: data.categoryIds }
                });
              default:
                return Promise.resolve();
            }
          });
          
          const results = await Promise.allSettled(promises);
          const successCount = results.filter(r => r.status === 'fulfilled' && !r.value?.error).length;
          const failCount = results.length - successCount;
          
          if (failCount > 0) {
            message.warning(`操作完成：${successCount} 个成功，${failCount} 个失败`);
          } else {
            message.success('批量操作成功');
          }
          
          setSelectedRowKeys([]);
          loadProducts();
        } catch (error) {
          console.error('批量操作失败:', error);
          message.error('批量操作失败: ' + (error.message || '未知错误'));
        }
      }
    });
  };
  
  // 导出商品数据
  const handleExportProducts = () => {
    message.info('正在准备导出数据...');
    
    // 获取当前筛选条件下的所有商品，不分页
    setLoading(true);
    
    // 构建查询参数 - 去掉分页参数，保留筛选参数
    const queryParams = {
      ...searchParams,
      page_size: 1000 // 设置一个较大的值，以便获取所有符合条件的商品
    };
    
    // 移除未定义的参数
    Object.keys(queryParams).forEach(key => 
      queryParams[key] === undefined && delete queryParams[key]
    );
    
    // 构建查询字符串
    const queryString = Object.keys(queryParams)
      .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
      .join('&');
    
    fetchData({
      url: `/api/v1/products?${queryString}`,
      method: 'GET'
    }).then(res => {
      if (res?.data?.items) {
        // 准备导出数据
        const exportData = res.data.items.map(item => ({
          商品ID: item.id,
          商品名称: item.name,
          分类: (item.categories || []).map(c => c.name).join(', '),
          原价: item.original_price,
          现价: item.current_price,
          团购价: item.group_price || '-',
          库存: item.stock,
          销量: item.sales,
          浏览量: item.views,
          状态: item.status === 1 ? '在售' : '下架',
          是否热门: item.is_hot ? '是' : '否',
          是否新品: item.is_new ? '是' : '否',
          是否推荐: item.is_recommend ? '是' : '否',
          创建时间: formatDateTime(item.created_at),
          更新时间: formatDateTime(item.updated_at)
        }));
        
        try {
          // 导出Excel
          exportToExcel(exportData, '商品列表');
          message.success('导出成功');
        } catch (error) {
          console.error('导出失败:', error);
          message.error('导出失败，请先安装xlsx库或检查浏览器设置');
        }
      }
    }).catch(error => {
      console.error('导出商品失败:', error);
      message.error('导出商品失败');
    }).finally(() => {
      setLoading(false);
    });
  };
  
  // 表格多选配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };
  
  // 批量操作下拉菜单
  const batchOperationMenu = (
    <Menu>
      <Menu.Item key="onSale" onClick={() => handleBatchOperation('onSale')}>
        <CheckCircleOutlined /> 批量上架
      </Menu.Item>
      <Menu.Item key="offSale" onClick={() => handleBatchOperation('offSale')}>
        <CloseCircleOutlined /> 批量下架
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="setHot" onClick={() => setBatchOperationVisible(true)}>
        <LikeOutlined /> 设置热门标签
      </Menu.Item>
      <Menu.Item key="setNew" onClick={() => setBatchOperationVisible(true)}>
        <TagsOutlined /> 设置新品标签
      </Menu.Item>
      <Menu.Item key="setRecommend" onClick={() => setBatchOperationVisible(true)}>
        <LikeOutlined /> 设置推荐标签
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="setCategory" onClick={() => setBatchOperationVisible(true)}>
        <AppstoreOutlined /> 修改商品分类
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="delete" danger onClick={() => handleBatchOperation('delete')}>
        <DeleteOutlined /> 批量删除
      </Menu.Item>
    </Menu>
  );
  
  // 表格列配置
  const columns = [
    {
      title: '商品图片',
      dataIndex: 'thumbnail',
      key: 'thumbnail',
      width: 90,
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
      title: '商品信息',
      key: 'info',
      render: (_, record) => (
        <div>
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              handleViewProduct(record);
            }}
            className="product-name"
          >
            {record.name}
          </a>
          <div className="product-categories">
            {(record.categories || []).map((cat) => (
              <Tag key={cat.id} color="blue">{cat.name}</Tag>
            ))}
          </div>
          <div className="product-price">
            <span className="current-price">{formatPrice(record.current_price)}</span>
            {record.original_price > record.current_price && (
              <span className="original-price">{formatPrice(record.original_price)}</span>
            )}
            {record.has_group && (
              <Tag color="green">团购价: {formatPrice(record.group_price || record.current_price * 0.9)}</Tag>
            )}
          </div>
        </div>
      )
    },
    {
      title: '销售信息',
      key: 'sales',
      width: 180,
      render: (_, record) => (
        <div>
          <div className="sales-info">
            <span className="label">库存:</span>
            <span className={`value ${record.stock < 10 ? 'low-stock' : ''}`}>
              {record.stock} {record.unit || '件'}
            </span>
            {record.stock < 10 && (
              <Tag color="red">库存不足</Tag>
            )}
          </div>
          <div className="sales-info">
            <span className="label">销量:</span>
            <span className="value">{record.sales || 0}</span>
          </div>
          <div className="sales-info">
            <span className="label">浏览量:</span>
            <span className="value">{record.views || 0}</span>
          </div>
        </div>
      )
    },
    {
      title: '标签',
      key: 'tags',
      width: 140,
      render: (_, record) => (
        <Space direction="vertical">
          <Switch
            checkedChildren="热门"
            unCheckedChildren="热门"
            checked={record.is_hot}
            size="small"
            onChange={(checked) => handleHotChange(record.id, checked)}
          />
          <Switch
            checkedChildren="新品"
            unCheckedChildren="新品"
            checked={record.is_new}
            size="small"
            onChange={(checked) => handleNewChange(record.id, checked)}
          />
          <Switch
            checkedChildren="推荐"
            unCheckedChildren="推荐"
            checked={record.is_recommend}
            size="small"
            onChange={(checked) => handleRecommendChange(record.id, checked)}
          />
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: '在售', value: 1 },
        { text: '下架', value: 0 }
      ],
      render: (status, record) => (
        <Switch
          checkedChildren="在售"
          unCheckedChildren="下架"
          checked={status === 1}
          onChange={(checked) => handleStatusChange(record.id, checked)}
        />
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: true,
      render: (text) => formatDateTime(text)
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewProduct(record)}
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
          <Tooltip title="统计分析">
            <Button 
              type="text" 
              size="small" 
              icon={<PieChartOutlined />} 
              onClick={() => handleViewStats(record)}
            />
          </Tooltip>
          <Tooltip title="删除商品">
            <Popconfirm
              title="确定要删除该商品吗？"
              description="删除后不可恢复，已有订单的商品将自动下架而非删除。"
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
  
  // 渲染函数
  return (
    <div className="product-list-page">
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        tabBarExtraContent={
          <Space>
            <Tooltip title="表格视图">
              <Button
                icon={<BarsOutlined />}
                type={viewMode === 'table' ? 'primary' : 'default'}
                onClick={() => setViewMode('table')}
              />
            </Tooltip>
            <Tooltip title="网格视图">
              <Button
                icon={<AppstoreOutlined />}
                type={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => setViewMode('grid')}
              />
            </Tooltip>
            <Tooltip title="导出商品">
              <Button icon={<DownloadOutlined />} onClick={handleExportProducts}>
                导出
              </Button>
            </Tooltip>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddProduct}
            >
              新增商品
            </Button>
          </Space>
        }
      >
        <TabPane tab={`全部商品 (${pagination.total || 0})`} key="all" />
        <TabPane tab="在售商品" key="onSale" />
        <TabPane tab="已下架" key="offSale" />
        <TabPane tab="热门商品" key="hot" />
        <TabPane tab="新品上架" key="new" />
        <TabPane tab="推荐商品" key="recommend" />
        <TabPane tab="库存不足" key="lowStock" />
        <TabPane tab="参与团购" key="hasGroup" />
      </Tabs>
      
      <Card className="search-card">
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <div className="search-input-container">
              <Search
                placeholder="商品名称/ID"
                value={searchParams.keyword}
                onChange={(e) => setSearchParams({ ...searchParams, keyword: e.target.value })}
                onSearch={handleSearch}
                enterButton
                ref={searchInputRef}
              />
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={12} lg={12}>
            <Row gutter={12}>
              <Col span={12}>
                <Select
                  placeholder="商品分类"
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
              <Col span={12}>
                <Select
                  placeholder="商品状态"
                  value={searchParams.status}
                  onChange={(value) => setSearchParams({ ...searchParams, status: value })}
                  style={{ width: '100%' }}
                  allowClear
                >
                  <Option value={1}>在售</Option>
                  <Option value={0}>下架</Option>
                </Select>
              </Col>
            </Row>
          </Col>
          
          <Col xs={24} sm={24} md={4} lg={6} className="search-buttons">
            <Space>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                重置
              </Button>
              <Button 
                type="link" 
                onClick={() => setAdvancedFilter(!advancedFilter)}
              >
                {advancedFilter ? '收起筛选' : '高级筛选'} 
                <FilterOutlined />
              </Button>
            </Space>
          </Col>
        </Row>
        
        {advancedFilter && (
          <div className="advanced-filter">
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={16}>
              <Col xs={24} md={8} lg={6}>
                <Form.Item label="价格范围">
                  <Input.Group compact>
                    <Input
                      style={{ width: '45%' }}
                      placeholder="最低价"
                      value={searchParams.min_price}
                      onChange={(e) => setSearchParams({ ...searchParams, min_price: e.target.value })}
                    />
                    <Input
                      style={{ width: '10%', textAlign: 'center', pointerEvents: 'none', backgroundColor: '#fff' }}
                      placeholder="~"
                      disabled
                      value="~"
                    />
                    <Input
                      style={{ width: '45%' }}
                      placeholder="最高价"
                      value={searchParams.max_price}
                      onChange={(e) => setSearchParams({ ...searchParams, max_price: e.target.value })}
                    />
                  </Input.Group>
                </Form.Item>
              </Col>
              <Col xs={24} md={8} lg={6}>
                <Form.Item label="标签筛选">
                  <Space>
                    <Select
                      placeholder="热门"
                      value={searchParams.is_hot}
                      onChange={(value) => setSearchParams({ ...searchParams, is_hot: value })}
                      style={{ width: 100 }}
                      allowClear
                    >
                      <Option value={true}>是</Option>
                      <Option value={false}>否</Option>
                    </Select>
                    <Select
                      placeholder="新品"
                      value={searchParams.is_new}
                      onChange={(value) => setSearchParams({ ...searchParams, is_new: value })}
                      style={{ width: 100 }}
                      allowClear
                    >
                      <Option value={true}>是</Option>
                      <Option value={false}>否</Option>
                    </Select>
                  </Space>
                </Form.Item>
              </Col>
              <Col xs={24} md={8} lg={6}>
                <Form.Item label="库存筛选">
                  <Space>
                    <Select
                      placeholder="库存状态"
                      value={searchParams.min_stock}
                      onChange={(value) => setSearchParams({ ...searchParams, min_stock: value })}
                      style={{ width: 150 }}
                      allowClear
                    >
                      <Option value={0}>全部</Option>
                                             <Option value={1}>有库存 (≥1)</Option>
                      <Option value={10}>库存充足 (≥10)</Option>
                      <Option value={-1}>库存不足 (≤10)</Option>
                      <Option value={-2}>已售罄 (=0)</Option>
                    </Select>
                  </Space>
                </Form.Item>
              </Col>
              <Col xs={24} md={8} lg={6}>
                <Form.Item label="团购筛选">
                  <Select
                    placeholder="团购状态"
                    value={searchParams.has_group}
                    onChange={(value) => setSearchParams({ ...searchParams, has_group: value })}
                    style={{ width: '100%' }}
                    allowClear
                  >
                    <Option value={true}>参与团购</Option>
                    <Option value={false}>未参与团购</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>
        )}
      </Card>
      
      <Card
        title={
          <Space>
            <span>商品列表</span>
            <Tag color="blue">{getProductsCount()} 件商品</Tag>
          </Space>
        }
        className="product-table-card"
        extra={
          selectedRowKeys.length > 0 ? (
            <Space>
              <Text strong>{`已选择 ${selectedRowKeys.length} 项`}</Text>
              <Dropdown overlay={batchOperationMenu} placement="bottomRight">
                <Button>
                  批量操作 <SettingOutlined />
                </Button>
              </Dropdown>
            </Space>
          ) : null
        }
      >
        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={productList}
            rowKey="id"
            loading={loading}
            pagination={pagination}
            onChange={handleTableChange}
            rowSelection={rowSelection}
            scroll={{ x: 1300 }}
          />
        ) : (
          <div className="product-grid">
            <Row gutter={[16, 16]}>
              {productList.map(product => (
                <Col xs={24} sm={12} md={8} lg={6} xl={4} key={product.id}>
                  <Card
                    hoverable
                    cover={
                      <div className="grid-product-image">
                        <img alt={product.name} src={product.thumbnail} />
                        {product.status === 0 && (
                          <div className="product-status-badge">
                            <Badge status="error" text="已下架" />
                          </div>
                        )}
                      </div>
                    }
                    actions={[
                      <Tooltip title="查看详情">
                        <EyeOutlined key="view" onClick={() => handleViewProduct(product)} />
                      </Tooltip>,
                      <Tooltip title="编辑商品">
                        <EditOutlined key="edit" onClick={() => handleEditProduct(product)} />
                      </Tooltip>,
                      <Tooltip title="删除商品">
                        <Popconfirm
                          title="确定要删除该商品吗？"
                          onConfirm={() => handleDeleteProduct(product.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <DeleteOutlined key="delete" />
                        </Popconfirm>
                      </Tooltip>,
                    ]}
                  >
                    <div className="grid-product-content">
                      <div className="grid-product-title">
                        <Tooltip title={product.name}>
                          <div className="name-text">{product.name}</div>
                        </Tooltip>
                      </div>
                      <div className="grid-product-price">
                        <span className="current-price">{formatPrice(product.current_price)}</span>
                        {product.original_price > product.current_price && (
                          <span className="original-price">{formatPrice(product.original_price)}</span>
                        )}
                      </div>
                      <div className="grid-product-tags">
                        {product.is_hot && <Tag color="volcano">热门</Tag>}
                        {product.is_new && <Tag color="green">新品</Tag>}
                        {product.is_recommend && <Tag color="blue">推荐</Tag>}
                        {product.has_group && <Tag color="purple">团购</Tag>}
                      </div>
                      <div className="grid-product-stats">
                        <span>库存: {product.stock}</span>
                        <span>销量: {product.sales}</span>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Card>
      
      {/* 商品表单抽屉 */}
      <Drawer
        title={selectedProduct ? "编辑商品" : "新增商品"}
        placement="right"
        closable={true}
        onClose={() => setFormVisible(false)}
        open={formVisible}
        width={720}
      >
        {formVisible && (
          <ProductForm
            initialValues={selectedProduct}
            categories={categories}
            onSubmit={handleFormSubmit}
            onCancel={() => setFormVisible(false)}
          />
        )}
      </Drawer>
      
      {/* 商品详情抽屉 */}
      <Drawer
        title="商品详情"
        placement="right"
        closable={true}
        onClose={() => setDetailVisible(false)}
        open={detailVisible}
        width={700}
      >
        {detailVisible && selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            onEdit={() => {
              setDetailVisible(false);
              setSelectedProduct(selectedProduct);
              setFormVisible(true);
            }}
          />
        )}
      </Drawer>
      
      {/* 统计分析抽屉 */}
      <Drawer
        title="商品统计分析"
        placement="right"
        closable={true}
        onClose={() => setStatsVisible(false)}
        open={statsVisible}
        width={700}
      >
        {statsVisible && selectedProduct && (
          <ProductStats
            product={selectedProduct}
          />
        )}
      </Drawer>
      
      {/* 批量操作表单 */}
      <Modal
        title="批量操作"
        open={batchOperationVisible}
        onCancel={() => setBatchOperationVisible(false)}
        footer={null}
      >
        <BatchOperationForm
          categories={categories}
          selectedCount={selectedRowKeys.length}
          onSubmit={(operation, data) => {
            setBatchOperationVisible(false);
            handleBatchOperation(operation, data);
          }}
          onCancel={() => setBatchOperationVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default Products;