import React, { useEffect, useState, useCallback } from 'react';
import { 
  Table, Button, Modal, Form, Input, Switch, Select, Space, message, Popconfirm,
  Card, Tabs, Row, Col, Tag, Badge, Tooltip, Spin, Empty, Collapse, Divider,
  Typography, Alert, Progress, Statistic, Descriptions, Steps, Radio
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ApiOutlined, CloudOutlined, SafetyOutlined, SettingOutlined,
  ThunderboltOutlined, BellOutlined, DatabaseOutlined, SearchOutlined, RocketOutlined,
  QuestionCircleOutlined, ExperimentOutlined, CodeOutlined, PlayCircleOutlined,
  EyeOutlined, CopyOutlined, LinkOutlined
} from '@ant-design/icons';
import client from '../api/client';
import './ConnectorsManager.css';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// Category icons and colors
const CATEGORY_CONFIG = {
  siem: { icon: <SearchOutlined />, color: '#1890ff', name: 'SIEM' },
  edr: { icon: <SafetyOutlined />, color: '#52c41a', name: 'EDR' },
  cloud_security: { icon: <CloudOutlined />, color: '#722ed1', name: 'Cloud Security' },
  enrichment: { icon: <DatabaseOutlined />, color: '#fa8c16', name: 'Enrichment' },
  sandbox: { icon: <ExperimentOutlined />, color: '#eb2f96', name: 'Sandbox' },
  ticketing: { icon: <ApiOutlined />, color: '#13c2c2', name: 'Ticketing' },
  soar: { icon: <ThunderboltOutlined />, color: '#f5222d', name: 'SOAR' },
  notification: { icon: <BellOutlined />, color: '#faad14', name: 'Notification' },
  integration: { icon: <LinkOutlined />, color: '#595959', name: 'Integration' },
};

// Capability badges
const CAPABILITY_CONFIG = {
  hunt: { color: 'blue', label: 'Hunt' },
  enrich: { color: 'orange', label: 'Enrich' },
  notify: { color: 'green', label: 'Notify' },
  ingest: { color: 'purple', label: 'Ingest' },
  export: { color: 'cyan', label: 'Export' },
};

export default function ConnectorsManager() {
  // State
  const [loading, setLoading] = useState(true);
  const [connectors, setConnectors] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('connectors');
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create, edit
  const [editingConnector, setEditingConnector] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  
  // Platform builder modal
  const [platformBuilderVisible, setPlatformBuilderVisible] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(null);
  
  // Template modal
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  const [form] = Form.useForm();
  const [platformForm] = Form.useForm();
  const [templateForm] = Form.useForm();

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [connectorsRes, platformsRes, categoriesRes] = await Promise.all([
        client.get('/connectors'),
        client.get('/connectors/platforms?include_connector_count=true'),
        client.get('/connectors/platforms/categories')
      ]);
      
      setConnectors(connectorsRes.data);
      setPlatforms(platformsRes.data);
      setCategories(categoriesRes.data);
    } catch (e) {
      console.error('Failed to load connector data:', e);
      message.error('Failed to load connectors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get platform info
  const getPlatformInfo = (platformId) => {
    return platforms.find(p => p.platform_id === platformId) || null;
  };

  // Open create connector modal
  const openCreateConnector = (platform = null) => {
    setModalMode('create');
    setEditingConnector(null);
    setSelectedPlatform(platform);
    form.resetFields();
    if (platform) {
      form.setFieldsValue({ connector_type: platform.platform_id });
    }
    setModalVisible(true);
  };

  // Open edit connector modal
  const openEditConnector = (connector) => {
    setModalMode('edit');
    setEditingConnector(connector);
    setSelectedPlatform(getPlatformInfo(connector.connector_type));
    form.setFieldsValue({
      name: connector.name,
      connector_type: connector.connector_type,
      is_active: connector.is_active,
      config: JSON.stringify(connector.config || {}, null, 2)
    });
    setModalVisible(true);
  };

  // Submit connector
  const submitConnector = async (values) => {
    let cfg = {};
    if (values.config) {
      try {
        cfg = JSON.parse(values.config);
      } catch (e) {
        message.error('Invalid JSON in config');
        return;
      }
    }

    try {
      if (modalMode === 'edit' && editingConnector) {
        await client.patch(`/connectors/${editingConnector.id}`, {
          name: values.name,
          config: cfg,
          is_active: values.is_active
        });
        message.success('Connector updated');
      } else {
        await client.post('/connectors', {
          name: values.name,
          connector_type: values.connector_type,
          config: cfg,
          is_active: values.is_active !== false
        });
        message.success('Connector created');
      }
      setModalVisible(false);
      loadData();
    } catch (err) {
      message.error(err?.response?.data?.detail || 'Operation failed');
    }
  };

  // Delete connector
  const deleteConnector = async (id) => {
    try {
      await client.delete(`/connectors/${id}`);
      message.success('Connector deleted');
      loadData();
    } catch (e) {
      message.error('Delete failed');
    }
  };

  // Test connector
  const testConnector = async (connector) => {
    try {
      const r = await client.post(`/connectors/${connector.id}/test`);
      if (r.data.ok) {
        message.success(`Test passed: ${r.data.message}`);
      } else {
        message.warning(`Test failed: ${r.data.message}`);
      }
      loadData();
    } catch (e) {
      message.error('Test request failed');
    }
  };

  // Platform builder functions
  const openPlatformBuilder = (platform = null) => {
    setEditingPlatform(platform);
    platformForm.resetFields();
    if (platform) {
      platformForm.setFieldsValue({
        ...platform,
        capabilities: platform.capabilities || [],
        config_schema: JSON.stringify(platform.config_schema || {}, null, 2),
        api_definition: JSON.stringify(platform.api_definition || {}, null, 2),
        query_syntax: JSON.stringify(platform.query_syntax || {}, null, 2)
      });
    }
    setPlatformBuilderVisible(true);
  };

  const submitPlatform = async (values) => {
    try {
      // Parse JSON fields
      const payload = {
        ...values,
        config_schema: values.config_schema ? JSON.parse(values.config_schema) : {},
        api_definition: values.api_definition ? JSON.parse(values.api_definition) : {},
        query_syntax: values.query_syntax ? JSON.parse(values.query_syntax) : {}
      };

      if (editingPlatform) {
        await client.patch(`/connectors/platforms/${editingPlatform.platform_id}`, payload);
        message.success('Platform updated');
      } else {
        await client.post('/connectors/platforms', payload);
        message.success('Platform created');
      }
      setPlatformBuilderVisible(false);
      loadData();
    } catch (err) {
      if (err instanceof SyntaxError) {
        message.error('Invalid JSON in configuration fields');
      } else {
        message.error(err?.response?.data?.detail || 'Operation failed');
      }
    }
  };

  // Template functions
  const loadTemplates = async (platformId) => {
    try {
      const r = await client.get(`/connectors/platforms/${platformId}/templates`);
      setTemplates(r.data);
    } catch (e) {
      setTemplates([]);
    }
  };

  // Filter platforms by category
  const filteredPlatforms = selectedCategory === 'all' 
    ? platforms 
    : platforms.filter(p => p.category === selectedCategory);

  // Group connectors by platform
  const connectorsByPlatform = connectors.reduce((acc, c) => {
    if (!acc[c.connector_type]) acc[c.connector_type] = [];
    acc[c.connector_type].push(c);
    return acc;
  }, {});

  // Render platform card
  const renderPlatformCard = (platform) => {
    const categoryConfig = CATEGORY_CONFIG[platform.category] || CATEGORY_CONFIG.integration;
    const connectorCount = connectorsByPlatform[platform.platform_id]?.length || 0;
    const hasActiveConnector = connectors.some(
      c => c.connector_type === platform.platform_id && c.is_active
    );

    return (
      <Card
        key={platform.platform_id}
        className={`platform-card ${hasActiveConnector ? 'active' : ''}`}
        hoverable
        size="small"
        actions={[
          <Tooltip title="Configure">
            <Button 
              type="text" 
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openCreateConnector(platform);
              }}
            />
          </Tooltip>,
          <Tooltip title="View Templates">
            <Button 
              type="text" 
              icon={<CodeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPlatform(platform);
                loadTemplates(platform.platform_id);
                setTemplateModalVisible(true);
              }}
            />
          </Tooltip>,
          !platform.is_builtin && (
            <Tooltip title="Edit Platform">
              <Button 
                type="text" 
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  openPlatformBuilder(platform);
                }}
              />
            </Tooltip>
          )
        ].filter(Boolean)}
      >
        <Card.Meta
          avatar={
            <div 
              className="platform-icon" 
              style={{ backgroundColor: platform.color || categoryConfig.color }}
            >
              {categoryConfig.icon}
            </div>
          }
          title={
            <Space>
              <span>{platform.name}</span>
              {platform.is_beta && <Tag color="orange" size="small">Beta</Tag>}
              {connectorCount > 0 && (
                <Badge 
                  count={connectorCount} 
                  style={{ backgroundColor: hasActiveConnector ? '#52c41a' : '#999' }}
                />
              )}
            </Space>
          }
          description={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {platform.vendor || 'Custom'}
              </Text>
              <Space size={2} wrap>
                {(platform.capabilities || []).map(cap => (
                  <Tag 
                    key={cap} 
                    color={CAPABILITY_CONFIG[cap]?.color || 'default'}
                    style={{ fontSize: 10, padding: '0 4px', margin: 0 }}
                  >
                    {CAPABILITY_CONFIG[cap]?.label || cap}
                  </Tag>
                ))}
              </Space>
              {platform.query_language && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Query: {platform.query_language}
                </Text>
              )}
            </Space>
          }
        />
      </Card>
    );
  };

  // Render connectors tab
  const renderConnectorsTab = () => (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateConnector()}>
          New Connector
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadData}>
          Refresh
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={connectors}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: 'Connector',
            key: 'name',
            render: (_, record) => {
              const platform = getPlatformInfo(record.connector_type);
              const categoryConfig = CATEGORY_CONFIG[platform?.category] || CATEGORY_CONFIG.integration;
              return (
                <Space>
                  <div 
                    className="platform-icon-small"
                    style={{ backgroundColor: platform?.color || categoryConfig.color }}
                  >
                    {categoryConfig.icon}
                  </div>
                  <Space direction="vertical" size={0}>
                    <Text strong>{record.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {platform?.name || record.connector_type}
                    </Text>
                  </Space>
                </Space>
              );
            }
          },
          {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            width: 100,
            render: (active) => (
              <Tag color={active ? 'success' : 'default'}>
                {active ? 'Active' : 'Inactive'}
              </Tag>
            )
          },
          {
            title: 'Last Test',
            key: 'test',
            width: 180,
            render: (_, record) => (
              <Space direction="vertical" size={0}>
                {record.last_test_status && (
                  <Tag color={record.last_test_status === 'success' ? 'success' : 'error'}>
                    {record.last_test_status}
                  </Tag>
                )}
                {record.last_tested_at && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {new Date(record.last_tested_at).toLocaleString()}
                  </Text>
                )}
              </Space>
            )
          },
          {
            title: 'Actions',
            key: 'actions',
            width: 200,
            render: (_, record) => (
              <Space>
                <Tooltip title="Test Connection">
                  <Button 
                    size="small" 
                    icon={<PlayCircleOutlined />}
                    onClick={() => testConnector(record)}
                  />
                </Tooltip>
                <Tooltip title="Edit">
                  <Button 
                    size="small" 
                    icon={<EditOutlined />}
                    onClick={() => openEditConnector(record)}
                  />
                </Tooltip>
                <Popconfirm
                  title="Delete this connector?"
                  onConfirm={() => deleteConnector(record.id)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />
    </div>
  );

  // Render platforms tab (catalog)
  const renderPlatformsTab = () => (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => openPlatformBuilder()}
        >
          Create Custom Platform
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadData}>
          Refresh
        </Button>
        <Divider type="vertical" />
        <Radio.Group 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          buttonStyle="solid"
          size="small"
        >
          <Radio.Button value="all">All</Radio.Button>
          {categories.map(cat => (
            <Radio.Button key={cat.id} value={cat.id}>
              {cat.name} ({cat.count})
            </Radio.Button>
          ))}
        </Radio.Group>
      </Space>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredPlatforms.map(platform => (
            <Col key={platform.platform_id} xs={24} sm={12} md={8} lg={6}>
              {renderPlatformCard(platform)}
            </Col>
          ))}
        </Row>
      )}
    </div>
  );

  // Render connector modal
  const renderConnectorModal = () => (
    <Modal
      title={modalMode === 'edit' ? 'Edit Connector' : 'Create Connector'}
      open={modalVisible}
      onCancel={() => setModalVisible(false)}
      onOk={() => form.submit()}
      width={600}
    >
      <Form form={form} onFinish={submitConnector} layout="vertical">
        <Form.Item name="name" label="Connector Name" rules={[{ required: true }]}>
          <Input placeholder="e.g., Production Defender" />
        </Form.Item>

        <Form.Item name="connector_type" label="Platform" rules={[{ required: true }]}>
          <Select 
            disabled={modalMode === 'edit'} 
            placeholder="Select platform"
            showSearch
            optionFilterProp="children"
          >
            {platforms.map(p => (
              <Option key={p.platform_id} value={p.platform_id}>
                <Space>
                  {CATEGORY_CONFIG[p.category]?.icon}
                  {p.name}
                  <Tag size="small">{p.category}</Tag>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
          <Switch />
        </Form.Item>

        {selectedPlatform?.config_schema && Object.keys(selectedPlatform.config_schema).length > 0 ? (
          <Alert
            type="info"
            message="Configuration Fields"
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                This platform requires specific configuration. Edit the JSON below.
              </Text>
            }
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form.Item 
          name="config" 
          label="Configuration (JSON)"
          extra="Enter credentials and settings as JSON"
        >
          <TextArea 
            rows={8} 
            placeholder={`{
  "api_key": "your-api-key",
  "base_url": "https://api.example.com",
  "tenant_id": "..."
}`}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );

  // Render platform builder modal
  const renderPlatformBuilderModal = () => (
    <Modal
      title={editingPlatform ? 'Edit Platform' : 'Create Custom Platform'}
      open={platformBuilderVisible}
      onCancel={() => setPlatformBuilderVisible(false)}
      onOk={() => platformForm.submit()}
      width={800}
      style={{ top: 20 }}
    >
      <Form form={platformForm} onFinish={submitPlatform} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name="platform_id" 
              label="Platform ID" 
              rules={[
                { required: true },
                { pattern: /^[a-z][a-z0-9_]*$/, message: 'Lowercase letters, numbers, underscores only' }
              ]}
              extra="Unique identifier (e.g., my_custom_siem)"
            >
              <Input disabled={!!editingPlatform} placeholder="my_custom_platform" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="name" label="Display Name" rules={[{ required: true }]}>
              <Input placeholder="My Custom SIEM" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="vendor" label="Vendor">
              <Input placeholder="Vendor name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="category" label="Category" rules={[{ required: true }]}>
              <Select placeholder="Select category">
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <Option key={key} value={key}>
                    <Space>{config.icon} {config.name}</Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Description">
          <TextArea rows={2} placeholder="Brief description of this platform" />
        </Form.Item>

        <Form.Item name="capabilities" label="Capabilities">
          <Select mode="multiple" placeholder="Select capabilities">
            {Object.entries(CAPABILITY_CONFIG).map(([key, config]) => (
              <Option key={key} value={key}>{config.label}</Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="query_language" label="Query Language">
              <Input placeholder="e.g., KQL, SPL, SQL" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="documentation_url" label="Documentation URL">
              <Input placeholder="https://docs.example.com" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="color" label="Brand Color">
              <Input placeholder="#1890ff" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="icon_url" label="Icon URL">
              <Input placeholder="https://..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="is_beta" label="Beta" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Collapse ghost>
          <Panel header="API Definition (Advanced)" key="api">
            <Form.Item 
              name="api_definition" 
              extra="Define base URL, authentication type, and default headers"
            >
              <TextArea 
                rows={6} 
                placeholder={`{
  "base_url": "https://api.example.com/v1",
  "auth_type": "bearer",
  "auth_header": "Authorization",
  "default_headers": {
    "Content-Type": "application/json"
  }
}`}
                style={{ fontFamily: 'monospace', fontSize: 11 }}
              />
            </Form.Item>
          </Panel>

          <Panel header="Config Schema (Advanced)" key="config">
            <Form.Item 
              name="config_schema"
              extra="JSON Schema defining required configuration fields"
            >
              <TextArea 
                rows={6} 
                placeholder={`{
  "type": "object",
  "properties": {
    "api_key": { "type": "string", "title": "API Key" },
    "base_url": { "type": "string", "title": "Base URL" }
  },
  "required": ["api_key"]
}`}
                style={{ fontFamily: 'monospace', fontSize: 11 }}
              />
            </Form.Item>
          </Panel>

          <Panel header="Query Syntax (For Hunt Platforms)" key="syntax">
            <Form.Item 
              name="query_syntax"
              extra="Define tables, fields, and example queries for hunt generation"
            >
              <TextArea 
                rows={8} 
                placeholder={`{
  "tables": ["SecurityEvent", "DeviceProcessEvents"],
  "fields": ["Timestamp", "DeviceName", "ProcessName"],
  "operators": ["==", "!=", "contains", "startswith"],
  "example_queries": [
    "SecurityEvent | where EventID == 4688"
  ]
}`}
                style={{ fontFamily: 'monospace', fontSize: 11 }}
              />
            </Form.Item>
          </Panel>
        </Collapse>
      </Form>
    </Modal>
  );

  // Render template modal
  const renderTemplateModal = () => (
    <Modal
      title={
        <Space>
          {selectedPlatform && CATEGORY_CONFIG[selectedPlatform.category]?.icon}
          <span>{selectedPlatform?.name} - API Templates</span>
        </Space>
      }
      open={templateModalVisible}
      onCancel={() => setTemplateModalVisible(false)}
      footer={[
        <Button key="close" onClick={() => setTemplateModalVisible(false)}>
          Close
        </Button>,
        <Button 
          key="add" 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingTemplate(null);
            templateForm.resetFields();
          }}
        >
          Add Template
        </Button>
      ]}
      width={800}
    >
      {templates.length === 0 ? (
        <Empty 
          description="No templates configured for this platform"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" icon={<PlusOutlined />}>
            Create First Template
          </Button>
        </Empty>
      ) : (
        <Table
          rowKey="id"
          dataSource={templates}
          size="small"
          pagination={false}
          columns={[
            {
              title: 'Template',
              key: 'name',
              render: (_, t) => (
                <Space direction="vertical" size={0}>
                  <Text strong>{t.name}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t.template_id}
                  </Text>
                </Space>
              )
            },
            {
              title: 'Action',
              dataIndex: 'action_type',
              render: (type) => (
                <Tag color={CAPABILITY_CONFIG[type]?.color || 'default'}>
                  {type}
                </Tag>
              )
            },
            {
              title: 'Method',
              key: 'method',
              render: (_, t) => (
                <Tag>{t.http_method}</Tag>
              )
            },
            {
              title: 'Endpoint',
              dataIndex: 'endpoint_path',
              ellipsis: true
            },
            {
              title: 'Status',
              dataIndex: 'is_active',
              render: (active) => (
                <Badge status={active ? 'success' : 'default'} text={active ? 'Active' : 'Inactive'} />
              )
            }
          ]}
        />
      )}
    </Modal>
  );

  return (
    <div className="connectors-manager">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'connectors',
            label: (
              <span>
                <SettingOutlined /> Configured Connectors
              </span>
            ),
            children: renderConnectorsTab()
          },
          {
            key: 'platforms',
            label: (
              <span>
                <ApiOutlined /> Platform Catalog
              </span>
            ),
            children: renderPlatformsTab()
          }
        ]}
      />

      {renderConnectorModal()}
      {renderPlatformBuilderModal()}
      {renderTemplateModal()}
    </div>
  );
}
