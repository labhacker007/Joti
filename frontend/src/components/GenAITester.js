import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, Select, Space, message, Alert,
  Spin, Typography, Divider, Tag, Tabs, Row, Col, Collapse
} from 'antd';
import {
  RobotOutlined, ThunderboltOutlined, FileTextOutlined,
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  CopyOutlined, ReloadOutlined
} from '@ant-design/icons';
import { adminAPI } from '../api/client';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

const PROVIDERS = [
  { value: 'ollama', label: 'Ollama (Local)', description: 'Run locally with Ollama' },
  { value: 'openai', label: 'OpenAI', description: 'GPT-4 / GPT-3.5' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude 3.5' },
  { value: 'gemini', label: 'Google Gemini', description: 'Gemini Pro' },
];

const PLATFORMS = [
  { value: 'xsiam', label: 'Cortex XSIAM', description: 'Palo Alto XQL queries' },
  { value: 'defender', label: 'Microsoft Defender', description: 'KQL queries' },
  { value: 'splunk', label: 'Splunk', description: 'SPL queries' },
  { value: 'wiz', label: 'Wiz', description: 'Cloud security GraphQL' },
];

const TEST_TYPES = [
  { value: 'query', label: 'Hunt Query Generation', icon: <ThunderboltOutlined /> },
  { value: 'summary', label: 'Executive Summary', icon: <FileTextOutlined /> },
  { value: 'analysis', label: 'Hunt Result Analysis', icon: <RobotOutlined /> },
];

export default function GenAITester() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [providerStatus, setProviderStatus] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    checkProviders();
  }, []);

  const checkProviders = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.testConfiguration('genai');
      setProviderStatus(response.data);
    } catch (error) {
      console.error('Failed to check providers', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (values) => {
    setTesting(true);
    setTestResult(null);
    try {
      const request = {
        provider: values.provider,
        test_type: values.test_type,
        platform: values.platform,
        sample_iocs: values.sample_iocs?.split('\n').filter(Boolean) || [],
        sample_ttps: values.sample_ttps?.split('\n').filter(Boolean) || [],
        sample_content: values.sample_content,
      };

      const response = await adminAPI.testGenAI(request);
      setTestResult(response.data);

      if (response.data.status === 'success') {
        message.success('GenAI test completed successfully!');
      } else {
        message.error('GenAI test failed: ' + response.data.error);
      }
    } catch (error) {
      message.error('Test failed: ' + (error.response?.data?.detail || error.message));
      setTestResult({
        status: 'failed',
        error: error.response?.data?.detail || error.message
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard!');
  };

  const getProviderTestStatus = (providerName) => {
    if (!providerStatus?.tests) return null;
    return providerStatus.tests.find(t => 
      t.name.toLowerCase().includes(providerName.toLowerCase())
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <RobotOutlined /> GenAI Testing Lab
        </Title>
        <Text type="secondary">
          Test hunt query generation, summarization, and analysis with different AI providers
        </Text>
      </div>

      {/* Provider Status */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 8 }}>
          <Text strong>Provider Status:</Text>
          <Button size="small" icon={<ReloadOutlined />} onClick={checkProviders} loading={loading}>
            Refresh
          </Button>
        </Space>
        {loading ? (
          <Spin size="small" />
        ) : (
          <Row gutter={[16, 8]}>
            {PROVIDERS.map(provider => {
              const status = getProviderTestStatus(provider.value);
              return (
                <Col span={6} key={provider.value}>
                  <Card size="small">
                    <Space>
                      {status?.status === 'success' ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : status?.status === 'failed' ? (
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      ) : (
                        <span style={{ color: '#999' }}>○</span>
                      )}
                      <Text>{provider.label}</Text>
                    </Space>
                    {status?.available_models && (
                      <div style={{ marginTop: 4 }}>
                        {status.available_models.slice(0, 2).map(m => (
                          <Tag key={m} size="small">{m}</Tag>
                        ))}
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      <Row gutter={16}>
        {/* Test Configuration */}
        <Col span={10}>
          <Card title="Test Configuration" size="small">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleTest}
              initialValues={{
                provider: 'ollama',
                test_type: 'query',
                platform: 'xsiam',
                sample_iocs: '192.168.1.100\nmalicious-domain.com\nd41d8cd98f00b204e9800998ecf8427e',
                sample_ttps: 'T1059\nT1053\nT1486'
              }}
            >
              <Form.Item name="provider" label="AI Provider" rules={[{ required: true }]}>
                <Select>
                  {PROVIDERS.map(p => (
                    <Option key={p.value} value={p.value}>
                      <Space>
                        <RobotOutlined />
                        {p.label}
                        <Text type="secondary" style={{ fontSize: 11 }}>- {p.description}</Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="test_type" label="Test Type" rules={[{ required: true }]}>
                <Select>
                  {TEST_TYPES.map(t => (
                    <Option key={t.value} value={t.value}>
                      <Space>{t.icon} {t.label}</Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item 
                noStyle 
                shouldUpdate={(prev, curr) => prev.test_type !== curr.test_type}
              >
                {({ getFieldValue }) => 
                  getFieldValue('test_type') === 'query' && (
                    <Form.Item name="platform" label="Target Platform" rules={[{ required: true }]}>
                      <Select>
                        {PLATFORMS.map(p => (
                          <Option key={p.value} value={p.value}>
                            <Space>
                              <ThunderboltOutlined />
                              {p.label}
                              <Text type="secondary" style={{ fontSize: 11 }}>- {p.description}</Text>
                            </Space>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )
                }
              </Form.Item>

              <Form.Item 
                noStyle 
                shouldUpdate={(prev, curr) => prev.test_type !== curr.test_type}
              >
                {({ getFieldValue }) => 
                  getFieldValue('test_type') === 'query' && (
                    <>
                      <Form.Item name="sample_iocs" label="Sample IOCs (one per line)">
                        <TextArea rows={4} placeholder="192.168.1.100&#10;malicious-domain.com&#10;hash-value" />
                      </Form.Item>
                      <Form.Item name="sample_ttps" label="MITRE ATT&CK TTPs (one per line)">
                        <TextArea rows={3} placeholder="T1059&#10;T1053" />
                      </Form.Item>
                    </>
                  )
                }
              </Form.Item>

              <Form.Item 
                noStyle 
                shouldUpdate={(prev, curr) => prev.test_type !== curr.test_type}
              >
                {({ getFieldValue }) => 
                  getFieldValue('test_type') === 'summary' && (
                    <Form.Item name="sample_content" label="Sample Article Content">
                      <TextArea 
                        rows={8} 
                        placeholder="Paste threat intelligence article content here..."
                        defaultValue={`A new ransomware campaign targeting healthcare organizations has been observed.
The threat actors are using spear-phishing emails with malicious Excel attachments.
Once executed, the malware establishes persistence via scheduled tasks and 
communicates with C2 servers at 192.168.1.100 and malicious-domain.com.
The ransomware encrypts files using AES-256 and demands payment in Bitcoin.`}
                      />
                    </Form.Item>
                  )
                }
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<PlayCircleOutlined />}
                  loading={testing}
                  block
                >
                  Run Test
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Test Results */}
        <Col span={14}>
          <Card 
            title="Test Results" 
            size="small"
            extra={
              testResult?.status === 'success' && (
                <Tag color="success" icon={<CheckCircleOutlined />}>Success</Tag>
              )
            }
          >
            {testing ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
                <Paragraph style={{ marginTop: 16 }}>
                  Generating with AI...
                </Paragraph>
              </div>
            ) : testResult ? (
              <div>
                {testResult.status === 'failed' ? (
                  <Alert
                    type="error"
                    message="Test Failed"
                    description={
                      <div>
                        <Paragraph>{testResult.error}</Paragraph>
                        {testResult.suggestion && (
                          <Paragraph type="secondary">{testResult.suggestion}</Paragraph>
                        )}
                      </div>
                    }
                  />
                ) : (
                  <div>
                    <Space style={{ marginBottom: 12 }}>
                      <Tag color="blue">Provider: {testResult.provider}</Tag>
                      {testResult.model && <Tag color="purple">Model: {testResult.model}</Tag>}
                      {testResult.platform && <Tag color="green">Platform: {testResult.platform}</Tag>}
                      {testResult.is_fallback && <Tag color="orange">Fallback Template</Tag>}
                    </Space>

                    <Divider style={{ margin: '12px 0' }} />

                    {testResult.generated_query && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong>Generated Hunt Query:</Text>
                          <Button 
                            size="small" 
                            icon={<CopyOutlined />}
                            onClick={() => copyToClipboard(testResult.generated_query)}
                          >
                            Copy
                          </Button>
                        </div>
                        <pre style={{ 
                          background: '#1a1a2e', 
                          color: '#0f0',
                          padding: 12, 
                          borderRadius: 6,
                          overflow: 'auto',
                          maxHeight: 400,
                          marginTop: 8,
                          fontSize: 12
                        }}>
                          {testResult.generated_query}
                        </pre>
                      </div>
                    )}

                    {testResult.generated_summary && (
                      <div>
                        <Text strong>Generated Summary:</Text>
                        <Card size="small" style={{ marginTop: 8, background: '#f9f9f9' }}>
                          <Paragraph>{testResult.generated_summary}</Paragraph>
                        </Card>
                      </div>
                    )}

                    {testResult.analysis && (
                      <div>
                        <Text strong>Hunt Analysis:</Text>
                        <Collapse style={{ marginTop: 8 }}>
                          {Object.entries(testResult.analysis).map(([key, value]) => (
                            <Panel header={key.replace(/_/g, ' ').toUpperCase()} key={key}>
                              {Array.isArray(value) ? (
                                <ul>
                                  {value.map((v, i) => <li key={i}>{JSON.stringify(v)}</li>)}
                                </ul>
                              ) : typeof value === 'object' ? (
                                <pre>{JSON.stringify(value, null, 2)}</pre>
                              ) : (
                                <Paragraph>{String(value)}</Paragraph>
                              )}
                            </Panel>
                          ))}
                        </Collapse>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Alert
                type="info"
                message="Ready to Test"
                description="Configure the test parameters and click 'Run Test' to generate queries or summaries using AI."
              />
            )}
          </Card>
        </Col>
      </Row>

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
              <li>Pull a model: <Text code>ollama pull llama3.1:8b</Text> or <Text code>ollama pull mistral</Text></li>
              <li>Configure in Admin → Configuration → GenAI:
                <ul>
                  <li>Set provider to "ollama"</li>
                  <li>Set ollama_base_url to "http://localhost:11434"</li>
                  <li>Set ollama_model to your pulled model name</li>
                </ul>
              </li>
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
}
