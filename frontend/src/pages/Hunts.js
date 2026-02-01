import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Table, Card, Button, Space, Tag, Modal, Select, 
  Drawer, Tabs, Spin, Alert, Typography, Descriptions,
  Timeline, Badge, Tooltip, message, Empty, Checkbox,
  Row, Col, Statistic, Progress, Divider, Collapse, Input
} from 'antd';
import { 
  PlayCircleOutlined, 
  EyeOutlined, 
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  BugOutlined,
  FileTextOutlined,
  WarningOutlined,
  SyncOutlined,
  DeleteOutlined,
  CodeOutlined,
  CopyOutlined,
  RobotOutlined,
  LinkOutlined,
  ApiOutlined,
  SearchOutlined,
  EditOutlined,
  MailOutlined,
  SlackOutlined,
  FormOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined
} from '@ant-design/icons';
import { huntsAPI, articlesAPI, connectorsAPI } from '../api/client';
import { useTimezone } from '../context/TimezoneContext';
import './Hunts.css';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

function Hunts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatDateTime, getRelativeTime } = useTimezone();
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState([]);
  const [reviewedArticles, setReviewedArticles] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['defender']);
  const [extractFirst, setExtractFirst] = useState(true);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionResults, setExtractionResults] = useState(null);
  const [hunts, setHunts] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('reviewed');
  const [statusFilter, setStatusFilter] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedHunt, setSelectedHunt] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [error, setError] = useState('');
  
  // Platforms from registry
  const [platforms, setPlatforms] = useState([]);
  
  // Query preview state
  const [queryPreviewVisible, setQueryPreviewVisible] = useState(false);
  const [queryPreview, setQueryPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewArticle, setPreviewArticle] = useState(null);
  const [previewPlatform, setPreviewPlatform] = useState('defender');
  
  // Selected hunts for deletion
  const [selectedHunts, setSelectedHunts] = useState([]);
  
  // Hunt executions state for status monitoring
  const [allExecutions, setAllExecutions] = useState([]);
  const [executionsLoading, setExecutionsLoading] = useState(false);
  
  // Edit hunt state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingHunt, setEditingHunt] = useState(null);
  const [editedQuery, setEditedQuery] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [createNewVersion, setCreateNewVersion] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // SLA breach filter
  const [slaBreachOnly, setSlaBreachOnly] = useState(false);
  
  // Search for executions by article name/ID or hunt ID
  const [executionSearch, setExecutionSearch] = useState('');
  
  // SLA thresholds for hunts in hours
  const SLA_THRESHOLDS = {
    PENDING: 2, // Pending hunts should be executed within 2 hours
    RUNNING: 4, // Running hunts should complete within 4 hours
  };
  
  // Helper function to check if hunt is breaching SLA
  const isHuntBreachingSLA = (hunt) => {
    if (!hunt.created_at) return false;
    const threshold = SLA_THRESHOLDS[hunt.status];
    if (!threshold) return false; // Completed/Failed statuses don't have SLA
    const ageHours = (Date.now() - new Date(hunt.created_at).getTime()) / (1000 * 60 * 60);
    return ageHours > threshold;
  };

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const slaBreach = params.get('sla_breach');
    if (status) {
      setStatusFilter(status.toUpperCase());
      // Switch to hunts tab if filtering by status
      setActiveTab('hunts');
    }
    if (slaBreach === 'true') {
      setSlaBreachOnly(true);
      setActiveTab('hunts');
    }
  }, [location.search]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch platforms from registry (only those with 'hunt' capability)
      try {
        const platformsRes = await connectorsAPI.listPlatforms({ capability: 'hunt', active_only: true });
        setPlatforms(platformsRes.data || []);
        // Set default selected platform if none selected
        if (platformsRes.data?.length > 0 && selectedPlatforms.length === 0) {
          setSelectedPlatforms([platformsRes.data[0].platform_id]);
        }
      } catch (e) {
        console.warn('Failed to load platforms from registry, using defaults');
        // Fallback to common platforms
        setPlatforms([
          { platform_id: 'defender', name: 'Microsoft Defender', color: '#00BCF2', query_language: 'KQL' },
          { platform_id: 'xsiam', name: 'Palo Alto XSIAM', color: '#FF6B00', query_language: 'XQL' },
          { platform_id: 'splunk', name: 'Splunk', color: '#65A637', query_language: 'SPL' },
          { platform_id: 'wiz', name: 'Wiz', color: '#6B4FBB', query_language: 'GraphQL' },
        ]);
      }
      
      // Fetch articles marked as "Need to Hunt"
      const needToHuntRes = await articlesAPI.getTriageQueue(1, 100, 'NEED_TO_HUNT', false, null);
      setReviewedArticles(needToHuntRes.data.articles || []);
      
      // Fetch all articles
      const articlesRes = await articlesAPI.getTriageQueue(1, 50, null, false, null);
      setArticles(articlesRes.data.articles || []);
      
      // Fetch hunts
      const huntsRes = await huntsAPI.list(1, 100);
      const huntsList = huntsRes.data || [];
      setHunts(huntsList);
      
      // Fetch stats
      const statsRes = await huntsAPI.getStats();
      
      // Calculate SLA breaches from hunts
      const slaBreaches = huntsList.filter(hunt => {
        if (!hunt.created_at) return false;
        const threshold = SLA_THRESHOLDS[hunt.status];
        if (!threshold) return false;
        const ageHours = (Date.now() - new Date(hunt.created_at).getTime()) / (1000 * 60 * 60);
        return ageHours > threshold;
      }).length;
      
      setStats({ ...statsRes.data, sla_breaches: slaBreaches });
      
      // Fetch all executions for each hunt (to show in executions tab)
      await fetchAllExecutions(huntsList);
    } catch (err) {
      console.error('Failed to load data', err);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllExecutions = async (huntsList) => {
    setExecutionsLoading(true);
    try {
      const execPromises = huntsList.map(async (hunt) => {
        try {
          const response = await huntsAPI.getExecutions(hunt.id);
          return (response.data || []).map(exec => ({
            ...exec,
            hunt_platform: hunt.platform,
            hunt_query: hunt.query_logic,
            article_id: hunt.article_id
          }));
        } catch {
          return [];
        }
      });
      
      const results = await Promise.all(execPromises);
      const allExecs = results.flat().sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setAllExecutions(allExecs);
    } catch (err) {
      console.error('Failed to fetch executions', err);
    } finally {
      setExecutionsLoading(false);
    }
  };

  const handleExtractIntelligence = async () => {
    if (selectedArticles.length === 0) {
      message.warning('Please select at least one article');
      return;
    }
    
    setExtracting(true);
    setExtractionResults(null);
    try {
      const response = await huntsAPI.extract(selectedArticles);
      setExtractionResults(response.data);
      message.success(`Extracted intelligence from ${selectedArticles.length} articles`);
      fetchData(); // Refresh data
    } catch (err) {
      message.error(err.response?.data?.detail || 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleBatchHunt = async () => {
    if (selectedArticles.length === 0) {
      message.warning('Please select at least one article');
      return;
    }
    if (selectedPlatforms.length === 0) {
      message.warning('Please select at least one platform');
      return;
    }
    
    setProcessingBatch(true);
    setBatchResults(null);
    try {
      const response = await huntsAPI.batchHunt(selectedArticles, selectedPlatforms, extractFirst);
      setBatchResults(response.data);
      message.success(`Generated ${response.data.results?.reduce((acc, r) => acc + r.hunts?.length, 0) || 0} hunts`);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Batch hunt failed');
    } finally {
      setProcessingBatch(false);
    }
  };

  const handleViewHunt = async (hunt) => {
    setSelectedHunt(hunt);
    try {
      const response = await huntsAPI.getExecutions(hunt.id);
      setExecutions(response.data || []);
    } catch (err) {
      setExecutions([]);
    }
    setDrawerVisible(true);
  };

  const handleExecuteHunt = async (huntId) => {
    try {
      const response = await huntsAPI.execute(huntId);
      message.success('Hunt execution started - check Hunt Executions below');
      
      // Immediately add the new execution to the allExecutions list
      if (response.data?.id) {
        const hunt = hunts.find(h => h.id === huntId);
        const newExecution = {
          ...response.data,
          hunt_id: huntId,
          hunt_platform: hunt?.platform,
          hunt_query: hunt?.query_logic,
          article_id: hunt?.article_id,
          status: response.data.status || 'RUNNING',
          created_at: new Date().toISOString()
        };
        setAllExecutions(prev => [newExecution, ...prev]);
      }
      
      // Refresh full data
      fetchData();
      
      // Scroll to executions section
      setTimeout(() => {
        document.querySelector('.hunt-executions-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Execution failed');
    }
  };

  const handleDeleteHunt = async (huntId) => {
    try {
      await huntsAPI.delete(huntId);
      message.success('Hunt deleted');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  const handleDeleteSelectedHunts = async () => {
    if (selectedHunts.length === 0) {
      message.warning('Please select hunts to delete');
      return;
    }
    try {
      await huntsAPI.deleteBatch(selectedHunts);
      message.success(`Deleted ${selectedHunts.length} hunts`);
      setSelectedHunts([]);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  // Edit hunt handlers
  const handleEditHunt = (hunt) => {
    setEditingHunt(hunt);
    setEditedQuery(hunt.query_logic || '');
    setEditedTitle(hunt.title || '');
    setCreateNewVersion(true); // Default to creating new version
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingHunt) return;
    
    setSaving(true);
    try {
      await huntsAPI.update(editingHunt.id, {
        query_logic: editedQuery,
        title: editedTitle,
        create_new_version: createNewVersion
      });
      
      message.success(createNewVersion ? 'New hunt version created' : 'Hunt updated');
      setEditModalVisible(false);
      setEditingHunt(null);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to update hunt');
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewQuery = async (articleId, platform) => {
    setPreviewLoading(true);
    setPreviewArticle(articleId);
    setPreviewPlatform(platform);
    setQueryPreviewVisible(true);
    setQueryPreview(null);
    try {
      const response = await huntsAPI.previewQuery(articleId, platform);
      setQueryPreview(response.data);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to generate query preview');
      setQueryPreview({ error: err.response?.data?.detail || 'Failed to generate query' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const copyQueryToClipboard = (query) => {
    navigator.clipboard.writeText(query);
    message.success('Query copied to clipboard');
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      PENDING: { color: 'default', icon: <ClockCircleOutlined /> },
      RUNNING: { color: 'processing', icon: <LoadingOutlined /> },
      COMPLETED: { color: 'success', icon: <CheckCircleOutlined /> },
      FAILED: { color: 'error', icon: <CloseCircleOutlined /> },
      PARTIAL: { color: 'warning', icon: <ClockCircleOutlined /> },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return <Tag color={config.color} icon={config.icon}>{status}</Tag>;
  };

  const getPlatformColor = (platformId) => {
    // First try to find from loaded platforms
    const platform = platforms.find(p => p.platform_id === platformId?.toLowerCase());
    if (platform?.color) return platform.color;
    
    // Fallback defaults
    const colors = {
      xsiam: '#FF6B00',
      defender: '#00BCF2',
      splunk: '#65A637',
      wiz: '#6B4FBB',
      sentinel: '#0078D4',
      crowdstrike: '#E01E5A',
      chronicle: '#4285F4',
    };
    return colors[platformId?.toLowerCase()] || '#666';
  };
  
  const getPlatformName = (platformId) => {
    const platform = platforms.find(p => p.platform_id === platformId?.toLowerCase());
    return platform?.name || platformId?.toUpperCase() || 'Unknown';
  };

  const articleColumns = [
    {
      title: '',
      key: 'select',
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={selectedArticles.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedArticles([...selectedArticles, record.id]);
            } else {
              setSelectedArticles(selectedArticles.filter(id => id !== record.id));
            }
          }}
        />
      ),
    },
    {
      title: 'Article',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Space>
            {record.is_high_priority && <Badge status="error" />}
            <Tooltip title="Click to view article details, change status, or add comments">
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: 'auto', textAlign: 'left', fontWeight: 600 }}
                onClick={() => navigate(`/articles?article_id=${record.id}`)}
              >
                {text?.substring(0, 50)}...
              </Button>
            </Tooltip>
          </Space>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.source_name || 'Unknown'} • <a onClick={(e) => { e.stopPropagation(); navigate(`/articles?article_id=${record.id}`); }} style={{ cursor: 'pointer' }}>View Details</a>
          </Text>
        </Space>
      ),
    },
    {
      title: 'Intel',
      key: 'intel',
      width: 80,
      render: (_, record) => {
        const intelCount = record.intelligence_count || 
                          (record.extracted_iocs?.length || 0) + (record.extracted_ttps?.length || 0) || 
                          0;
        return (
          <Tooltip title={intelCount > 0 ? `Click to view ${intelCount} IOCs/TTPs on Intelligence page` : 'No intelligence extracted'}>
            {intelCount > 0 ? (
              <Tag 
                icon={<BugOutlined />} 
                color="red"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  // Navigate to Intelligence page filtered by this article
                  const articleTitle = encodeURIComponent(record.title || '');
                  navigate(`/intelligence?article_id=${record.id}&article_title=${articleTitle}`);
                }}
              >
                {intelCount}
              </Tag>
            ) : (
              <Tag icon={<BugOutlined />}>0</Tag>
            )}
          </Tooltip>
        );
      },
    },
    {
      title: 'Hunts',
      key: 'hunts',
      width: 80,
      render: (_, record) => {
        const huntsCount = record.hunt_status?.length || 0;
        const hasHunts = huntsCount > 0;
        return hasHunts ? (
          <Tooltip title={`Click to view ${huntsCount} hunt(s)`}>
            <Tag 
              color="green" 
              icon={<CheckCircleOutlined />}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                // Navigate to articles page, filtered by this article's hunts
                navigate(`/articles?article_id=${record.id}&tab=hunts`);
              }}
            >
              {huntsCount}
            </Tag>
          </Tooltip>
        ) : (
          <Tooltip title="No hunts yet">
            <Tag icon={<ClockCircleOutlined />}>0</Tag>
          </Tooltip>
        );
      },
    },
  ];

  // Get latest execution status for a hunt
  const getHuntExecutionStatus = (huntId) => {
    const huntExecs = allExecutions.filter(e => e.hunt_id === huntId);
    if (huntExecs.length === 0) return null;
    
    // Return the most recent execution
    const sorted = huntExecs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return sorted[0];
  };

  const huntColumns = [
    {
      title: (
        <Checkbox
          checked={selectedHunts.length > 0 && selectedHunts.length === hunts.length}
          indeterminate={selectedHunts.length > 0 && selectedHunts.length < hunts.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedHunts(hunts.map(h => h.id));
            } else {
              setSelectedHunts([]);
            }
          }}
        />
      ),
      key: 'select',
      width: 40,
      render: (_, record) => (
        <Checkbox
          checked={selectedHunts.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedHunts([...selectedHunts, record.id]);
            } else {
              setSelectedHunts(selectedHunts.filter(id => id !== record.id));
            }
          }}
        />
      ),
    },
    {
      title: 'Title',
      key: 'title',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 14 }}>
            {record.title || `Hunt #${record.id}`}
          </Text>
          {record.parent_hunt_id && (
            <Tag size="small" color="blue">v{record.id} (edited)</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Article',
      key: 'article',
      width: 200,
      render: (_, record) => {
        const article = articles.find(a => a.id === record.article_id) || 
                       reviewedArticles.find(a => a.id === record.article_id);
        return (
          <Space direction="vertical" size={0}>
            <Tooltip title="Click to view article details, change status, or add comments">
              <Button 
                type="link" 
                size="small" 
                style={{ padding: 0, height: 'auto', textAlign: 'left' }}
                onClick={() => navigate(`/articles?article_id=${record.article_id}`)}
              >
                <Text style={{ maxWidth: 180, fontSize: 13 }} ellipsis>
                  {article?.title?.substring(0, 40) || `Article #${record.article_id}`}
                </Text>
              </Button>
            </Tooltip>
            <Space size={8} style={{ fontSize: 11 }}>
              <a onClick={(e) => { e.stopPropagation(); navigate(`/articles?article_id=${record.article_id}`); }} style={{ cursor: 'pointer' }}>
                View Details
              </a>
              {article?.url && (
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  <LinkOutlined /> Original
                </a>
              )}
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (platform) => (
        <Tag color={getPlatformColor(platform)} style={{ fontSize: 12 }}>{platform?.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const lastExec = getHuntExecutionStatus(record.id);
        // Hunt status
        const huntStatus = record.status || 'PENDING';
        const statusConfig = {
          'PENDING': { color: 'default', text: 'Not Run', icon: <ClockCircleOutlined /> },
          'IN_PROGRESS': { color: 'processing', text: 'Running', icon: <LoadingOutlined /> },
          'COMPLETED': { color: 'success', text: 'Completed', icon: <CheckCircleOutlined /> },
          'FAILED': { color: 'error', text: 'Failed', icon: <CloseCircleOutlined /> },
        };
        const config = statusConfig[huntStatus] || statusConfig['PENDING'];
        
        return (
          <Space direction="vertical" size={0}>
            <Tag color={config.color} icon={config.icon} style={{ fontSize: 12 }}>
              {config.text}
            </Tag>
            {lastExec?.results?.results_count > 0 && (
              <Text type="danger" style={{ fontSize: 12 }}>
                {lastExec.results.results_count} hits
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Initiated By',
      key: 'initiated_by',
      width: 100,
      render: (_, record) => {
        const typeConfig = {
          'USER': { icon: null, color: 'blue' },
          'AUTO': { icon: <RobotOutlined />, color: 'green' },
          'GENAI': { icon: <RobotOutlined />, color: 'purple' },
        };
        const config = typeConfig[record.initiated_by_type] || typeConfig['USER'];
        return (
          <Tag color={config.color} icon={config.icon} style={{ fontSize: 12 }}>
            {record.initiated_by_type || 'USER'}
          </Tag>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created',
      width: 100,
      render: (date) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <Text style={{ fontSize: 12 }}>{new Date(date).toLocaleDateString()}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => {
        const isRunning = record.status === 'IN_PROGRESS';
        return (
          <Space wrap size={4}>
            <Tooltip title="View query">
              <Button size="small" icon={<CodeOutlined />} onClick={() => handleViewHunt(record)} />
            </Tooltip>
            <Tooltip title={isRunning ? "Cannot edit while running" : "Edit query"}>
              <Button 
                size="small" 
                icon={<FileTextOutlined />} 
                disabled={isRunning}
                onClick={() => handleEditHunt(record)}
              />
            </Tooltip>
            <Tooltip title="Run hunt">
              <Button 
                size="small" 
                type="primary"
                icon={<PlayCircleOutlined />} 
                disabled={isRunning}
                onClick={() => handleExecuteHunt(record.id)}
              />
            </Tooltip>
            <Tooltip title="Delete hunt">
              <Button 
                size="small" 
                danger
                icon={<DeleteOutlined />} 
                disabled={isRunning}
                onClick={() => {
                  Modal.confirm({
                    title: 'Delete Hunt',
                    content: 'Are you sure you want to delete this hunt?',
                    okText: 'Delete',
                    okType: 'danger',
                    onOk: () => handleDeleteHunt(record.id)
                  });
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="hunts-container">
      <div className="hunts-header">
        <div>
          <Title level={2}>
            <ThunderboltOutlined /> Threat Hunt Workbench
          </Title>
          <Text type="secondary">
            Extract intelligence and run hunts across XSIAM, Defender, Splunk, and Wiz
          </Text>
        </div>
        <Button icon={<SyncOutlined />} onClick={fetchData} loading={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon closable onClose={() => setError('')} style={{ marginBottom: 16 }} />
      )}

      {/* Stats Row - Clickable Tiles - All in one row */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col flex="1">
            <Card 
              size="small" 
              hoverable
              onClick={() => { setActiveTab('all'); setStatusFilter(null); }}
              className="hunt-stat-card"
            >
              <Statistic 
                title="Total Hunts" 
                value={stats.total_hunts} 
                prefix={<ThunderboltOutlined style={{ color: 'var(--primary)' }} />} 
                valueStyle={{ fontSize: 20 }} 
              />
            </Card>
          </Col>
          <Col flex="1">
            <Card 
              size="small"
              hoverable
              onClick={() => { setActiveTab('reviewed'); setStatusFilter(null); }}
              className="hunt-stat-card"
            >
              <Statistic 
                title="Need to Hunt" 
                value={reviewedArticles.length} 
                prefix={<SearchOutlined style={{ color: 'var(--warning)' }} />}
                valueStyle={{ fontSize: 20 }} 
              />
            </Card>
          </Col>
          <Col flex="1">
            <Card 
              size="small"
              hoverable
              onClick={() => navigate('/articles?status=HUNT_GENERATED')}
              className="hunt-stat-card generated"
            >
              <Statistic 
                title="Hunt Generated" 
                value={stats.hunt_generated || articles.filter(a => a.status === 'HUNT_GENERATED').length} 
                prefix={<RobotOutlined style={{ color: 'var(--info)' }} />}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col flex="1">
            <Card 
              size="small"
              hoverable
              onClick={() => { 
                setStatusFilter(statusFilter === 'COMPLETED' ? null : 'COMPLETED');
                setSlaBreachOnly(false);
                document.querySelector('.hunt-executions-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`hunt-stat-card completed ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
            >
              <Statistic 
                title="Completed" 
                value={stats.executions?.completed || 0} 
                prefix={<CheckCircleOutlined style={{ color: 'var(--success)' }} />}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col flex="1">
            <Card 
              size="small"
              hoverable
              onClick={() => { 
                setStatusFilter(statusFilter === 'RUNNING' ? null : 'RUNNING');
                setSlaBreachOnly(false);
                document.querySelector('.hunt-executions-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`hunt-stat-card running ${statusFilter === 'RUNNING' ? 'active' : ''}`}
            >
              <Statistic 
                title="Running" 
                value={stats.executions?.pending || 0} 
                prefix={<LoadingOutlined style={{ color: 'var(--primary)' }} />}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col flex="1">
            <Card 
              size="small"
              hoverable
              onClick={() => { 
                setStatusFilter(statusFilter === 'FAILED' ? null : 'FAILED');
                setSlaBreachOnly(false);
                document.querySelector('.hunt-executions-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`hunt-stat-card failed ${statusFilter === 'FAILED' ? 'active' : ''}`}
            >
              <Statistic 
                title="Failed" 
                value={stats.executions?.failed || 0} 
                prefix={<CloseCircleOutlined style={{ color: 'var(--danger)' }} />}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col flex="1">
            <Tooltip title="Hunts exceeding SLA time thresholds (PENDING > 2h, RUNNING > 4h)">
              <Card 
                size="small"
                hoverable
                onClick={() => { 
                  setStatusFilter(null);
                  setSlaBreachOnly(!slaBreachOnly);
                  setActiveTab('hunts');
                }}
                className={`hunt-stat-card sla-breach ${slaBreachOnly ? 'active' : ''}`}
                style={{ 
                  borderColor: (stats?.sla_breaches || 0) > 0 ? 'var(--danger)' : undefined,
                  background: (stats?.sla_breaches || 0) > 0 ? 'rgba(255, 77, 79, 0.05)' : undefined
                }}
              >
                <Statistic 
                  title="SLA Breaches" 
                  value={stats?.sla_breaches || 0} 
                  prefix={<FieldTimeOutlined style={{ color: (stats?.sla_breaches || 0) > 0 ? 'var(--danger)' : 'var(--text-secondary)' }} />}
                  valueStyle={{ fontSize: 20, color: (stats?.sla_breaches || 0) > 0 ? 'var(--danger)' : undefined }}
                />
              </Card>
            </Tooltip>
          </Col>
          <Col flex="1">
            <Card 
              size="small"
              hoverable
              onClick={() => { setStatusFilter(null); setSlaBreachOnly(false); navigate('/articles?status=HUNT_GENERATED'); }}
              className="hunt-stat-card"
            >
              <Statistic 
                title="Articles w/ Hunts" 
                value={stats.articles_with_hunts}
                prefix={<FileTextOutlined style={{ color: 'var(--text-secondary)' }} />}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={16} className="hunt-workflow-section" align="stretch">
        {/* Left: Article Selection */}
        <Col span={12}>
          <Card 
            className="hunt-step-card hunt-article-selection"
            title={
              <Space>
                <SearchOutlined />
                <span>Articles Pending Hunt</span>
                <Tag color="orange">{reviewedArticles.length} available</Tag>
                {selectedArticles.length > 0 && (
                  <Tag color="blue">{selectedArticles.length} selected</Tag>
                )}
              </Space>
            }
          >
            {/* Articles that need hunts */}
            <Table
              dataSource={reviewedArticles}
              columns={articleColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 6, size: 'small' }}
              loading={loading}
              scroll={{ y: 340 }}
              locale={{ emptyText: 'No articles pending hunts. Mark articles for hunting from the Article Queue.' }}
            />
            
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button 
                size="small"
                onClick={() => {
                  setSelectedArticles(reviewedArticles.map(a => a.id));
                }}
              >
                Select All ({reviewedArticles.length})
              </Button>
              <Button size="small" onClick={() => setSelectedArticles([])}>
                Clear
              </Button>
            </div>
          </Card>
        </Col>

        {/* Right: Steps 1-3 - Compact to match left */}
        <Col span={12}>
          <div className="hunt-steps-container">
            {/* Step 1: Extract */}
            <Card 
              className="hunt-step-card hunt-step-compact"
              title={<Space><BugOutlined /> Step 1: Extract Intelligence</Space>}
              size="small"
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Button
                  type="default"
                  icon={<BugOutlined />}
                  onClick={handleExtractIntelligence}
                  loading={extracting}
                  disabled={selectedArticles.length === 0}
                  style={{ flex: 1 }}
                >
                  Extract from {selectedArticles.length} Articles
                </Button>
                {extractionResults && (
                  <Tag color="success">{extractionResults.results?.length} processed</Tag>
                )}
              </div>
            </Card>

            {/* Step 2: Generate & Run Hunts */}
            <Card 
              className="hunt-step-card hunt-step-compact"
              title={<Space><ThunderboltOutlined /> Step 2: Generate & Run Hunts</Space>}
              size="small"
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Select
                  mode="multiple"
                  value={selectedPlatforms}
                  onChange={setSelectedPlatforms}
                  style={{ width: '100%' }}
                  placeholder="Select platforms"
                  size="small"
                >
                  {platforms.map(p => (
                    <Option key={p.platform_id} value={p.platform_id}>
                      <Space>
                        <span style={{ color: p.color || getPlatformColor(p.platform_id) }}>●</span>
                        {p.name} {p.query_language ? `(${p.query_language})` : ''}
                      </Space>
                    </Option>
                  ))}
                </Select>

                <Checkbox 
                  checked={extractFirst} 
                  onChange={(e) => setExtractFirst(e.target.checked)}
                  style={{ fontSize: 12 }}
                >
                  Extract intelligence first (recommended)
                </Checkbox>

                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={handleBatchHunt}
                  loading={processingBatch}
                  disabled={selectedArticles.length === 0 || selectedPlatforms.length === 0}
                  block
                >
                  Generate {selectedArticles.length} × {selectedPlatforms.length} Hunts
                </Button>

                {batchResults && (
                  <Alert
                    type="success"
                    message={batchResults.message}
                    size="small"
                    style={{ marginTop: 4 }}
                  />
                )}
              </Space>
            </Card>

            {/* Step 3: Preview Query Before Generating */}
            <Card 
              className="hunt-step-card hunt-step-compact"
              title={<Space><CodeOutlined /> Step 3: Preview Query Before Generating</Space>}
              size="small"
            >
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Row gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={14}>
                    <Select
                      placeholder="Choose article to preview"
                      style={{ width: '100%' }}
                      value={previewArticle}
                      onChange={setPreviewArticle}
                      showSearch
                      optionFilterProp="children"
                      size="small"
                    >
                      {reviewedArticles.map(a => (
                        <Option key={a.id} value={a.id}>{a.title?.substring(0, 35)}...</Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={10}>
                    <Select
                      placeholder="Platform"
                      style={{ width: '100%' }}
                      value={previewPlatform}
                      onChange={setPreviewPlatform}
                      size="small"
                    >
                      {platforms.map(p => (
                        <Option key={p.platform_id} value={p.platform_id}>{p.name}</Option>
                      ))}
                    </Select>
                  </Col>
                </Row>
                <Button 
                  type="default"
                  icon={previewLoading ? <LoadingOutlined /> : <RobotOutlined />}
                  loading={previewLoading}
                  disabled={!previewArticle}
                  onClick={() => handlePreviewQuery(previewArticle, previewPlatform)}
                  block
                  size="small"
                  style={{ marginBottom: queryPreview ? 8 : 0 }}
                >
                  Preview Query with GenAI
                </Button>
                
                {queryPreview && !queryPreview.error && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Space size={4}>
                        <Tag color={getPlatformColor(queryPreview.platform)} style={{ margin: 0 }}>{queryPreview.platform?.toUpperCase()}</Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>{queryPreview.model_used}</Text>
                      </Space>
                      <Button 
                        icon={<CopyOutlined />} 
                        size="small"
                        type="text"
                        onClick={() => copyQueryToClipboard(queryPreview.query)}
                      />
                    </div>
                    <pre className="query-block" style={{ flex: 1, maxHeight: 80, marginBottom: 0, overflow: 'auto' }}>
                      {queryPreview.query}
                    </pre>
                  </div>
                )}
                {queryPreview?.error && (
                  <Alert type="error" message={queryPreview.error} style={{ marginTop: 8 }} size="small" />
                )}
              </div>
            </Card>
          </div>
        </Col>
      </Row>

      {/* Generated Hunts Table */}
      <Card 
        className="hunt-generated-card"
        title={<Title level={4} style={{ margin: 0 }}><ThunderboltOutlined /> Generated Hunts</Title>}
        style={{ marginTop: 16 }}
        extra={
          <Space>
            <Select
              placeholder="Filter by status"
              allowClear
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setSlaBreachOnly(false); }}
              style={{ width: 150 }}
              size="small"
            >
              <Option value="PENDING">Pending</Option>
              <Option value="RUNNING">Running</Option>
              <Option value="COMPLETED">Completed</Option>
              <Option value="FAILED">Failed</Option>
            </Select>
            {slaBreachOnly && (
              <Tag 
                color="red" 
                icon={<FieldTimeOutlined />} 
                closable 
                onClose={() => setSlaBreachOnly(false)}
              >
                SLA Breaches Only
              </Tag>
            )}
            {selectedHunts.length > 0 && (
              <Button 
                danger 
                size="small"
                icon={<DeleteOutlined />}
                onClick={handleDeleteSelectedHunts}
              >
                Delete ({selectedHunts.length})
              </Button>
            )}
            <Tag color="blue">{hunts.length} total</Tag>
          </Space>
        }
      >
        <Table
          dataSource={(() => {
            let filtered = [...hunts];
            if (statusFilter) {
              filtered = filtered.filter(h => h.latest_status === statusFilter || 
                (statusFilter === 'PENDING' && !h.latest_status));
            }
            if (slaBreachOnly) {
              filtered = filtered.filter(isHuntBreachingSLA);
            }
            // Sort by newest first (descending by created_at)
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return filtered;
          })()}
          columns={huntColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: (e) => {
              // Ignore clicks on checkboxes, buttons, and links
              if (e.target.closest('button') || e.target.closest('.ant-checkbox') || e.target.closest('a')) {
                return;
              }
              handleViewHunt(record);
            },
            style: { cursor: 'pointer' }
          })}
        />
      </Card>

      {/* Hunt Executions - Status & API Responses - Table style matching Generated Hunts */}
      <Card 
        className="hunt-executions-card hunt-executions-section"
        title={
          <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap' }}>
            <Space>
              <ApiOutlined />
              <span style={{ fontSize: 16, fontWeight: 600 }}>Hunt Executions & API Responses</span>
              <Tag color="blue">{allExecutions.length} total</Tag>
            </Space>
            <Space size={4}>
              {/* Search by Article Name/ID or Hunt ID */}
              <Input
                placeholder="Search by Article Name, Article ID, or Hunt ID..."
                prefix={<SearchOutlined />}
                value={executionSearch}
                onChange={(e) => setExecutionSearch(e.target.value)}
                allowClear
                style={{ width: 280 }}
                size="small"
              />
              <Button 
                size="small" 
                type={!statusFilter ? 'primary' : 'default'}
                onClick={() => setStatusFilter(null)}
              >
                All
              </Button>
              <Button 
                size="small" 
                type={statusFilter === 'COMPLETED' ? 'primary' : 'default'}
                style={{ color: statusFilter === 'COMPLETED' ? undefined : 'var(--success)' }}
                onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? null : 'COMPLETED')}
              >
                Completed ({allExecutions.filter(e => e.status === 'COMPLETED').length})
              </Button>
              <Button 
                size="small" 
                type={statusFilter === 'RUNNING' ? 'primary' : 'default'}
                style={{ color: statusFilter === 'RUNNING' ? undefined : 'var(--primary)' }}
                onClick={() => setStatusFilter(statusFilter === 'RUNNING' ? null : 'RUNNING')}
              >
                Running ({allExecutions.filter(e => e.status === 'RUNNING' || e.status === 'PENDING').length})
              </Button>
              <Button 
                size="small" 
                type={statusFilter === 'FAILED' ? 'primary' : 'default'}
                danger={statusFilter !== 'FAILED'}
                onClick={() => setStatusFilter(statusFilter === 'FAILED' ? null : 'FAILED')}
              >
                Failed ({allExecutions.filter(e => e.status === 'FAILED').length})
              </Button>
            </Space>
          </Space>
        }
        style={{ marginTop: 16 }}
        extra={
          <Button 
            icon={<SyncOutlined />} 
            size="small"
            onClick={() => fetchAllExecutions(hunts)}
            loading={executionsLoading}
          >
            Refresh
          </Button>
        }
      >
        <Table
          dataSource={(() => {
            let filtered = [...allExecutions];
            
            // Apply search filter
            if (executionSearch) {
              const searchLower = executionSearch.toLowerCase();
              filtered = filtered.filter(e => {
                // Search by hunt ID
                if (String(e.hunt_id).includes(searchLower)) return true;
                // Search by article ID
                if (String(e.article_id).includes(searchLower)) return true;
                // Search by article title
                const article = articles.find(a => a.id === e.article_id) || 
                               reviewedArticles.find(a => a.id === e.article_id);
                if (article?.title?.toLowerCase().includes(searchLower)) return true;
                // Search by user who ran it
                if (e.executed_by?.toLowerCase().includes(searchLower)) return true;
                return false;
              });
            }
            
            if (statusFilter) {
              filtered = filtered.filter(e => e.status === statusFilter || 
                (statusFilter === 'RUNNING' && e.status === 'PENDING'));
            }
            // Sort by newest first (descending by executed_at or created_at)
            filtered.sort((a, b) => {
              const dateA = new Date(a.executed_at || a.created_at);
              const dateB = new Date(b.executed_at || b.created_at);
              return dateB - dateA;
            });
            return filtered;
          })()}
          columns={[
            {
              title: 'Hunt ID',
              dataIndex: 'hunt_id',
              key: 'hunt_id',
              width: 80,
              sorter: (a, b) => a.hunt_id - b.hunt_id,
              render: (huntId) => (
                <Tag color="blue">#{huntId}</Tag>
              ),
            },
            {
              title: 'Article ID',
              key: 'article_id',
              width: 90,
              sorter: (a, b) => (a.article_id || 0) - (b.article_id || 0),
              render: (_, record) => (
                <Tag color="purple">#{record.article_id}</Tag>
              ),
            },
            {
              title: 'Article Title',
              key: 'article_title',
              width: 250,
              render: (_, record) => {
                const article = articles.find(a => a.id === record.article_id) || 
                               reviewedArticles.find(a => a.id === record.article_id);
                return (
                  <Tooltip title="Click to view article details, change status, or add comments">
                    <Button 
                      type="link" 
                      size="small" 
                      style={{ padding: 0, height: 'auto', textAlign: 'left' }}
                      onClick={() => navigate(`/articles?article_id=${record.article_id}`)}
                    >
                      <Text style={{ maxWidth: 230 }} ellipsis>
                        {article?.title || `Unknown Article`}
                      </Text>
                    </Button>
                  </Tooltip>
                );
              },
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              width: 120,
              sorter: (a, b) => {
                const order = { COMPLETED: 1, RUNNING: 2, PENDING: 3, FAILED: 4 };
                return (order[a.status] || 5) - (order[b.status] || 5);
              },
              render: (status, record) => (
                <Space direction="vertical" size={0}>
                  {getStatusTag(status)}
                  {record.results?.results_count > 0 && (
                    <Tag color="red" size="small" icon={<WarningOutlined />}>
                      {record.results.results_count} Hits
                    </Tag>
                  )}
                </Space>
              ),
            },
            {
              title: 'Execution',
              key: 'execution',
              width: 100,
              render: (_, record) => (
                <Tag color={record.trigger_type === 'AUTOMATIC' ? 'purple' : 'cyan'}>
                  {record.trigger_type || 'MANUAL'}
                </Tag>
              ),
            },
            {
              title: 'Query Version',
              key: 'query_version',
              width: 80,
              render: (_, record) => (
                <Tooltip title={`Query version at time of execution`}>
                  <Tag color="geekblue">v{record.query_version || 1}</Tag>
                </Tooltip>
              ),
            },
            {
              title: 'Ran By',
              key: 'executed_by',
              width: 100,
              render: (_, record) => (
                <Space direction="vertical" size={0}>
                  <Text style={{ fontSize: 12 }}>
                    {record.executed_by || record.created_by || 'System'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {record.trigger_type === 'AUTOMATIC' ? 'Auto' : 'Manual'}
                  </Text>
                </Space>
              ),
            },
            {
              title: 'Run Time',
              key: 'executed_at',
              width: 160,
              defaultSortOrder: 'descend',
              sorter: (a, b) => new Date(b.executed_at || b.created_at) - new Date(a.executed_at || a.created_at),
              render: (_, record) => (
                <Space direction="vertical" size={0}>
                  <Tooltip title={record.executed_at ? formatDateTime(record.executed_at) : 'Not executed'}>
                    <Text style={{ fontSize: 12 }}>
                      {record.executed_at ? getRelativeTime(record.executed_at) : 'Pending'}
                    </Text>
                  </Tooltip>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {record.executed_at ? formatDateTime(record.executed_at) : ''}
                  </Text>
                  {record.execution_time_ms && (
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      Duration: {record.execution_time_ms}ms
                    </Text>
                  )}
                </Space>
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 120,
              fixed: 'right',
              render: (_, record) => {
                const hunt = hunts.find(h => h.id === record.hunt_id);
                return (
                  <Space size={4}>
                    <Tooltip title="View hunt details">
                      <Button 
                        size="small" 
                        icon={<EyeOutlined />}
                        onClick={() => hunt && handleViewHunt(hunt)}
                      />
                    </Tooltip>
                    <Tooltip title="Copy API response">
                      <Button 
                        size="small" 
                        icon={<CopyOutlined />}
                        disabled={!record.results}
                        onClick={() => {
                          if (record.results) {
                            navigator.clipboard.writeText(JSON.stringify(record.results, null, 2));
                            message.success('API response copied');
                          }
                        }}
                      />
                    </Tooltip>
                  </Space>
                );
              },
            },
          ]}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, size: 'small' }}
          loading={executionsLoading}
          locale={{ 
            emptyText: (
              <Empty 
                description="No hunt executions yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Text type="secondary">Run a hunt to see execution results here</Text>
              </Empty>
            )
          }}
          expandable={{
            expandedRowRender: (record) => {
              const article = articles.find(a => a.id === record.article_id) || 
                             reviewedArticles.find(a => a.id === record.article_id);
              return (
                <div style={{ padding: '12px 0' }}>
                  {/* Article Info */}
                  <Card size="small" className="article-info-card" style={{ marginBottom: 12 }}>
                    <Row gutter={16} align="middle">
                      <Col flex="auto">
                        <Space direction="vertical" size={4}>
                          <Space>
                            <FileTextOutlined style={{ color: 'var(--primary)' }} />
                            <Text strong>{article?.title || 'Untitled Article'}</Text>
                          </Space>
                          <Space size="large" wrap>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              <strong>Source:</strong> {article?.source_name || 'Unknown'}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              <strong>Platform:</strong> <Tag size="small" color={getPlatformColor(record.hunt_platform)}>{record.hunt_platform?.toUpperCase()}</Tag>
                            </Text>
                          </Space>
                        </Space>
                      </Col>
                      <Col>
                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<EyeOutlined />}
                          onClick={() => navigate(`/articles?article_id=${record.article_id}`)}
                        >
                          View Article
                        </Button>
                      </Col>
                    </Row>
                  </Card>
                  
                  {/* Execution Details */}
                  <Descriptions column={3} size="small" bordered style={{ marginBottom: 12 }}>
                    <Descriptions.Item label="Duration">{record.execution_time_ms || 0}ms</Descriptions.Item>
                    <Descriptions.Item label="Results">
                      <Badge 
                        count={record.results?.results_count || 0} 
                        showZero 
                        color={record.results?.results_count > 0 ? '#ff4d4f' : '#d9d9d9'}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="Executed">
                      {record.executed_at ? formatDateTime(record.executed_at) : 'Not yet'}
                    </Descriptions.Item>
                    {record.error_message && (
                      <Descriptions.Item label="Error" span={3}>
                        <Alert type="error" message={record.error_message} size="small" />
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                  
                  {/* Query & Response */}
                  <Row gutter={12}>
                    {record.hunt_query && (
                      <Col span={12}>
                        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong><CodeOutlined /> Query</Text>
                          <Button 
                            size="small" 
                            icon={<CopyOutlined />}
                            onClick={() => {
                              navigator.clipboard.writeText(record.hunt_query);
                              message.success('Query copied');
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                        <pre className="query-block" style={{ maxHeight: 150, margin: 0 }}>
                          {record.hunt_query}
                        </pre>
                      </Col>
                    )}
                    <Col span={record.hunt_query ? 12 : 24}>
                      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong><ApiOutlined /> API Response</Text>
                        {record.results && (
                          <Button 
                            size="small" 
                            icon={<CopyOutlined />}
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(record.results, null, 2));
                              message.success('Response copied');
                            }}
                          >
                            Copy
                          </Button>
                        )}
                      </div>
                      {record.results ? (
                        <pre className="api-response-block" style={{ maxHeight: 150, margin: 0 }}>
                          {JSON.stringify(record.results, null, 2)}
                        </pre>
                      ) : (
                        <Alert 
                          type="info" 
                          message={
                            record.status === 'PENDING' ? 'Waiting for execution...' :
                            record.status === 'RUNNING' ? 'Execution in progress...' :
                            'No response data'
                          }
                          size="small"
                        />
                      )}
                    </Col>
                  </Row>
                  
                  {/* Actions for hits */}
                  {record.status === 'COMPLETED' && record.results?.results_count > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <Alert
                        type="warning"
                        message={`${record.results.results_count} potential threats detected`}
                        style={{ marginBottom: 8 }}
                        size="small"
                      />
                      <Space wrap size={8}>
                        <Button 
                          type="primary" 
                          danger
                          size="small"
                          icon={<FormOutlined />}
                          onClick={() => message.info('ServiceNow - Configure in Admin > Notifications')}
                        >
                          Create Ticket
                        </Button>
                        <Button 
                          size="small"
                          icon={<MailOutlined />}
                          onClick={() => {
                            const subject = encodeURIComponent(`[Hunt Alert] ${record.results.results_count} Hits`);
                            const body = encodeURIComponent(
                              `Hunt Execution Alert\n\nPlatform: ${record.hunt_platform?.toUpperCase()}\nResults: ${record.results.results_count}\n`
                            );
                            window.open(`mailto:?subject=${subject}&body=${body}`);
                          }}
                        >
                          Email
                        </Button>
                        <Button 
                          size="small"
                          icon={<SlackOutlined />}
                          onClick={() => message.info('Slack - Configure in Admin > Notifications')}
                        >
                          Slack
                        </Button>
                      </Space>
                    </div>
                  )}
                </div>
              );
            },
            rowExpandable: () => true,
          }}
        />
      </Card>

      {/* Hunt Details Drawer */}
      <Drawer
        title={
          <Space>
            <ThunderboltOutlined />
            Hunt Details
            {selectedHunt && (
              <Tag color={getPlatformColor(selectedHunt.platform)}>
                {selectedHunt.platform?.toUpperCase()}
              </Tag>
            )}
          </Space>
        }
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={750}
        extra={
          selectedHunt && (
            <Space>
              <Button 
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(selectedHunt.query_logic);
                  message.success('Query copied to clipboard');
                }}
              >
                Copy Query
              </Button>
              <Button 
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleExecuteHunt(selectedHunt.id)}
              >
                Run Hunt
              </Button>
            </Space>
          )
        }
      >
        {selectedHunt && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* Hunt Info */}
            <Card size="small" title="Hunt Information">
              {/* Article Info */}
              {(() => {
                const huntArticle = articles.find(a => a.id === selectedHunt.article_id) || 
                                   reviewedArticles.find(a => a.id === selectedHunt.article_id);
                return (
                  <Card 
                    size="small" 
                    className="article-info-card"
                    style={{ marginBottom: 16 }}
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space>
                        <FileTextOutlined style={{ color: 'var(--primary)', fontSize: 16 }} />
                        <Text strong style={{ color: 'var(--text-primary)' }}>
                          {huntArticle?.title || 'Article not found'}
                        </Text>
                      </Space>
                      <Space size="middle">
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          <strong>Article ID:</strong> #{selectedHunt.article_id}
                        </Text>
                        {huntArticle?.source_name && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            <strong>Source:</strong> {huntArticle.source_name}
                          </Text>
                        )}
                      </Space>
                      {huntArticle?.url && (
                        <Button 
                          type="link" 
                          size="small" 
                          icon={<LinkOutlined />}
                          onClick={() => window.open(huntArticle.url, '_blank')}
                          style={{ padding: 0, height: 'auto' }}
                        >
                          View Original Article
                        </Button>
                      )}
                    </Space>
                  </Card>
                );
              })()}
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="Hunt ID">#{selectedHunt.id}</Descriptions.Item>
                <Descriptions.Item label="Platform">
                  <Tag color={getPlatformColor(selectedHunt.platform)}>
                    {selectedHunt.platform?.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Article ID">#{selectedHunt.article_id}</Descriptions.Item>
                <Descriptions.Item label="Model Used">{selectedHunt.generated_by_model || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Created" span={2}>
                  {formatDateTime(selectedHunt.created_at)}
                </Descriptions.Item>
              </Descriptions>
            </Card>
            
            {/* Query */}
            <Card 
              size="small" 
              title={<Space><CodeOutlined /> Hunt Query</Space>}
              extra={
                <Button 
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(selectedHunt.query_logic);
                    message.success('Query copied');
                  }}
                >
                  Copy
                </Button>
              }
            >
              <pre className="query-block" style={{ maxHeight: 250, margin: 0 }}>
                {selectedHunt.query_logic}
              </pre>
            </Card>
            
            {/* Execution History with API Responses */}
            <Card 
              size="small" 
              title={
                <Space>
                  <ApiOutlined /> 
                  Execution History & API Responses
                  <Tag>{executions.length} executions</Tag>
                </Space>
              }
            >
              {executions.length === 0 ? (
                <Empty description="No executions yet">
                  <Button 
                    type="primary" 
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleExecuteHunt(selectedHunt.id)}
                  >
                    Run First Execution
                  </Button>
                </Empty>
              ) : (
                <Collapse accordion>
                  {executions.map((exec) => (
                    <Panel
                      key={exec.id}
                      header={
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Space>
                            {getStatusTag(exec.status)}
                            {exec.results?.results_count > 0 && (
                              <Tag color="red">{exec.results.results_count} Hits</Tag>
                            )}
                          </Space>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {exec.executed_at ? new Date(exec.executed_at).toLocaleString() : 'Pending'}
                            {exec.execution_time_ms && ` • ${exec.execution_time_ms}ms`}
                          </Text>
                        </Space>
                      }
                    >
                      <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
                        <Descriptions.Item label="Status">{getStatusTag(exec.status)}</Descriptions.Item>
                        <Descriptions.Item label="Trigger">{exec.trigger_type}</Descriptions.Item>
                        <Descriptions.Item label="Duration">{exec.execution_time_ms || 0}ms</Descriptions.Item>
                        <Descriptions.Item label="Results Count">
                          <Badge 
                            count={exec.results?.results_count || 0} 
                            showZero 
                            color={exec.results?.results_count > 0 ? '#ff4d4f' : '#d9d9d9'}
                          />
                        </Descriptions.Item>
                        <Descriptions.Item label="Executed At" span={2}>
                          {exec.executed_at ? new Date(exec.executed_at).toLocaleString() : 'Not yet'}
                        </Descriptions.Item>
                        {exec.findings_summary && (
                          <Descriptions.Item label="Findings" span={2}>
                            {exec.findings_summary}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                      
                      {exec.error_message && (
                        <Alert 
                          type="error" 
                          message="Execution Error" 
                          description={exec.error_message} 
                          style={{ marginBottom: 16 }} 
                        />
                      )}
                      
                      {/* API Response */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text strong><ApiOutlined /> API Response</Text>
                          {exec.results && (
                            <Button 
                              size="small" 
                              icon={<CopyOutlined />}
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(exec.results, null, 2));
                                message.success('Response copied');
                              }}
                            >
                              Copy
                            </Button>
                          )}
                        </div>
                        {exec.results ? (
                          <pre className="api-response-block" style={{ maxHeight: 300, margin: 0 }}>
                            {JSON.stringify(exec.results, null, 2)}
                          </pre>
                        ) : (
                          <Alert 
                            type="info" 
                            message={
                              exec.status === 'PENDING' ? 'Waiting for execution...' :
                              exec.status === 'RUNNING' ? 'Execution in progress...' :
                              'No response data available'
                            }
                          />
                        )}
                      </div>
                    </Panel>
                  ))}
                </Collapse>
              )}
            </Card>
          </Space>
        )}
      </Drawer>

      {/* Edit Hunt Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            Edit Hunt Query
          </Space>
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingHunt(null);
        }}
        onOk={handleSaveEdit}
        confirmLoading={saving}
        width={800}
        okText={createNewVersion ? "Create New Version" : "Save Changes"}
      >
        {editingHunt && (
          <div>
            <Alert
              type="info"
              message="Edit Hunt Query"
              description={
                createNewVersion 
                  ? "A new version of this hunt will be created with your changes. The original hunt will be preserved."
                  : "Warning: Direct edit will modify the existing hunt. Only possible if no execution is in progress."
              }
              style={{ marginBottom: 16 }}
              showIcon
            />
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>Title:</Text>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Hunt title"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  marginTop: 8,
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  fontSize: 14
                }}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>Query ({editingHunt.platform?.toUpperCase()}):</Text>
              <textarea
                value={editedQuery}
                onChange={(e) => setEditedQuery(e.target.value)}
                rows={12}
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  marginTop: 8,
                  fontFamily: 'Monaco, Menlo, monospace',
                  fontSize: 12,
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  background: '#f5f5f5'
                }}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Checkbox 
                checked={createNewVersion}
                onChange={(e) => setCreateNewVersion(e.target.checked)}
              >
                <Text strong>Create as new version</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Preserves the original hunt and creates a new version with your changes
                </Text>
              </Checkbox>
            </div>
            
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Original Hunt ID">{editingHunt.id}</Descriptions.Item>
              <Descriptions.Item label="Platform">
                <Tag color={getPlatformColor(editingHunt.platform)}>
                  {editingHunt.platform?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {new Date(editingHunt.created_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={editingHunt.status === 'COMPLETED' ? 'success' : 'default'}>
                  {editingHunt.status || 'PENDING'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Hunts;
