import React, { useState, useEffect } from 'react';
import {
  Card, Tabs, Form, Input, Button, Switch, Select, Space, message,
  Alert, Spin, Badge, Tooltip, Divider, Tag,
  Typography, InputNumber
} from 'antd';
import {
  SaveOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
  LockOutlined, ApiOutlined, MailOutlined, RobotOutlined, SafetyOutlined,
  CloudOutlined, SettingOutlined, ThunderboltOutlined, PlayCircleOutlined,
  EyeOutlined, EyeInvisibleOutlined, KeyOutlined, DatabaseOutlined
} from '@ant-design/icons';
import client from '../api/client';

const { Text, Title } = Typography;
const { Option } = Select;

const CATEGORY_ICONS = {
  genai: <RobotOutlined />,
  hunt_connectors: <ThunderboltOutlined />,
  notifications: <MailOutlined />,
  authentication: <SafetyOutlined />,
  automation: <SettingOutlined />,
};

const CATEGORY_LABELS = {
  genai: 'GenAI Providers',
  hunt_connectors: 'Hunt Platform Connectors',
  notifications: 'Notifications',
  authentication: 'Authentication & SSO',
  automation: 'Automation Settings',
};

// Data Retention is managed in Overview tab - excluded here to avoid duplication
const EXCLUDED_CATEGORIES = ['data_retention'];

export default function ConfigurationManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configurations, setConfigurations] = useState({});
  const [editedValues, setEditedValues] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [testResults, setTestResults] = useState(null);
  const [activeCategory, setActiveCategory] = useState('genai');

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const response = await client.get('/admin/configurations');
      setConfigurations(response.data);
      // Initialize edited values - don't populate, let user make changes
      // This way we only save what user explicitly changes
      setEditedValues({});
    } catch (error) {
      message.error('Failed to load configurations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (category, key, value) => {
    setEditedValues(prev => ({
      ...prev,
      [`${category}:${key}`]: value
    }));
  };

  const saveCategory = async (category) => {
    setSaving(true);
    try {
      const categoryConfigs = configurations[category] || [];
      const configsToSave = categoryConfigs
        .map(item => {
          const fullKey = `${category}:${item.key}`;
          const editedValue = editedValues[fullKey];
          
          // For booleans, check if value exists in editedValues (even if false)
          const hasEditedValue = fullKey in editedValues;
          
          // Skip masked values and unchanged values
          if (!hasEditedValue || editedValue === '••••••••') {
            return null;
          }
          
          // Convert value based on type
          let valueToSave;
          if (item.value_type === 'bool') {
            valueToSave = String(editedValue === true || editedValue === 'true');
          } else if (item.value_type === 'int') {
            valueToSave = String(parseInt(editedValue) || 0);
          } else {
            valueToSave = String(editedValue || '');
          }
          
          return {
            category,
            key: item.key,
            value: valueToSave,
            value_type: item.value_type,
            is_sensitive: item.is_sensitive,
          };
        })
        .filter(Boolean);

      if (configsToSave.length === 0) {
        message.warning('No changes to save. Make a change to a setting first.');
        setSaving(false);
        return;
      }

      const response = await client.post('/admin/configurations', {
        configurations: configsToSave
      });
      
      message.success(`Saved ${response.data?.saved_count || configsToSave.length} configuration(s)`);
      loadConfigurations(); // Reload to get updated state
    } catch (error) {
      message.error('Failed to save configurations: ' + (error.response?.data?.detail || error.message));
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const testCategory = async (category) => {
    try {
      const response = await client.post(`/admin/configurations/test/${category}`);
      setTestResults(response.data);
      
      const hasFailure = response.data.tests.some(t => t.status === 'failed');
      if (hasFailure) {
        message.warning('Some tests failed - see results below');
      } else if (response.data.tests.length > 0) {
        message.success('All tests passed!');
      } else {
        message.info('No tests available for this category');
      }
    } catch (error) {
      message.error('Test failed');
    }
  };

  const toggleShowSecret = (key) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderConfigItem = (item, category) => {
    const fullKey = `${category}:${item.key}`;
    const hasEdited = fullKey in editedValues;
    
    // Use edited value if available, otherwise use the configured value from API
    let currentValue;
    if (hasEdited) {
      currentValue = editedValues[fullKey];
    } else if (item.is_configured && item.value && item.value !== '••••••••') {
      currentValue = item.value;
    } else {
      currentValue = '';
    }

    const isSecret = item.is_sensitive;
    const showValue = showSecrets[fullKey];

    return (
      <Form.Item
        key={item.key}
        label={
          <Space>
            {isSecret && <LockOutlined style={{ color: '#faad14' }} />}
            <span style={{ textTransform: 'capitalize' }}>
              {item.key.replace(/_/g, ' ')}
            </span>
            {item.is_configured && (
              <Tag color="green" size="small">Configured</Tag>
            )}
          </Space>
        }
        tooltip={item.description}
        style={{ marginBottom: 12 }}
      >
        {item.value_type === 'bool' ? (
          <Space>
            <Switch
              checked={currentValue === 'true' || currentValue === true}
              onChange={(checked) => handleValueChange(category, item.key, checked)}
            />
            <Tag color={currentValue === 'true' || currentValue === true ? 'green' : 'default'}>
              {currentValue === 'true' || currentValue === true ? 'Enabled' : 'Disabled'}
            </Tag>
          </Space>
        ) : item.value_type === 'int' ? (
          <InputNumber
            value={currentValue ? parseInt(currentValue) : undefined}
            onChange={(val) => handleValueChange(category, item.key, val)}
            style={{ width: 200 }}
            placeholder={item.description}
          />
        ) : isSecret ? (
          <Input.Password
            value={currentValue}
            onChange={(e) => handleValueChange(category, item.key, e.target.value)}
            placeholder={item.is_configured ? '••••••••' : `Enter ${item.key}`}
            visibilityToggle={{
              visible: showValue,
              onVisibleChange: () => toggleShowSecret(fullKey)
            }}
            prefix={<KeyOutlined />}
            style={{ maxWidth: 400 }}
          />
        ) : (
          <Input
            value={currentValue}
            onChange={(e) => handleValueChange(category, item.key, e.target.value)}
            placeholder={item.description || `Enter ${item.key}`}
            style={{ maxWidth: 400 }}
          />
        )}
      </Form.Item>
    );
  };

  const renderCategoryContent = (category, items) => {
    return (
      <div>
        <Form layout="vertical">
          {items.map(item => renderConfigItem(item, category))}
        </Form>
        
        <Divider />
        
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => saveCategory(category)}
          >
            Save {CATEGORY_LABELS[category]}
          </Button>
          
          {(category === 'notifications' || category === 'genai') && (
            <Button
              icon={<PlayCircleOutlined />}
              onClick={() => testCategory(category)}
            >
              Test Connection
            </Button>
          )}
        </Space>

        {testResults && testResults.category === category && testResults.tests.length > 0 && (
          <Alert
            style={{ marginTop: 16 }}
            type={testResults.tests.some(t => t.status === 'failed') ? 'warning' : 'success'}
            message="Test Results"
            description={
              <div>
                {testResults.tests.map((test, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    {test.status === 'success' ? (
                      <CheckCircleOutlined style={{ color: 'green', marginRight: 8 }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: 'red', marginRight: 8 }} />
                    )}
                    <strong>{test.name}:</strong> {test.status}
                    {test.error && <Text type="danger" style={{ marginLeft: 8 }}>{test.error}</Text>}
                  </div>
                ))}
              </div>
            }
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
        <p>Loading configurations...</p>
      </div>
    );
  }

  const tabItems = Object.entries(CATEGORY_LABELS)
    .filter(([category]) => !EXCLUDED_CATEGORIES.includes(category))
    .map(([category, label]) => ({
      key: category,
      label: (
        <Space>
          {CATEGORY_ICONS[category]}
          {label}
          {configurations[category]?.some(c => c.is_configured) && (
            <Badge status="success" />
          )}
        </Space>
      ),
      children: (
        <Card>
          {renderCategoryContent(category, configurations[category] || [])}
        </Card>
      ),
    }));

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <SettingOutlined /> System Configuration
          </Title>
          <Text type="secondary">
            Configure API keys, connectors, and system settings
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadConfigurations}>
          Refresh
        </Button>
      </div>

      <Alert
        message="Security Note"
        description="API keys and passwords are encrypted at rest. Changes take effect immediately for new operations."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Tabs
        activeKey={activeCategory}
        onChange={setActiveCategory}
        items={tabItems}
        tabPosition="left"
        style={{ minHeight: 500 }}
      />
    </div>
  );
}
