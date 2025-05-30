// src/pages/Groups/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Button, Input, Space, Tag, Tooltip, Popconfirm, 
  message, Select, Row, Col, Badge, Image, Progress, Statistic 
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SearchOutlined, ReloadOutlined, TeamOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import GroupForm from './components/GroupForm';
import { useRequest } from '../../hooks/useRequest';
import { formatPrice } from '../../utils/format';
import moment from 'moment';
import './index.less';

const { Option } = Select;
const { Countdown } = Statistic;

const GroupList = () => {
  const [groupList, setGroupList] = useState([]);
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
  });
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [formVisible, setFormVisible] = useState(false);

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

  // 加载团购列表
  const loadGroups = useCallback(async (params = {}) => {
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
        url: `/api/v1/groups/merchant/list?${queryString}`,
        method: 'GET'
      });

      if (res?.data) {
        setGroupList(res.data.items || []);
        setPagination({
          ...pagination,
          current: res.data.page,
          pageSize: res.data.page_size,
          total: res.data.total
        });
      }
    } catch (error) {
      console.error('加载团购列表失败:', error);
      message.error('加载团购列表失败');
    } finally {
      setLoading(false);
    }
  }, [fetchData, pagination, searchParams]);

  // 初始加载
  useEffect(() => {
    loadProducts();
    loadGroups();
  }, [loadProducts, loadGroups]);

  // 处理表格翻页
  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
    loadGroups({
      page: pagination.current,
      page_size: pagination.pageSize,
      sort_by: sorter.field,
      sort_order: sorter.order === 'descend' ? 'desc' : 'asc'
    });
  };

  // 处理搜索
  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    loadGroups({ page: 1 });
  };

  // 处理重置搜索
  const handleReset = () => {
    setSearchParams({
      keyword: '',
      product_id: undefined,
      status: undefined
    });
    setPagination({ ...pagination, current: 1 });
    loadGroups({
      page: 1,
      keyword: '',
      product_id: undefined,
      status: undefined
    });
  };

  // 处理新增团购
  const handleAddGroup = () => {
    setSelectedGroup(null);
    setFormVisible(true);
  };

  // 处理编辑团购
  const handleEditGroup = (record) => {
    setSelectedGroup(record);
    setFormVisible(true);
  };

  // 处理删除团购
  const handleDeleteGroup = async (id) => {
    try {
      await fetchData({
        url: `/api/v1/groups/${id}`,
        method: 'DELETE'
      });
      message.success('删除团购成功');
      loadGroups();
    } catch (error) {
      console.error('删除团购失败:', error);
      message.error('删除团购失败');
    }
  };

  // 处理更新团购状态
  const handleUpdateStatus = async (id, status) => {
    try {
      await fetchData({
        url: `/api/v1/groups/${id}`,
        method: 'PUT',
        data: { status }
      });
      message.success('更新团购状态成功');
      loadGroups();
    } catch (error) {
      console.error('更新团购状态失败:', error);
      message.error('更新团购状态失败');
    }
  };

  // 处理表单提交
  const handleFormSubmit = async (values) => {
    try {
      if (selectedGroup) {
        // 更新团购
        await fetchData({
          url: `/api/v1/groups/${selectedGroup.id}`,
          method: 'PUT',
          data: values
        });
        message.success('更新团购成功');
      } else {
        // 新增团购
        await fetchData({
          url: '/api/v1/groups',
          method: 'POST',
          data: values
        });
        message.success('创建团购成功');
      }
      setFormVisible(false);
      loadGroups();
    } catch (error) {
      console.error('保存团购失败:', error);
      message.error('保存团购失败');
    }
  };

  // 获取团购状态
  const getGroupStatus = (status, end_time, current_participants, min_participants) => {
    // 状态: 0-未开始, 1-进行中, 2-已成功, 3-已失败
    if (status === 0) {
      return { text: '未开始', color: 'default' };
    } else if (status === 1) {
      const isExpired = moment(end_time).isBefore(moment());
      if (isExpired) {
        return current_participants >= min_participants
          ? { text: '已成功', color: 'success' }
          : { text: '已失败', color: 'error' };
      }
      return { text: '进行中', color: 'processing' };
    } else if (status === 2) {
      return { text: '已成功', color: 'success' };
    } else if (status === 3) {
      return { text: '已失败', color: 'error' };
    }
    return { text: '未知', color: 'default' };
  };

  // 表格列配置
  const columns = [
    {
      title: '活动图片',
      dataIndex: 'cover_image',
      key: 'cover_image',
      width: 90,
      render: (text) => (
        <Image
          width={70}
          height={70}
          src={text}
          alt="团购图片"
          fallback="data:image/png;base64,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"
        />
      )
    },
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '商品',
      dataIndex: 'product',
      key: 'product',
      ellipsis: true,
      render: (product) => (
        product ? (
          <Space>
            <span>{product.name}</span>
            <Tag color="blue">{formatPrice(product.current_price)}元</Tag>
          </Space>
        ) : '-'
      )
    },
    {
      title: '团购价(元)',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      sorter: true,
      render: (text, record) => (
        <div>
          <div className="group-price">{formatPrice(text)}</div>
          {record.original_price > text && (
            <div className="original-price">{formatPrice(record.original_price)}</div>
          )}
        </div>
      )
    },
    {
      title: '成团进度',
      key: 'progress',
      width: 180,
      render: (_, record) => {
        const { current_participants, min_participants, max_participants } = record;
        const percent = Math.min(
          Math.round((current_participants / min_participants) * 100),
          100
        );

        return (
          <div>
            <Progress
              percent={percent}
              size="small"
              status={current_participants >= min_participants ? "success" : "active"}
              format={() => `${current_participants}/${min_participants}`}
            />
            <div className="progress-text">
              <TeamOutlined /> 已参与: {current_participants}人
              {max_participants && <span> (上限: {max_participants}人)</span>}
            </div>
          </div>
        );
      }
    },
    {
      title: '活动时间',
      key: 'time',
      width: 180,
      render: (_, record) => {
        const startTime = moment(record.start_time).format('YYYY-MM-DD');
        const endTime = moment(record.end_time).format('YYYY-MM-DD');
        const isExpired = moment(record.end_time).isBefore(moment());
        const remainingTime = moment(record.end_time).valueOf() - moment().valueOf();

        return (
          <div>
            <div>{startTime} 至 {endTime}</div>
            {!isExpired && remainingTime > 0 && (
              <div className="countdown">
                <ClockCircleOutlined /> 剩余:
                <Statistic.Timer
                  type="countdown"
                  value={record.end_time}
                  format="D天H时m分"
                  valueStyle={{ fontSize: '12px', marginLeft: '4px' }}
                />
              </div>
            )}
            {isExpired && (
              <div className="expired-text">已结束</div>
            )}
          </div>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status, record) => {
        const statusInfo = getGroupStatus(
          status,
          record.end_time,
          record.current_participants,
          record.min_participants
        );
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
      width: 180,
      render: (_, record) => {
        const isExpired = moment(record.end_time).isBefore(moment());
        const statusInfo = getGroupStatus(
          record.status,
          record.end_time,
          record.current_participants,
          record.min_participants
        );

        return (
          <Space size="small">
            <Tooltip title="查看详情">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => { }}
              />
            </Tooltip>

            {record.status === 1 && !isExpired && (
              <Tooltip title="编辑团购">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEditGroup(record)}
                />
              </Tooltip>
            )}

            {record.status === 1 && !isExpired && (
              <Tooltip title="手动结束">
                <Popconfirm
                  title="确定要手动结束该团购吗？"
                  onConfirm={() => handleUpdateStatus(record.id,
                    record.current_participants >= record.min_participants ? 2 : 3
                  )}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<ClockCircleOutlined />}
                  />
                </Popconfirm>
              </Tooltip>
            )}

            {record.status !== 1 && (
              <Tooltip title="删除团购">
                <Popconfirm
                  title="确定要删除该团购吗？"
                  onConfirm={() => handleDeleteGroup(record.id)}
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
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="group-list-page">
      <Card className="search-card">
        <Row gutter={16}>
          <Col xs={24} sm={8} md={6} lg={6}>
            <Input
              placeholder="活动名称"
              value={searchParams.keyword}
              onChange={(e) => setSearchParams({ ...searchParams, keyword: e.target.value })}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={6} lg={6}>
            <Select
              placeholder="选择商品"
              value={searchParams.product_id}
              onChange={(value) => setSearchParams({ ...searchParams, product_id: value })}
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
          <Col xs={24} sm={8} md={6} lg={6}>
            <Select
              placeholder="团购状态"
              value={searchParams.status}
              onChange={(value) => setSearchParams({ ...searchParams, status: value })}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value={0}>未开始</Option>
              <Option value={1}>进行中</Option>
              <Option value={2}>已成功</Option>
              <Option value={3}>已失败</Option>
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
        title="团购活动列表"
        className="group-table-card"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddGroup}
          >
            发起团购
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={groupList}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {formVisible && (
        <GroupForm
          visible={formVisible}
          onCancel={() => setFormVisible(false)}
          onSubmit={handleFormSubmit}
          initialValues={selectedGroup}
          products={products}
        />
      )}
    </div>
  );
};

export default GroupList;