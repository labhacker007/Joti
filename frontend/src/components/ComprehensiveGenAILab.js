import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, Select, Space, message, Alert, Spin, Typography,
  Divider, Tag, Tabs, Row, Col, Collapse, Table, Slider, InputNumber, Switch,
  Radio, Checkbox, Statistic, Progress, Tooltip
} from 'antd';
import {
  RobotOutlined, ThunderboltOutlined, FileTextOutlined, PlayCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, CopyOutlined, ReloadOutlined,
  ExperimentOutlined, SwapOutlined, HistoryOutlined, SettingOutlined,
  SafetyOutlined, BulbOutlined
} from '@ant-design/icons';
import client from '../api/client';
import './ComprehensiveGenAILab.css';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option, OptGroup } = Select;
const { Panel } = Collapse;

// Test Types - What content to generate
const TEST_TYPES = [
  { value: 'hunt_query', label: 'Hunt Query Generation', icon: <ThunderboltOutlined />, description: 'Generate threat hunting queries' },
  { value: 'executive_summary', label: 'Executive Summary', icon: <FileTextOutlined />, description: 'Generate executive-level summaries' },
  { value: 'technical_summary', label: 'Technical Summary', icon: <RobotOutlined />, description: 'Generate technical analysis summaries' },
  { value: 'ioc_extraction', label: 'IOC/TTP Extraction', icon: <SafetyOutlined />, description: 'Extract IOCs and TTPs from content' },
  { value: 'report_generation', label: 'Report Generation', icon: <FileTextOutlined />, description: 'Generate threat intelligence reports' },
  { value: 'chatbot_response', label: 'Chatbot Response', icon: <RobotOutlined />, description: 'Test chatbot Q&A responses' },
];

// Platforms for hunt queries
const PLATFORMS = [
  { value: 'xsiam', label: 'Cortex XSIAM', description: 'Palo Alto XQL queries' },
  { value: 'defender', label: 'Microsoft Defender', description: 'KQL queries' },
  { value: 'splunk', label: 'Splunk', description: 'SPL queries' },
  { value: 'wiz', label: 'Wiz', description: 'Cloud security GraphQL' },
  { value: 'sentinel', label: 'Azure Sentinel', description: 'KQL queries for Sentinel' },
  { value: 'chronicle', label: 'Google Chronicle', description: 'YARA-L queries' },
];

// Guardrails options
const GUARDRAILS = [
  { value: 'prompt_injection', label: 'Prompt Injection Protection', description: 'Block prompt injection attacks' },
  { value: 'content_filter', label: 'Content Filter', description: 'Filter inappropriate content' },
  { value: 'pii_detection', label: 'PII Detection', description: 'Detect and mask PII data' },
  { value: 'hallucination_check', label: 'Hallucination Check', description: 'Verify factual accuracy' },
  { value: 'output_validation', label: 'Output Validation', description: 'Validate output format' },
  { value: 'rate_limiting', label: 'Rate Limiting', description: 'Enforce request rate limits' },
];

// Use cases for configuration
const USE_CASES = [
  { value: 'summarization', label: 'Article Summarization', description: 'Executive and technical summaries' },
  { value: 'ioc_extraction', label: 'IOC/TTP Extraction', description: 'Extract indicators and techniques' },
  { value: 'hunt_query', label: 'Hunt Query Generation', description: 'Generate hunting queries' },
  { value: 'chatbot', label: 'Chatbot Responses', description: 'Interactive Q&A' },
  { value: 'report', label: 'Report Generation', description: 'Generate intelligence reports' },
];

const ComprehensiveGenAILab = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [testHistory, setTestHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('single');
  const [providerStatus, setProviderStatus] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load provider status, configs, and connected platforms in parallel
      const [providerRes, configsRes] = await Promise.all([
        client.get('/genai/providers/status').catch(() => ({ data: { usable_models: [], all_models: [], providers: {} } })),
        client.get('/genai/admin/configs').catch(() => ({ data: { configs: [] } }))
      ]);
      
      // Get usable models (models that can actually be used)
      const usableModels = providerRes.data.usable_models || [];
      const allModelsData = providerRes.data.all_models || [];
      
      setAvailableModels(usableModels);
      setAllModels(allModelsData);
      setConfigs(configsRes.data.configs || []);
      setProviderStatus(providerRes.data.providers || {});
      
      // Show recommendations if no usable models
      if (usableModels.length === 0 && providerRes.data.recommendations) {
        providerRes.data.recommendations.forEach(rec => {
          message.warning(rec, 5);
        });
      }
      
      // Try to get connected platforms from connectors
      try {
        const connectorsRes = await client.get('/connectors');
        const platforms = connectorsRes.data
          .filter(c => c.is_connected || c.is_enabled)
          .map(c => c.platform || c.type);
        setConnectedPlatforms(platforms);
      } catch (e) {
        // Default platforms if API fails
        setConnectedPlatforms(['xsiam', 'defender', 'splunk']);
      }
      
      // Load test history from localStorage
      const history = JSON.parse(localStorage.getItem('genai_test_history') || '[]');
      setTestHistory(history);
      
    } catch (error) {
      message.error('Failed to load data: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const groupModelsByProvider = (models) => {
    const grouped = {};
    models.forEach(model => {
      if (!grouped[model.provider]) {
        grouped[model.provider] = [];
      }
      grouped[model.provider].push(model);
    });
    return grouped;
  };

  const runSingleTest = async (values) => {
    try {
      setTesting(true);
      const startTime = Date.now();
      
      // First, check if the selected model is actually usable
      const selectedModel = availableModels.find(m => m.model_identifier === values.model);
      
      if (!selectedModel) {
        // Model not in usable list - FAIL immediately
        const endTime = Date.now();
        const result = {
          id: Date.now(),
          model: values.model,
          test_type: values.test_type,
          platform: values.platform,
          status: 'FAILED',
          error: 'Model not available - API key not configured or model not accessible',
          response: null,
          tokens_used: 0,
          cost: 0,
          response_time: endTime - startTime,
          timestamp: new Date().toISOString(),
          quality_score: 0
        };
        
        setTestResults([result]);
        message.error('Test FAILED: Model is not available. Configure API key or ensure model is accessible.');
        return;
      }
      
      // Build request based on test type
      const request = {
        model: values.model,
        test_type: values.test_type,
        platform: values.platform,
        prompt: values.prompt,
        temperature: values.temperature,
        max_tokens: values.max_tokens,
        top_p: values.top_p,
        guardrails: values.guardrails || [],
        config_id: values.config_id,
        sample_iocs: values.sample_iocs?.split('\n').filter(Boolean) || [],
        sample_ttps: values.sample_ttps?.split('\n').filter(Boolean) || [],
      };
      
      // Try to call the test endpoint - NO FALLBACK to mock data
      let response;
      try {
        response = await client.post('/genai/test/single', request);
        
        // Check if response indicates failure
        if (response.data.error || response.data.status === 'failed') {
          throw new Error(response.data.error || 'Model test failed');
        }
      } catch (e) {
        // API call failed - show FAILED status, don't fake success
        const endTime = Date.now();
        const errorMessage = e.response?.data?.detail || e.message || 'Model connection failed';
        
        const result = {
          id: Date.now(),
          model: values.model,
          model_name: selectedModel?.display_name || values.model,
          provider: selectedModel?.provider || 'unknown',
          test_type: values.test_type,
          platform: values.platform,
          status: 'FAILED',
          error: errorMessage,
          response: null,
          tokens_used: 0,
          cost: 0,
          response_time: endTime - startTime,
          timestamp: new Date().toISOString(),
          quality_score: 0
        };
        
        setTestResults([result]);
        saveToHistory(result);
        
        message.error(`Test FAILED: ${errorMessage}`);
        return;
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const result = {
        id: Date.now(),
        model: values.model,
        model_name: selectedModel?.display_name || values.model,
        provider: selectedModel?.provider || 'unknown',
        test_type: values.test_type,
        platform: values.platform,
        status: 'SUCCESS',
        config: configs.find(c => c.id === values.config_id)?.config_name || 'Custom',
        prompt: values.prompt,
        response: response.data.response,
        temperature: values.temperature,
        max_tokens: values.max_tokens,
        tokens_used: response.data.tokens_used,
        cost: response.data.cost,
        response_time: responseTime,
        timestamp: new Date().toISOString(),
        guardrails: values.guardrails || [],
        guardrails_passed: response.data.guardrails_passed,
        quality_score: calculateQualityScore(response.data, responseTime)
      };
      
      setTestResults([result]);
      saveToHistory(result);
      
      message.success('Test completed successfully');
    } catch (error) {
      message.error('Test failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setTesting(false);
    }
  };

  const generateMockResponse = (values) => {
    const testType = values.test_type;
    const platform = values.platform;
    
    if (testType === 'hunt_query') {
      if (platform === 'defender' || platform === 'sentinel') {
        return `// KQL Query for ${platform}
DeviceProcessEvents
| where Timestamp > ago(24h)
| where ProcessCommandLine contains "powershell" or ProcessCommandLine contains "cmd.exe"
| where ProcessCommandLine has_any ("Invoke-Expression", "IEX", "DownloadString", "WebClient")
| project Timestamp, DeviceName, AccountName, ProcessCommandLine, InitiatingProcessFileName
| order by Timestamp desc`;
      } else if (platform === 'splunk') {
        return `index=main sourcetype=windows:security
| search EventCode=4688
| where match(CommandLine, "(?i)(powershell|cmd\\.exe)")
| where match(CommandLine, "(?i)(Invoke-Expression|IEX|DownloadString)")
| table _time, ComputerName, User, CommandLine
| sort -_time`;
      } else if (platform === 'xsiam') {
        return `dataset = xdr_data
| filter event_type = PROCESS and action_process_command_line contains "powershell"
| filter action_process_command_line ~= "(?i)(Invoke-Expression|IEX|DownloadString)"
| fields _time, agent_hostname, actor_primary_username, action_process_command_line
| sort desc _time
| limit 1000`;
      }
    } else if (testType === 'executive_summary') {
      return `**Executive Summary**

A sophisticated threat campaign targeting enterprise environments has been identified. The threat actors are leveraging spear-phishing emails with malicious attachments to gain initial access.

**Key Findings:**
- Initial access via malicious Office documents
- Persistence established through scheduled tasks
- Lateral movement using compromised credentials
- Data exfiltration to external C2 infrastructure

**Risk Level:** HIGH
**Recommended Actions:** Immediate patching and credential rotation recommended.`;
    } else if (testType === 'ioc_extraction') {
      return `**Extracted IOCs:**

**IP Addresses:**
- 192.168.1.100 (C2 Server)
- 10.0.0.50 (Internal pivot)

**Domains:**
- malicious-domain.com
- c2-server.evil.net

**File Hashes:**
- SHA256: d41d8cd98f00b204e9800998ecf8427e
- MD5: a94a8fe5ccb19ba61c4c0873d391e987

**MITRE ATT&CK TTPs:**
- T1566.001: Spearphishing Attachment
- T1053.005: Scheduled Task
- T1059.001: PowerShell`;
    }
    
    return `[Test Response for ${testType}]\n\nModel: ${values.model}\nTemperature: ${values.temperature}\nMax Tokens: ${values.max_tokens}\n\nThis is a simulated response for testing the GenAI Lab interface.`;
  };

  const runComparisonTest = async (values) => {
    try {
      setTesting(true);
      
      // Build prompt based on test type
      let prompt = values.prompt;
      if (!prompt) {
        const testType = TEST_TYPES.find(t => t.value === values.test_type);
        prompt = `Generate a ${testType?.label || values.test_type} for the ${values.platform} platform.`;
        
        if (values.sample_iocs) {
          prompt += `\n\nSample IOCs to consider:\n${values.sample_iocs}`;
        }
        if (values.sample_ttps) {
          prompt += `\n\nMITRE ATT&CK TTPs:\n${values.sample_ttps}`;
        }
      }
      
      // Use the compare endpoint for efficiency - single request for all models
      const request = {
        models: selectedModels,
        prompt: prompt,
        temperature: values.temperature,
        max_tokens: values.max_tokens,
        top_p: values.top_p,
        use_guardrails: values.use_guardrails !== false,
        use_knowledge_base: values.use_knowledge_base === true,
        platform: values.platform
      };
      
      let results = [];
      
      try {
        const response = await client.post('/genai/test/compare', request);
        
        // Process results from backend
        results = (response.data.results || []).map((r, idx) => ({
          id: Date.now() + idx,
          model: r.model,
          model_name: r.model_name || r.model,
          provider: r.provider || 'unknown',
          test_type: values.test_type,
          platform: values.platform,
          status: r.status === 'success' ? 'SUCCESS' : 'FAILED',
          response: r.response || null,
          tokens_used: r.tokens_used || 0,
          cost: r.cost || 0,
          response_time: r.response_time_ms || 0,
          timestamp: new Date().toISOString(),
          guardrails_passed: r.guardrails_passed,
          quality_score: r.quality_metrics?.speed_score || (r.status === 'success' ? 75 : 0),
          error: r.error || null
        }));
        
        const successCount = results.filter(r => r.status === 'SUCCESS').length;
        const failCount = results.filter(r => r.status === 'FAILED').length;
        
        if (failCount === results.length) {
          message.error(`All ${failCount} model tests FAILED. Check API keys and model availability.`);
        } else if (failCount > 0) {
          message.warning(`Comparison: ${successCount} succeeded, ${failCount} failed`);
        } else {
          message.success(`Comparison completed: ${successCount} models tested successfully`);
        }
      } catch (error) {
        // If comparison endpoint fails, fall back to individual calls
        message.warning('Batch comparison failed, trying individual model tests...');
        
        for (const modelId of selectedModels) {
          const startTime = Date.now();
          const model = availableModels.find(m => m.model_identifier === modelId);
          
          if (!model) {
            results.push({
              id: Date.now() + results.length,
              model: modelId,
              model_name: modelId,
              provider: 'unknown',
              status: 'FAILED',
              error: 'Model not available - API key not configured',
              tokens_used: 0,
              cost: 0,
              response_time: 0,
              quality_score: 0,
              timestamp: new Date().toISOString()
            });
            continue;
          }
          
          try {
            const singleRequest = {
              model: modelId,
              prompt: prompt,
              temperature: values.temperature,
              max_tokens: values.max_tokens,
              top_p: values.top_p,
              use_guardrails: true
            };
            
            const response = await client.post('/genai/test/single', singleRequest);
            const endTime = Date.now();
            
            if (response.data.status === 'failed' || response.data.error) {
              throw new Error(response.data.error || 'Model test failed');
            }
            
            results.push({
              id: Date.now() + results.length,
              model: modelId,
              model_name: model.display_name,
              provider: model.provider,
              test_type: values.test_type,
              platform: values.platform,
              status: 'SUCCESS',
              response: response.data.response,
              tokens_used: response.data.tokens_used,
              cost: response.data.cost || 0,
              response_time: endTime - startTime,
              timestamp: new Date().toISOString(),
              guardrails_passed: response.data.guardrails_passed,
              quality_score: calculateQualityScore(response.data, endTime - startTime),
              error: null
            });
          } catch (err) {
            const endTime = Date.now();
            results.push({
              id: Date.now() + results.length,
              model: modelId,
              model_name: model?.display_name || modelId,
              provider: model?.provider || 'unknown',
              status: 'FAILED',
              error: err.response?.data?.detail || err.message || 'Connection failed',
              tokens_used: 0,
              cost: 0,
              response_time: endTime - startTime,
              quality_score: 0,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      setTestResults(results);
      results.forEach(r => saveToHistory(r));
      
      const successCount = results.filter(r => r.status === 'SUCCESS').length;
      const failCount = results.filter(r => r.status === 'FAILED').length;
      
      if (failCount === results.length) {
        message.error(`All ${failCount} model tests FAILED. Check API keys and model availability.`);
      } else if (failCount > 0) {
        message.warning(`Comparison: ${successCount} succeeded, ${failCount} failed`);
      } else {
        message.success(`Comparison completed: ${successCount} models tested successfully`);
      }
    } catch (error) {
      message.error('Comparison failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setTesting(false);
    }
  };

  const calculateQualityScore = (data, responseTime) => {
    let score = 70;
    if (data.guardrails_passed) score += 10;
    if (data.tokens_used < (data.max_tokens || 2000) * 0.8) score += 10;
    if (responseTime < 3000) score += 10;
    return Math.min(score, 100);
  };

  const saveToHistory = (result) => {
    const history = JSON.parse(localStorage.getItem('genai_test_history') || '[]');
    history.unshift(result);
    const trimmed = history.slice(0, 50);
    localStorage.setItem('genai_test_history', JSON.stringify(trimmed));
    setTestHistory(trimmed);
  };

  const clearHistory = () => {
    localStorage.removeItem('genai_test_history');
    setTestHistory([]);
    message.success('Test history cleared');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard!');
  };

  const groupedModels = groupModelsByProvider(availableModels);
  const groupedAllModels = groupModelsByProvider(allModels);

  // Filter platforms based on connected ones
  const activePlatforms = PLATFORMS.filter(p => 
    connectedPlatforms.includes(p.value) || connectedPlatforms.length === 0
  );

  return (
    <div className="comprehensive-genai-lab">
      <Card 
        title={
          <Space>
            <ExperimentOutlined />
            <span>GenAI Testing Lab</span>
            <Tag color="blue">Production Testing Ground</Tag>
          </Space>
        }
        extra={
          <Space>
            <Tag color={availableModels.length > 0 ? 'green' : 'red'}>
              {availableModels.length} Models Available
            </Tag>
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              Refresh
            </Button>
          </Space>
        }
      >
        <Alert
          message="Comprehensive Testing Environment"
          description="Test and compare models with different configurations, prompts, guardrails, and use cases before production deployment. Evaluate accuracy, reliability, cost, and performance."
          type="info"
          showIcon
          icon={<BulbOutlined />}
          style={{ marginBottom: 24 }}
        />

        {/* Provider Status Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {Object.entries(providerStatus).map(([key, provider]) => (
            <Col span={6} key={key}>
              <Card size="small">
                <Space>
                  {provider.status === 'connected' || provider.status === 'configured' ? (
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                  ) : provider.status === 'not_configured' ? (
                    <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: '#faad14', fontSize: 18 }} />
                  )}
                  <div>
                    <Text strong>{provider.name}</Text>
                    <br />
                    {provider.is_local ? (
                      <Tag color="purple" size="small">LOCAL</Tag>
                    ) : provider.has_api_key ? (
                      <Tag color="green" size="small">API KEY SET</Tag>
                    ) : (
                      <Tag color="red" size="small">NO API KEY</Tag>
                    )}
                    {provider.is_free && <Tag color="green" size="small">FREE</Tag>}
                  </div>
                </Space>
                {provider.available_models?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Models: {provider.available_models.slice(0, 2).join(', ')}
                      {provider.available_models.length > 2 && ` +${provider.available_models.length - 2} more`}
                    </Text>
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>

        {availableModels.length === 0 && (
          <Alert
            message="No Usable Models Found"
            description={
              <div>
                <p>To use the GenAI Testing Lab, you need at least one working model:</p>
                <ul>
                  <li><strong>Ollama (Recommended - FREE):</strong> Install Ollama, run <code>ollama serve</code>, then <code>ollama pull llama3</code></li>
                  <li><strong>OpenAI:</strong> Set <code>OPENAI_API_KEY</code> environment variable</li>
                  <li><strong>Anthropic:</strong> Set <code>ANTHROPIC_API_KEY</code> environment variable</li>
                  <li><strong>Gemini:</strong> Set <code>GEMINI_API_KEY</code> environment variable</li>
                </ul>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Show non-usable models with reasons */}
        {allModels.filter(m => !m.is_usable).length > 0 && (
          <Collapse ghost style={{ marginBottom: 24 }}>
            <Panel header={`${allModels.filter(m => !m.is_usable).length} models need configuration`} key="1">
              <Table
                dataSource={allModels.filter(m => !m.is_usable)}
                rowKey="model_identifier"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Model', dataIndex: 'display_name', key: 'name' },
                  { title: 'Provider', dataIndex: 'provider', key: 'provider', render: p => <Tag>{p}</Tag> },
                  { 
                    title: 'Issue', 
                    dataIndex: 'reason', 
                    key: 'reason',
                    render: r => <Text type="warning" style={{ fontSize: 12 }}>{r}</Text>
                  }
                ]}
              />
            </Panel>
          </Collapse>
        )}

        <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
          {/* Single Model Testing */}
          <Tabs.TabPane 
            tab={<span><RobotOutlined /> Single Model Test</span>} 
            key="single"
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={runSingleTest}
              initialValues={{
                temperature: 0.3,
                max_tokens: 2000,
                top_p: 0.9,
                test_type: 'hunt_query',
                platform: connectedPlatforms[0] || 'xsiam',
                guardrails: ['prompt_injection', 'output_validation'],
                sample_iocs: '192.168.1.100\nmalicious-domain.com\nd41d8cd98f00b204e9800998ecf8427e',
                sample_ttps: 'T1059\nT1053\nT1486'
              }}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Card title="Model & Configuration" size="small">
                    {/* Model Selection */}
                    <Form.Item
                      label="Select Model"
                      name="model"
                      rules={[{ required: true, message: 'Please select a model' }]}
                    >
                      <Select
                        placeholder="Choose a model to test"
                        showSearch
                        optionFilterProp="children"
                        notFoundContent={
                          <Alert
                            message="No models available"
                            description="Enable models in Admin → GenAI Models"
                            type="warning"
                            size="small"
                          />
                        }
                      >
                        {Object.entries(groupedModels).map(([provider, models]) => (
                          <OptGroup label={provider.toUpperCase()} key={provider}>
                            {models.map(model => (
                              <Option key={model.model_identifier} value={model.model_identifier}>
                                <Space>
                                  <span>{model.display_name}</span>
                                  {model.is_free && <Tag color="green" size="small">FREE</Tag>}
                                  {model.is_local && <Tag color="purple" size="small">LOCAL</Tag>}
                                  {!model.is_free && !model.is_local && (
                                    <Tag color="blue" size="small">API</Tag>
                                  )}
                                </Space>
                              </Option>
                            ))}
                          </OptGroup>
                        ))}
                      </Select>
                    </Form.Item>

                    {/* Test Type */}
                    <Form.Item
                      label="Test Type"
                      name="test_type"
                      rules={[{ required: true }]}
                    >
                      <Select placeholder="What to generate?">
                        {TEST_TYPES.map(t => (
                          <Option key={t.value} value={t.value}>
                            <Space>
                              {t.icon}
                              <span>{t.label}</span>
                              <Text type="secondary" style={{ fontSize: 11 }}>- {t.description}</Text>
                            </Space>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    {/* Platform Selection (conditional) */}
                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, curr) => prev.test_type !== curr.test_type}
                    >
                      {({ getFieldValue }) =>
                        getFieldValue('test_type') === 'hunt_query' && (
                          <Form.Item
                            label="Target Platform"
                            name="platform"
                            rules={[{ required: true }]}
                            tooltip="Select the SIEM/EDR platform for query generation"
                          >
                            <Select placeholder="Select target platform">
                              {connectedPlatforms.length > 0 && (
                                <OptGroup label="Connected Platforms">
                                  {PLATFORMS.filter(p => connectedPlatforms.includes(p.value)).map(p => (
                                    <Option key={p.value} value={p.value}>
                                      <Space>
                                        <ThunderboltOutlined />
                                        <span>{p.label}</span>
                                        <Tag color="green" size="small">Connected</Tag>
                                      </Space>
                                    </Option>
                                  ))}
                                </OptGroup>
                              )}
                              <OptGroup label="All Platforms">
                                {PLATFORMS.filter(p => !connectedPlatforms.includes(p.value)).map(p => (
                                  <Option key={p.value} value={p.value}>
                                    <Space>
                                      <ThunderboltOutlined />
                                      <span>{p.label}</span>
                                      <Text type="secondary" style={{ fontSize: 11 }}>- {p.description}</Text>
                                    </Space>
                                  </Option>
                                ))}
                              </OptGroup>
                            </Select>
                          </Form.Item>
                        )
                      }
                    </Form.Item>

                    {/* Use Configuration */}
                    <Form.Item
                      label="Use Configuration"
                      name="config_id"
                      tooltip="Apply a saved configuration with preset parameters"
                    >
                      <Select placeholder="Optional: Use saved config" allowClear>
                        <OptGroup label="Global">
                          {configs.filter(c => c.config_type === 'global').map(config => (
                            <Option key={config.id} value={config.id}>
                              <Space>
                                <span>{config.config_name}</span>
                                <Tag size="small">GLOBAL</Tag>
                                {config.is_default && <Tag color="gold" size="small">DEFAULT</Tag>}
                              </Space>
                            </Option>
                          ))}
                        </OptGroup>
                        <OptGroup label="Model-Specific">
                          {configs.filter(c => c.config_type === 'model').map(config => (
                            <Option key={config.id} value={config.id}>
                              <Space>
                                <span>{config.config_name}</span>
                                <Tag size="small" color="blue">{config.model_identifier}</Tag>
                              </Space>
                            </Option>
                          ))}
                        </OptGroup>
                        <OptGroup label="Use-Case Specific">
                          {configs.filter(c => c.config_type === 'use_case').map(config => (
                            <Option key={config.id} value={config.id}>
                              <Space>
                                <span>{config.config_name}</span>
                                <Tag size="small" color="purple">{config.use_case}</Tag>
                              </Space>
                            </Option>
                          ))}
                        </OptGroup>
                      </Select>
                    </Form.Item>

                    {/* Guardrails Multi-Select */}
                    <Form.Item
                      label={<Space><SafetyOutlined style={{ color: '#52c41a' }} /> Apply Guardrails</Space>}
                      name="guardrails"
                      tooltip="Select guardrails to apply during testing"
                    >
                      <Select
                        mode="multiple"
                        placeholder="Select guardrails to apply"
                        allowClear
                      >
                        {GUARDRAILS.map(g => (
                          <Option key={g.value} value={g.value}>
                            <Space>
                              <SafetyOutlined />
                              <span>{g.label}</span>
                            </Space>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    {/* Knowledge Base (RAG) Option */}
                    <Form.Item 
                      name="use_knowledge_base" 
                      valuePropName="checked"
                      style={{ marginBottom: 8 }}
                    >
                      <Checkbox>
                        <Space>
                          <BulbOutlined style={{ color: '#1890ff' }} />
                          <span>Use Knowledge Base (RAG)</span>
                        </Space>
                      </Checkbox>
                    </Form.Item>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12, marginLeft: 24 }}>
                      Retrieves relevant context from platform documentation and KB
                    </Text>

                    <Divider>Model Parameters</Divider>

                    <Form.Item label="Temperature" name="temperature">
                      <Slider
                        min={0}
                        max={2}
                        step={0.1}
                        marks={{
                          0: 'Precise',
                          0.3: 'Balanced',
                          0.7: 'Creative',
                          2: 'Random'
                        }}
                      />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Max Tokens" name="max_tokens">
                          <InputNumber min={1} max={100000} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Top P" name="top_p">
                          <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                </Col>

                <Col span={12}>
                  <Card title="Test Input" size="small">
                    {/* Dynamic input based on test type */}
                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, curr) => prev.test_type !== curr.test_type}
                    >
                      {({ getFieldValue }) => {
                        const testType = getFieldValue('test_type');
                        
                        if (testType === 'hunt_query') {
                          return (
                            <>
                              <Form.Item name="sample_iocs" label="Sample IOCs (one per line)">
                                <TextArea 
                                  rows={4} 
                                  placeholder="192.168.1.100&#10;malicious-domain.com&#10;hash-value"
                                  style={{ fontFamily: 'monospace' }}
                                />
                              </Form.Item>
                              <Form.Item name="sample_ttps" label="MITRE ATT&CK TTPs (one per line)">
                                <TextArea 
                                  rows={3} 
                                  placeholder="T1059&#10;T1053&#10;T1486"
                                  style={{ fontFamily: 'monospace' }}
                                />
                              </Form.Item>
                            </>
                          );
                        }
                        
                        return (
                          <Form.Item
                            label="Test Content / Prompt"
                            name="prompt"
                          >
                            <TextArea
                              rows={12}
                              placeholder={
                                testType === 'executive_summary' 
                                  ? "Paste threat intelligence article content here..."
                                  : testType === 'ioc_extraction'
                                  ? "Paste content to extract IOCs and TTPs from..."
                                  : testType === 'chatbot_response'
                                  ? "Enter a question for the chatbot..."
                                  : "Enter your test prompt..."
                              }
                              style={{ fontFamily: 'monospace' }}
                            />
                          </Form.Item>
                        );
                      }}
                    </Form.Item>

                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        icon={<PlayCircleOutlined />} 
                        loading={testing}
                        disabled={availableModels.length === 0}
                        size="large"
                      >
                        Run Test
                      </Button>
                      <Button onClick={() => form.resetFields()}>
                        Reset
                      </Button>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </Form>

            {/* Test Results */}
            {testResults.length > 0 && (
              <Card title="Test Results" style={{ marginTop: 24 }}>
                {testResults.map(result => (
                  <div key={result.id} className="test-result">
                    {/* Status Banner */}
                    {result.status === 'FAILED' ? (
                      <Alert
                        message={
                          <Space>
                            <CloseCircleOutlined />
                            <Text strong>TEST FAILED</Text>
                            <Tag color="red">{result.model_name || result.model}</Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <p><strong>Error:</strong> {result.error}</p>
                            <p><strong>Reason:</strong> The model API is not configured or the model is not accessible.</p>
                            <p><strong>Solution:</strong> Add the required API key in environment variables or ensure Ollama is running locally.</p>
                          </div>
                        }
                        type="error"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    ) : (
                      <Alert
                        message={
                          <Space>
                            <CheckCircleOutlined />
                            <Text strong>TEST SUCCESS</Text>
                            <Tag color="green">{result.model_name || result.model}</Tag>
                          </Space>
                        }
                        type="success"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )}

                    {result.status !== 'FAILED' && (
                      <>
                        <Row gutter={16}>
                          <Col span={6}>
                            <Statistic
                              title="Quality Score"
                              value={result.quality_score}
                              suffix="/ 100"
                              prefix={<CheckCircleOutlined />}
                              valueStyle={{ color: result.quality_score > 70 ? '#52c41a' : '#faad14' }}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title="Response Time"
                              value={result.response_time}
                              suffix="ms"
                              prefix={<ThunderboltOutlined />}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title="Tokens Used"
                              value={result.tokens_used}
                              prefix={<FileTextOutlined />}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title="Cost"
                              value={result.cost}
                              prefix="$"
                              precision={4}
                            />
                          </Col>
                        </Row>

                        <Divider />

                        <Space style={{ marginBottom: 12 }}>
                          <Tag color="blue">Model: {result.model}</Tag>
                          <Tag color="cyan">Provider: {result.provider}</Tag>
                          <Tag color="purple">Type: {result.test_type}</Tag>
                          {result.platform && <Tag color="green">Platform: {result.platform}</Tag>}
                          {result.guardrails?.length > 0 && (
                            <Tag color="orange">Guardrails: {result.guardrails.length} active</Tag>
                          )}
                        </Space>

                        <div className="response-content">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Title level={5}>Response:</Title>
                            <Button 
                              size="small" 
                              icon={<CopyOutlined />}
                              onClick={() => copyToClipboard(result.response)}
                            >
                              Copy
                            </Button>
                          </div>
                          <pre style={{ 
                            background: '#1a1a2e', 
                            color: '#0f0',
                            padding: 16, 
                            borderRadius: 6,
                            overflow: 'auto',
                            maxHeight: 400,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {result.response}
                          </pre>
                        </div>

                        {result.guardrails_passed !== undefined && (
                          <Alert
                            message={result.guardrails_passed ? "All Guardrails Passed" : "Guardrails Warning"}
                            type={result.guardrails_passed ? "success" : "warning"}
                            showIcon
                            style={{ marginTop: 16 }}
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </Tabs.TabPane>

          {/* Model Comparison */}
          <Tabs.TabPane 
            tab={<span><SwapOutlined /> Model Comparison</span>} 
            key="comparison"
          >
            <Alert
              message="Compare Multiple Models Side-by-Side"
              description="Test the same prompt across different models to evaluate which performs best for your use case."
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Card title="Select Models to Compare (2-5)" size="small" style={{ marginBottom: 24 }}>
              <Checkbox.Group
                style={{ width: '100%' }}
                value={selectedModels}
                onChange={setSelectedModels}
              >
                <Row gutter={[16, 16]}>
                  {availableModels.map(model => (
                    <Col span={8} key={model.model_identifier}>
                      <Card size="small" hoverable>
                        <Checkbox value={model.model_identifier}>
                          <Space direction="vertical" size="small">
                            <Text strong>{model.display_name}</Text>
                            <Space>
                              <Tag color="blue">{model.provider}</Tag>
                              {model.is_free && <Tag color="green">FREE</Tag>}
                              {model.is_local && <Tag color="purple">LOCAL</Tag>}
                            </Space>
                          </Space>
                        </Checkbox>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>

              {selectedModels.length > 0 && selectedModels.length < 6 && (
                <Alert
                  message={`${selectedModels.length} models selected for comparison`}
                  type="success"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
              {selectedModels.length > 5 && (
                <Alert
                  message="Maximum 5 models for comparison"
                  type="warning"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>

            <Form
              layout="vertical"
              onFinish={runComparisonTest}
              initialValues={{
                temperature: 0.3,
                max_tokens: 2000,
                top_p: 0.9,
                test_type: 'hunt_query',
                platform: 'xsiam',
                sample_iocs: '192.168.1.100\nmalicious-domain.com',
                sample_ttps: 'T1059\nT1053'
              }}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Card title="Test Configuration" size="small">
                    <Form.Item label="Test Type" name="test_type" rules={[{ required: true }]}>
                      <Select>
                        {TEST_TYPES.map(t => (
                          <Option key={t.value} value={t.value}>
                            <Space>{t.icon} {t.label}</Space>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item label="Platform" name="platform">
                      <Select>
                        {PLATFORMS.map(p => (
                          <Option key={p.value} value={p.value}>{p.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item label="Temperature" name="temperature">
                      <Slider min={0} max={2} step={0.1} marks={{ 0: '0', 1: '1', 2: '2' }} />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Max Tokens" name="max_tokens">
                          <InputNumber min={1} max={100000} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Top P" name="top_p">
                          <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                </Col>

                <Col span={12}>
                  <Card title="Test Input & Options" size="small">
                    <Form.Item name="sample_iocs" label="Sample IOCs">
                      <TextArea rows={3} style={{ fontFamily: 'monospace' }} placeholder="192.168.1.100&#10;malicious-domain.com" />
                    </Form.Item>
                    <Form.Item name="sample_ttps" label="Sample TTPs">
                      <TextArea rows={2} style={{ fontFamily: 'monospace' }} placeholder="T1059&#10;T1053" />
                    </Form.Item>

                    <Divider style={{ margin: '12px 0' }} />
                    
                    {/* Guardrails Option */}
                    <Form.Item 
                      name="use_guardrails" 
                      valuePropName="checked" 
                      initialValue={true}
                      style={{ marginBottom: 8 }}
                    >
                      <Checkbox>
                        <Space>
                          <SafetyOutlined style={{ color: '#52c41a' }} />
                          <span>Apply Security Guardrails</span>
                        </Space>
                      </Checkbox>
                    </Form.Item>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12, marginLeft: 24 }}>
                      Validates prompts against 50+ cybersecurity guardrails
                    </Text>
                    
                    {/* Knowledge Base (RAG) Option */}
                    <Form.Item 
                      name="use_knowledge_base" 
                      valuePropName="checked" 
                      initialValue={false}
                      style={{ marginBottom: 8 }}
                    >
                      <Checkbox>
                        <Space>
                          <BulbOutlined style={{ color: '#1890ff' }} />
                          <span>Use Knowledge Base (RAG)</span>
                        </Space>
                      </Checkbox>
                    </Form.Item>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 16, marginLeft: 24 }}>
                      Retrieves relevant context from platform documentation
                    </Text>

                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SwapOutlined />}
                      loading={testing}
                      disabled={selectedModels.length < 1 || selectedModels.length > 10}
                      block
                      size="large"
                    >
                      {testing ? 'Testing...' : `Compare ${selectedModels.length} Model${selectedModels.length !== 1 ? 's' : ''}`}
                    </Button>
                  </Card>
                </Col>
              </Row>
            </Form>

            {testResults.length > 0 && activeTab === 'comparison' && (
              <Card title="Comparison Results" style={{ marginTop: 24 }}>
                <Table
                  dataSource={testResults}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: 'Model',
                      dataIndex: 'model_name',
                      key: 'model',
                      render: (text, record) => (
                        <Space direction="vertical" size="small">
                          <Text strong>{text}</Text>
                          <Tag color="blue">{record.provider}</Tag>
                        </Space>
                      )
                    },
                    {
                      title: 'Quality',
                      dataIndex: 'quality_score',
                      key: 'quality',
                      sorter: (a, b) => (a.quality_score || 0) - (b.quality_score || 0),
                      render: (score) => (
                        <Progress
                          type="circle"
                          percent={score}
                          width={50}
                          strokeColor={score > 80 ? '#52c41a' : score > 60 ? '#1890ff' : '#faad14'}
                        />
                      )
                    },
                    {
                      title: 'Time',
                      dataIndex: 'response_time',
                      key: 'time',
                      sorter: (a, b) => (a.response_time || 0) - (b.response_time || 0),
                      render: (time) => `${time}ms`
                    },
                    {
                      title: 'Tokens',
                      dataIndex: 'tokens_used',
                      key: 'tokens',
                      sorter: (a, b) => (a.tokens_used || 0) - (b.tokens_used || 0)
                    },
                    {
                      title: 'Cost',
                      dataIndex: 'cost',
                      key: 'cost',
                      sorter: (a, b) => (a.cost || 0) - (b.cost || 0),
                      render: (cost) => cost === 0 ? <Tag color="green">FREE</Tag> : `$${cost.toFixed(4)}`
                    },
                    {
                      title: 'Status',
                      key: 'status',
                      render: (_, record) => (
                        record.error ? (
                          <Tag color="red" icon={<CloseCircleOutlined />}>Failed</Tag>
                        ) : (
                          <Tag color="green" icon={<CheckCircleOutlined />}>Success</Tag>
                        )
                      )
                    }
                  ]}
                  expandable={{
                    expandedRowRender: (record) => (
                      <div style={{ padding: 16 }}>
                        {record.error ? (
                          <Alert message="Error" description={record.error} type="error" showIcon />
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <Title level={5}>Response:</Title>
                              <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(record.response)}>
                                Copy
                              </Button>
                            </div>
                            <pre style={{ 
                              background: '#1a1a2e', 
                              color: '#0f0',
                              padding: 16, 
                              borderRadius: 6,
                              overflow: 'auto',
                              maxHeight: 300,
                              whiteSpace: 'pre-wrap'
                            }}>
                              {record.response}
                            </pre>
                          </>
                        )}
                      </div>
                    )
                  }}
                />
              </Card>
            )}
          </Tabs.TabPane>

          {/* Test History */}
          <Tabs.TabPane 
            tab={<span><HistoryOutlined /> Test History ({testHistory.length})</span>} 
            key="history"
          >
            <Card
              title="Test History"
              extra={
                <Button danger onClick={clearHistory} disabled={testHistory.length === 0}>
                  Clear History
                </Button>
              }
            >
              <Table
                dataSource={testHistory}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: 'Timestamp',
                    dataIndex: 'timestamp',
                    key: 'timestamp',
                    render: (time) => new Date(time).toLocaleString()
                  },
                  {
                    title: 'Model',
                    dataIndex: 'model',
                    key: 'model'
                  },
                  {
                    title: 'Type',
                    dataIndex: 'test_type',
                    key: 'test_type',
                    render: (type) => <Tag>{type}</Tag>
                  },
                  {
                    title: 'Platform',
                    dataIndex: 'platform',
                    key: 'platform',
                    render: (p) => p ? <Tag color="green">{p}</Tag> : '-'
                  },
                  {
                    title: 'Quality',
                    dataIndex: 'quality_score',
                    key: 'quality',
                    render: (score) => (
                      <Progress
                        percent={score}
                        size="small"
                        strokeColor={score > 80 ? '#52c41a' : score > 60 ? '#1890ff' : '#faad14'}
                      />
                    )
                  },
                  {
                    title: 'Time',
                    dataIndex: 'response_time',
                    key: 'time',
                    render: (time) => `${time}ms`
                  },
                  {
                    title: 'Cost',
                    dataIndex: 'cost',
                    key: 'cost',
                    render: (cost) => cost === 0 ? <Tag color="green">FREE</Tag> : `$${cost?.toFixed(4) || '0'}`
                  }
                ]}
              />
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* Ollama Setup Guide */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Collapse ghost>
          <Panel header="🚀 Ollama Local Setup Guide" key="ollama">
            <Paragraph>
              <Text strong>To run AI locally with Ollama:</Text>
            </Paragraph>
            <ol>
              <li>Install Ollama: <Text code>brew install ollama</Text> (macOS) or download from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">ollama.ai</a></li>
              <li>Start Ollama: <Text code>ollama serve</Text></li>
              <li>Pull a model: <Text code>ollama pull llama3</Text> or <Text code>ollama pull mistral</Text></li>
              <li>Enable model in Admin → GenAI Models</li>
            </ol>
            <Alert 
              type="info" 
              message="Ollama runs entirely on your local machine - no API keys or internet required!"
            />
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
};

export default ComprehensiveGenAILab;
