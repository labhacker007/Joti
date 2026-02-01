import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tabs, Select, Button, Space, Tag, Row, Col, Statistic,
  Typography, Tooltip, Alert, Spin, Badge, Progress, Empty, Modal, Popconfirm, message, Divider,
  Form, Input, InputNumber
} from 'antd';
import {
  BugOutlined, ThunderboltOutlined, SafetyOutlined,
  FilterOutlined, SyncOutlined, LinkOutlined, CheckCircleOutlined,
  ClockCircleOutlined, UserOutlined, RobotOutlined, EyeOutlined,
  FileTextOutlined, ExclamationCircleOutlined, DeleteOutlined, EditOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import client, { watchlistAPI } from '../api/client';
import { useTimezone } from '../context/TimezoneContext';
import './Intelligence.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Status color mapping
const STATUS_COLORS = {
  NEW: 'blue',
  IN_ANALYSIS: 'orange',
  NEED_TO_HUNT: 'purple',
  REVIEWED: 'green',
  ARCHIVED: 'default'
};

// Intelligence type icons and colors (IOCs and TTPs only)
const INTEL_TYPE_CONFIG = {
  IOC: { icon: <BugOutlined />, color: 'red', label: 'IOC' },
  TTP: { icon: <ThunderboltOutlined />, color: 'purple', label: 'TTP' },
  ATLAS: { icon: <RobotOutlined />, color: 'geekblue', label: 'ATLAS (AI TTP)' }
};

function Intelligence() {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatDateTime, getRelativeTime } = useTimezone();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [intelligence, setIntelligence] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  
// Filters
  const [statusFilter, setStatusFilter] = useState(null);
  const [intelTypeFilter, setIntelTypeFilter] = useState(null);
  const [frameworkFilter, setFrameworkFilter] = useState(null);
  const [huntStatusFilter, setHuntStatusFilter] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [articleIdFilter, setArticleIdFilter] = useState(null);
  const [articleTitle, setArticleTitle] = useState(null);
  const [iocTypeFilter, setIocTypeFilter] = useState(null);

  const TIME_RANGE_OPTIONS = [
    { value: '1d', label: 'Last 24h' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'all', label: 'All time' },
  ];

  // Helper to calculate date range
  const getStartDate = useCallback((range) => {
    const now = new Date();
    switch (range) {
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case 'all':
      default:
        return null;
    }
  }, []);
  
  // MITRE Matrix modal
  const [matrixVisible, setMatrixVisible] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  
  // Bulk selection state
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingIntel, setEditingIntel] = useState(null);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  
  // Watchlist modal state (for users without watchlist page access)
  const [watchlistModalVisible, setWatchlistModalVisible] = useState(false);
  const [watchlistKeywords, setWatchlistKeywords] = useState([]);

  // Initialize filters from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    // Support both 'type' (short) and 'intel_type' (long) parameter names
    const intelType = params.get('type') || params.get('intel_type');
    const status = params.get('status_filter');
    const framework = params.get('mitre_framework');
    const huntsOnly = params.get('with_hunts_only');
    const articleId = params.get('article_id');
    const articleTitleParam = params.get('article_title');
    const iocType = params.get('ioc_type');
    
    if (intelType) setIntelTypeFilter(intelType.toUpperCase());
    if (status) setStatusFilter(status);
    if (framework) setFrameworkFilter(framework);
    const huntStatus = params.get('hunt_status');
    if (huntStatus) setHuntStatusFilter(huntStatus);
    if (articleId) {
      setArticleIdFilter(parseInt(articleId, 10));
      if (articleTitleParam) setArticleTitle(decodeURIComponent(articleTitleParam));
    }
    if (iocType) setIocTypeFilter(iocType);
    
    setFiltersInitialized(true);
  }, [location.search]);

// Fetch summary WITHOUT filters for total counts (so totals don't change)
  const fetchSummary = useCallback(async () => {
    try {
      // Get unfiltered summary for total counts
      const response = await client.get('/articles/intelligence/summary');
      setSummary(response.data);
    } catch (err) {
      console.error('Failed to fetch summary', err);
    }
  }, []);

  const fetchIntelligence = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (statusFilter) params.status_filter = statusFilter;
      if (intelTypeFilter) params.intel_type = intelTypeFilter;
      if (frameworkFilter) params.mitre_framework = frameworkFilter;
      if (huntStatusFilter) params.hunt_status = huntStatusFilter;
      if (articleIdFilter) params.article_id = articleIdFilter;
      if (iocTypeFilter) params.ioc_type = iocTypeFilter;
      const startDate = getStartDate(timeRange);
      if (startDate) params.start_date = startDate;
      
      const response = await client.get('/articles/intelligence/all', { params });
      setIntelligence(response.data.intelligence || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch intelligence', err);
      setIntelligence([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, intelTypeFilter, frameworkFilter, huntStatusFilter, articleIdFilter, iocTypeFilter, timeRange, getStartDate]);

  const fetchMitreMatrix = async (framework = 'attack') => {
    setMatrixLoading(true);
    try {
      const params = { framework };
      if (statusFilter) params.status_filter = statusFilter;
      
      const response = await client.get('/articles/intelligence/mitre-matrix', { params });
      setMatrixData(response.data);
    } catch (err) {
      console.error('Failed to fetch MITRE matrix', err);
    } finally {
      setMatrixLoading(false);
    }
  };

  // Fetch when filters change
  useEffect(() => {
    if (filtersInitialized) {
      fetchSummary();
      fetchIntelligence();
    }
  }, [filtersInitialized, fetchSummary, fetchIntelligence]);

// Also re-fetch when filter values change
  useEffect(() => {
    if (filtersInitialized) {
      fetchIntelligence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, intelTypeFilter, frameworkFilter, huntStatusFilter, articleIdFilter, iocTypeFilter, timeRange, page, pageSize]);

  const handleFilterChange = (filterFn) => {
    setPage(1);
    filterFn();
  };

  const openMitreMatrix = (framework) => {
    setMatrixVisible(true);
    fetchMitreMatrix(framework);
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select intelligence items first');
      return;
    }
    
    setBulkDeleting(true);
    try {
      let successCount = 0;
      for (const intelId of selectedRowKeys) {
        try {
          await client.delete(`/articles/intelligence/${intelId}`);
          successCount++;
        } catch (e) {
          console.error(`Failed to delete intelligence ${intelId}`, e);
        }
      }
      message.success(`Deleted ${successCount} intelligence items`);
      setSelectedRowKeys([]);
      fetchIntelligence();
      fetchSummary();
    } catch (err) {
      message.error('Failed to delete some items');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Edit intelligence handler
  const handleEdit = (record) => {
    setEditingIntel(record);
    editForm.setFieldsValue({
      value: record.value,
      confidence: record.confidence || 50,
      mitre_id: record.mitre_id,
      ioc_type: record.ioc_type || record.meta?.type,
      evidence: record.evidence,
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      
      await client.patch(`/articles/intelligence/${editingIntel.id}`, {
        value: values.value,
        confidence: values.confidence,
        mitre_id: values.mitre_id,
        meta: { type: values.ioc_type },
        evidence: values.evidence,
      });
      
      message.success('Intelligence updated successfully');
      setEditModalVisible(false);
      setEditingIntel(null);
      editForm.resetFields();
      fetchIntelligence();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to update intelligence');
    } finally {
      setSaving(false);
    }
  };

  // Delete single intelligence
  const handleDelete = async (intelId) => {
    try {
      await client.delete(`/articles/intelligence/${intelId}`);
      message.success('Intelligence deleted');
      fetchIntelligence();
      fetchSummary();
    } catch (err) {
      message.error('Failed to delete intelligence');
    }
  };
  
  // Handle watchlist tile click - always show popup with all watchlists
  const handleWatchlistClick = async () => {
    try {
      // Always fetch and show watchlist in modal - provides quick view for all users
      const response = await watchlistAPI.list();
      setWatchlistKeywords(response.data || []);
      setWatchlistModalVisible(true);
    } catch (err) {
      if (err.response?.status === 403) {
        // User doesn't have access - still show what we can from summary
        setWatchlistKeywords(summary?.active_watchlist_keywords?.map((kw, i) => ({
          id: i,
          keyword: kw,
          is_active: true,
          match_count: 0
        })) || []);
        setWatchlistModalVisible(true);
      } else {
        message.error('Failed to load watchlist');
      }
    }
  };

  // Row selection config
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  const columns = [
    {
      title: 'Type',
      dataIndex: 'intelligence_type',
      key: 'type',
      width: 100,
      render: (type) => {
        const config = INTEL_TYPE_CONFIG[type] || { color: 'default', label: type };
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
      filters: [
        { text: 'IOC', value: 'IOC' },
        { text: 'TTP', value: 'TTP' },
        { text: 'ATLAS', value: 'ATLAS' },
      ],
      onFilter: (value, record) => record.intelligence_type === value,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      width: 200,
      ellipsis: true,
      render: (value, record) => (
        <Tooltip title={value}>
          <Space>
            <Text code style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {value}
            </Text>
            {record.ioc_type && (
              <Tag size="small">{record.ioc_type}</Tag>
            )}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'MITRE Mapping',
      key: 'mitre',
      width: 180,
      render: (_, record) => (
        record.mitre_id ? (
          <Space direction="vertical" size={0}>
            <a href={record.mitre_url} target="_blank" rel="noopener noreferrer">
              <Tag color={record.mitre_framework === 'atlas' ? 'geekblue' : 'purple'}>
                {record.mitre_id}
              </Tag>
            </a>
            {record.mitre_name && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.mitre_name}
              </Text>
            )}
            <Tag size="small">
              {record.mitre_framework === 'atlas' ? 'MITRE ATLAS' : 'MITRE ATT&CK'}
            </Tag>
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Article',
      key: 'article',
      width: 220,
      render: (_, record) => (
        record.article ? (
          <Space direction="vertical" size={0}>
            <Button 
              type="link" 
              size="small"
              style={{ padding: 0, height: 'auto', textAlign: 'left' }}
              onClick={() => navigate(`/articles?article_id=${record.article.id}`)}
            >
              <Tooltip title={record.article.title}>
                <Text style={{ maxWidth: 200 }} ellipsis>
                  {record.article.title}
                </Text>
              </Tooltip>
            </Button>
            <Space size={4}>
              <Tag color={STATUS_COLORS[record.article.status] || 'default'} size="small">
                {record.article.status}
              </Tag>
              {record.article.is_high_priority && (
                <Tag color="red" size="small">High Priority</Tag>
              )}
            </Space>
            {record.article.watchlist_matches?.length > 0 && (
              <Space size={2} wrap style={{ marginTop: 4 }}>
                {record.article.watchlist_matches.slice(0, 3).map(kw => (
                  <Tag key={kw} size="small" color="blue">{kw}</Tag>
                ))}
                {record.article.watchlist_matches.length > 3 && (
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    +{record.article.watchlist_matches.length - 3} more
                  </Text>
                )}
              </Space>
            )}
          </Space>
        ) : <Text type="secondary">-</Text>
      ),
    },
    {
      title: 'Hunt Status',
      key: 'hunt',
      width: 200,
      render: (_, record) => (
        record.hunt ? (
          <Space direction="vertical" size={0}>
            <Space>
              <Tag color="green" icon={<CheckCircleOutlined />}>
                {record.hunt.status}
              </Tag>
              {record.hunt.hits_count > 0 && (
                <Badge count={record.hunt.hits_count} style={{ backgroundColor: '#f5222d' }} />
              )}
            </Space>
            <Space>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.hunt.initiated_by === 'AUTO' ? (
                  <><RobotOutlined /> Auto</>
                ) : (
                  <><UserOutlined /> {record.hunt.initiated_by}</>
                )}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                | {record.hunt.platform}
              </Text>
            </Space>
            {record.hunt.executed_at && (
              <Text type="secondary" style={{ fontSize: 10 }}>
                {new Date(record.hunt.executed_at).toLocaleString()}
              </Text>
            )}
          </Space>
        ) : (
          <Tag icon={<ClockCircleOutlined />}>No Hunt</Tag>
        )
      ),
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (confidence) => (
        <Progress 
          percent={confidence || 50} 
          size="small" 
          status={confidence >= 70 ? 'success' : confidence >= 40 ? 'normal' : 'exception'}
          format={(pct) => `${pct}%`}
        />
      ),
      sorter: (a, b) => (a.confidence || 0) - (b.confidence || 0),
    },
    {
      title: 'Extracted',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      render: (date) => date ? (
        <Tooltip title={new Date(date).toLocaleString()}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {new Date(date).toLocaleDateString()}
          </Text>
        </Tooltip>
      ) : '-',
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button 
              size="small" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this intelligence?"
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={2}>
            <SafetyOutlined /> Intelligence View
          </Title>
          <Text type="secondary">
            Comprehensive view of all extracted IOCs and TTPs with MITRE ATT&CK/ATLAS mapping
          </Text>
        </div>
        <Space>
          <Button icon={<SyncOutlined />} onClick={() => { fetchSummary(); fetchIntelligence(); }}>
            Refresh
          </Button>
          <Button type="primary" onClick={() => openMitreMatrix('attack')}>
            MITRE ATT&CK Matrix
          </Button>
          <Button onClick={() => openMitreMatrix('atlas')}>
            MITRE ATLAS Matrix
          </Button>
        </Space>
      </div>

{/* Summary Stats */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
<Card 
              size="small" 
              className="intel-stat-card total"
              onClick={() => {
                // Clear all filters to show all
                setStatusFilter(null);
                setIntelTypeFilter(null);
                setFrameworkFilter(null);
                setHuntStatusFilter(null);
                setPage(1);
              }}
              style={{ cursor: 'pointer' }}
            >
              <Statistic 
                title="Total Intelligence" 
                value={summary.total_intelligence} 
                prefix={<SafetyOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card 
              size="small" 
              hoverable 
              className={`intel-stat-card ioc ${intelTypeFilter === 'IOC' ? 'active' : ''}`}
              onClick={() => handleFilterChange(() => setIntelTypeFilter(intelTypeFilter === 'IOC' ? null : 'IOC'))}
              style={{ cursor: 'pointer', borderColor: intelTypeFilter === 'IOC' ? '#f5222d' : undefined }}
            >
              <Statistic 
                title="IOCs" 
                value={summary.intelligence_by_type?.IOC || 0} 
                prefix={<BugOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card 
              size="small" 
              hoverable 
              className={`intel-stat-card ttp ${intelTypeFilter === 'TTP' ? 'active' : ''}`}
              onClick={() => handleFilterChange(() => setIntelTypeFilter(intelTypeFilter === 'TTP' ? null : 'TTP'))}
              style={{ cursor: 'pointer', borderColor: intelTypeFilter === 'TTP' ? '#722ed1' : undefined }}
            >
              <Statistic 
                title="TTPs" 
                value={summary.intelligence_by_type?.TTP || 0} 
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card 
              size="small" 
              hoverable 
              className={`intel-stat-card atlas ${intelTypeFilter === 'ATLAS' ? 'active' : ''}`}
              onClick={() => handleFilterChange(() => setIntelTypeFilter(intelTypeFilter === 'ATLAS' ? null : 'ATLAS'))}
              style={{ cursor: 'pointer', borderColor: intelTypeFilter === 'ATLAS' ? '#1890ff' : undefined }}
            >
              <Statistic 
                title="ATLAS" 
                value={summary.intelligence_by_type?.ATLAS || 0} 
                prefix={<RobotOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card 
              size="small" 
              hoverable
              className="intel-stat-card keywords"
              onClick={handleWatchlistClick}
              style={{ cursor: 'pointer' }}
            >
              <Statistic 
                title="Active Keywords" 
                value={summary.active_watchlist_keywords?.length || 0} 
                prefix={<EyeOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}
      
      {/* Watchlist Modal - Shows all watchlist keywords in popup */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: 'var(--warning)' }} />
            <span>Watchlist Keywords</span>
            <Tag color="blue">{watchlistKeywords.length} total</Tag>
          </Space>
        }
        open={watchlistModalVisible}
        onCancel={() => setWatchlistModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setWatchlistModalVisible(false)}>
            Close
          </Button>,
          <Button 
            key="navigate" 
            type="primary"
            onClick={() => {
              setWatchlistModalVisible(false);
              navigate('/watchlist');
            }}
          >
            Go to Watchlist Page
          </Button>
        ]}
        width={600}
      >
        {watchlistKeywords.length === 0 ? (
          <Empty description="No watchlist keywords configured" />
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <Row gutter={[8, 8]}>
              {watchlistKeywords.map((kw) => (
                <Col key={kw.id} span={12}>
                  <Card size="small" style={{ marginBottom: 0 }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space>
                        <Tag color={kw.is_active ? 'green' : 'default'}>
                          {kw.is_active ? 'Active' : 'Inactive'}
                        </Tag>
                        <Text strong>{kw.keyword}</Text>
                      </Space>
                      {kw.match_count > 0 && (
                        <Badge count={kw.match_count} style={{ backgroundColor: '#fa8c16' }} />
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Modal>

{/* Article Filter Banner - Shows when filtering by specific article */}
      {articleIdFilter && (
        <Alert
          message={
            <Space>
              <FileTextOutlined />
              <span>Showing IOCs from article: <strong>{articleTitle || `Article #${articleIdFilter}`}</strong></span>
            </Space>
          }
          type="info"
          showIcon
          closable
          onClose={() => {
            setArticleIdFilter(null);
            setArticleTitle(null);
            // Update URL to remove article_id param
            const params = new URLSearchParams(location.search);
            params.delete('article_id');
            params.delete('article_title');
            navigate({ search: params.toString() }, { replace: true });
          }}
          style={{ marginBottom: 16 }}
          action={
            <Button 
              size="small" 
              type="primary" 
              onClick={() => navigate(`/articles?article_id=${articleIdFilter}`)}
            >
              View Article
            </Button>
          }
        />
      )}

{/* IOCs by Article Status - Prettier Buttons */}
      {summary?.articles_with_intel_by_status && (
        <Card size="small" style={{ marginBottom: 16 }} className="status-filter-card">
          <div className="status-filter-header">
            <Text strong><FilterOutlined style={{ marginRight: 8 }} />IOCs by Article Status:</Text>
            {statusFilter && (
              <Button 
                size="small" 
                type="text" 
                danger 
                onClick={() => handleFilterChange(() => setStatusFilter(null))}
              >
                Clear Filter
              </Button>
            )}
          </div>
          <div className="status-filter-buttons">
            {Object.entries(summary.articles_with_intel_by_status).map(([status, count]) => (
              <Button
                key={status}
                className={`status-filter-btn ${statusFilter === status ? 'active' : ''}`}
                onClick={() => handleFilterChange(() => setStatusFilter(statusFilter === status ? null : status))}
                style={{
                  borderColor: statusFilter === status ? 'var(--primary)' : undefined,
                  background: statusFilter === status ? 'rgba(var(--primary-rgb), 0.1)' : undefined,
                }}
              >
                <span className={`status-indicator status-${status.toLowerCase().replace('_', '-')}`}></span>
                <span className="status-label">{status.replace('_', ' ')}</span>
                <Badge 
                  count={count} 
                  showZero 
                  style={{ 
                    backgroundColor: STATUS_COLORS[status] === 'default' ? '#d9d9d9' : 
                      STATUS_COLORS[status] === 'blue' ? '#1890ff' :
                      STATUS_COLORS[status] === 'orange' ? '#fa8c16' :
                      STATUS_COLORS[status] === 'purple' ? '#722ed1' :
                      STATUS_COLORS[status] === 'green' ? '#52c41a' : '#d9d9d9',
                    marginLeft: 8 
                  }} 
                />
              </Button>
            ))}
          </div>
        </Card>
      )}

{/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text strong><FilterOutlined /> Filters:</Text>
          <Select
            placeholder="Article Status"
            allowClear
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(val) => handleFilterChange(() => setStatusFilter(val))}
          >
            <Option value="NEW">New</Option>
            <Option value="IN_ANALYSIS">In Analysis</Option>
            <Option value="NEED_TO_HUNT">Need to Hunt</Option>
            <Option value="REVIEWED">Reviewed</Option>
            <Option value="ARCHIVED">Archived</Option>
          </Select>
          <Select
            placeholder="Intel Type"
            allowClear
            style={{ width: 120 }}
            value={intelTypeFilter}
            onChange={(val) => handleFilterChange(() => setIntelTypeFilter(val))}
          >
            <Option value="IOC">IOC</Option>
            <Option value="TTP">TTP</Option>
            <Option value="ATLAS">ATLAS</Option>
          </Select>
          <Select
            placeholder="MITRE Framework"
            allowClear
            style={{ width: 150 }}
            value={frameworkFilter}
            onChange={(val) => handleFilterChange(() => setFrameworkFilter(val))}
          >
            <Option value="attack">MITRE ATT&CK</Option>
            <Option value="atlas">MITRE ATLAS</Option>
          </Select>
          <Select
            placeholder="IOC Type"
            allowClear
            style={{ width: 140 }}
            value={iocTypeFilter}
            onChange={(val) => handleFilterChange(() => setIocTypeFilter(val))}
          >
            <Option value="ip">IP Address</Option>
            <Option value="domain">Domain</Option>
            <Option value="url">URL</Option>
            <Option value="hash_md5">Hash (MD5)</Option>
            <Option value="hash_sha1">Hash (SHA1)</Option>
            <Option value="hash_sha256">Hash (SHA256)</Option>
            <Option value="email">Email</Option>
            <Option value="file_name">File Name</Option>
            <Option value="filepath">File Path</Option>
            <Option value="cve">CVE</Option>
            <Option value="registry">Registry Key</Option>
          </Select>
          <Select
            placeholder="Hunt Status"
            allowClear
            style={{ width: 150 }}
            value={huntStatusFilter}
            onChange={(val) => handleFilterChange(() => setHuntStatusFilter(val))}
          >
            <Option value="NO_HUNT">No Hunt</Option>
            <Option value="PENDING">Pending</Option>
            <Option value="RUNNING">Running</Option>
            <Option value="COMPLETED">Completed</Option>
            <Option value="FAILED">Failed</Option>
            <Option value="WITH_HITS">With Hits</Option>
          </Select>
          <Button
            onClick={() => {
              setStatusFilter(null);
              setIntelTypeFilter(null);
              setFrameworkFilter(null);
              setHuntStatusFilter(null);
              setPage(1);
            }}
          >
            Clear All
          </Button>
          <Text type="secondary">
            Showing {intelligence.length} of {total} items
          </Text>
        </Space>
      </Card>

      {/* Intelligence Table */}
      <Card>
        {/* Bulk Actions Bar */}
        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: 16, padding: '8px 16px', background: '#fff1f0', borderRadius: 4 }}>
            <Space>
              <Text strong>{selectedRowKeys.length} item(s) selected</Text>
              <Divider type="vertical" />
              <Popconfirm
                title={`Delete ${selectedRowKeys.length} intelligence items?`}
                description="This action cannot be undone."
                onConfirm={handleBulkDelete}
                okText="Delete All"
                okButtonProps={{ danger: true }}
              >
                <Button 
                  size="small" 
                  danger 
                  icon={<DeleteOutlined />}
                  loading={bulkDeleting}
                >
                  Delete Selected
                </Button>
              </Popconfirm>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>Clear Selection</Button>
            </Space>
          </div>
        )}
        
        <Table
          columns={columns}
          dataSource={intelligence}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100', '200'],
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} items`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); }
          }}
          scroll={{ x: 1200 }}
          size="small"
          locale={{
            emptyText: (
              <Empty 
                description="No intelligence extracted yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Paragraph type="secondary">
                  Intelligence is extracted when articles are triaged or hunts are executed
                </Paragraph>
              </Empty>
            )
          }}
        />
      </Card>

      {/* MITRE Matrix Modal */}
      <Modal
        title={
          <Space>
            <SafetyOutlined />
            {matrixData?.framework === 'atlas' ? 'MITRE ATLAS Matrix' : 'MITRE ATT&CK Matrix'}
          </Space>
        }
        open={matrixVisible}
        onCancel={() => setMatrixVisible(false)}
        width={900}
        footer={null}
      >
        {matrixLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : matrixData ? (
          <div>
            <Alert
              message={`${matrixData.total_techniques} techniques detected across your intelligence`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            {Object.entries(matrixData.tactics || {}).length > 0 ? (
              <Tabs
                tabPosition="left"
                items={Object.entries(matrixData.tactics).map(([tactic, techniques]) => ({
                  key: tactic,
                  label: (
                    <Badge count={techniques.length} offset={[10, 0]}>
                      {tactic}
                    </Badge>
                  ),
                  children: (
                    <Table
                      size="small"
                      dataSource={techniques}
                      rowKey="technique_id"
                      pagination={false}
                      columns={[
                        {
                          title: 'Technique',
                          dataIndex: 'technique_id',
                          render: (id, record) => (
                            <a href={record.url} target="_blank" rel="noopener noreferrer">
                              <Tag color="purple">{id}</Tag>
                            </a>
                          )
                        },
                        {
                          title: 'Occurrences',
                          dataIndex: 'count',
                          render: (count) => <Badge count={count} showZero style={{ backgroundColor: '#722ed1' }} />
                        },
                        {
                          title: 'Articles',
                          dataIndex: 'article_count',
                          render: (count) => <Badge count={count} showZero style={{ backgroundColor: '#1890ff' }} />
                        },
                      ]}
                    />
                  )
                }))}
              />
            ) : (
              <Empty description="No MITRE techniques found in current data" />
            )}
          </div>
        ) : null}
      </Modal>

      {/* Edit Intelligence Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            Edit Intelligence
          </Space>
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingIntel(null);
          editForm.resetFields();
        }}
        onOk={handleSaveEdit}
        confirmLoading={saving}
        okText="Save Changes"
        okButtonProps={{ icon: <SaveOutlined /> }}
      >
        {editingIntel && (
          <Form
            form={editForm}
            layout="vertical"
          >
            <Alert
              message={`Editing ${editingIntel.intelligence_type} from article`}
              description={editingIntel.article?.title}
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            <Form.Item
              name="value"
              label="Value"
              rules={[{ required: true, message: 'Value is required' }]}
            >
              <Input.TextArea 
                rows={2} 
                placeholder="IOC value or TTP name"
              />
            </Form.Item>
            
            {editingIntel.intelligence_type === 'IOC' && (
              <Form.Item
                name="ioc_type"
                label="IOC Type"
              >
                <Select placeholder="Select IOC type">
                  <Select.Option value="ip">IP Address</Select.Option>
                  <Select.Option value="domain">Domain</Select.Option>
                  <Select.Option value="url">URL</Select.Option>
                  <Select.Option value="hash_md5">MD5 Hash</Select.Option>
                  <Select.Option value="hash_sha1">SHA1 Hash</Select.Option>
                  <Select.Option value="hash_sha256">SHA256 Hash</Select.Option>
                  <Select.Option value="email">Email</Select.Option>
                  <Select.Option value="file_name">File Name</Select.Option>
                  <Select.Option value="cve">CVE</Select.Option>
                  <Select.Option value="registry">Registry Key</Select.Option>
                  <Select.Option value="user_agent">User Agent</Select.Option>
                </Select>
              </Form.Item>
            )}
            
            {(editingIntel.intelligence_type === 'TTP' || editingIntel.intelligence_type === 'ATLAS') && (
              <Form.Item
                name="mitre_id"
                label="MITRE ID"
              >
                <Input placeholder="e.g., T1059.001 or AML.T0043" />
              </Form.Item>
            )}
            
            <Form.Item
              name="confidence"
              label="Confidence Score"
            >
              <InputNumber 
                min={0} 
                max={100} 
                style={{ width: '100%' }}
                addonAfter="%"
              />
            </Form.Item>
            
            <Form.Item
              name="evidence"
              label="Evidence / Context"
            >
              <Input.TextArea 
                rows={3} 
                placeholder="Supporting evidence or context for this intelligence"
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}

export default Intelligence;
