import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, Descriptions, Spin, message,
  Timeline, Divider, Typography, Input, Form, Row, Col, Alert, Tabs, Drawer
} from 'antd';
import {
  HistoryOutlined, EyeOutlined, CompareOutlined, RollbackOutlined,
  EditOutlined, SaveOutlined, FileTextOutlined, ClockCircleOutlined,
  UserOutlined, CheckCircleOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import ReactDiffViewer from 'react-diff-viewer';
import client from '../api/client';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

/**
 * Report Version Control Component
 * Provides diff view, version history, compare, and revert functionality
 */
const ReportVersionControl = ({ reportId }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [compareDrawerVisible, setCompareDrawerVisible] = useState(false);
  const [versionDrawerVisible, setVersionDrawerVisible] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareVersions, setCompareVersions] = useState([null, null]);
  const [versionData, setVersionData] = useState({});

  useEffect(() => {
    if (reportId) {
      fetchVersions();
    }
  }, [reportId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const response = await client.get(`/reports/${reportId}/versions`);
      setVersions(response.data || []);
    } catch (error) {
      message.error('Failed to load version history');
      console.error('Version fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionContent = async (versionNumber) => {
    if (versionData[versionNumber]) {
      return versionData[versionNumber];
    }

    try {
      const response = await client.get(`/reports/${reportId}/version/${versionNumber}`);
      setVersionData(prev => ({
        ...prev,
        [versionNumber]: response.data
      }));
      return response.data;
    } catch (error) {
      message.error(`Failed to load version ${versionNumber}`);
      return null;
    }
  };

  const handleViewVersion = async (version) => {
    const content = await fetchVersionContent(version.version_number);
    if (content) {
      setSelectedVersion({ ...version, ...content });
      setVersionDrawerVisible(true);
    }
  };

  const handleCompare = async (v1, v2) => {
    if (!v1 || !v2) {
      message.warning('Please select two versions to compare');
      return;
    }

    const [content1, content2] = await Promise.all([
      fetchVersionContent(v1.version_number),
      fetchVersionContent(v2.version_number)
    ]);

    if (content1 && content2) {
      setCompareVersions([
        { ...v1, ...content1 },
        { ...v2, ...content2 }
      ]);
      setCompareDrawerVisible(true);
    }
  };

  const handleRevert = (version) => {
    Modal.confirm({
      title: 'Revert to This Version?',
      content: (
        <div>
          <Paragraph>
            This will create a new version based on <strong>Version {version.version_number}</strong>.
            The current version will be preserved in history.
          </Paragraph>
          <Alert
            message="Note"
            description="This action creates a new version, it does not delete any existing versions."
            type="info"
            showIcon
            style={{ marginTop: 12 }}
          />
        </div>
      ),
      icon: <RollbackOutlined />,
      okText: 'Revert',
      okType: 'primary',
      onOk: async () => {
        try {
          // Load version content
          const content = await fetchVersionContent(version.version_number);
          
          // Update report with old content
          await client.patch(`/reports/${reportId}`, {
            title: content.title,
            content: content.content,
            executive_summary: content.executive_summary,
            technical_summary: content.technical_summary,
            key_findings: content.key_findings,
            recommendations: content.recommendations
          });

          message.success('Report reverted successfully');
          fetchVersions();
        } catch (error) {
          message.error('Failed to revert report');
        }
      }
    });
  };

  const columns = [
    {
      title: 'Version',
      dataIndex: 'version_number',
      key: 'version',
      width: 100,
      render: (v, record) => (
        <Tag color={v === versions[0]?.version_number ? 'blue' : 'default'} style={{ fontSize: 14, padding: '4px 12px' }}>
          v{v} {v === versions[0]?.version_number && '(Current)'}
        </Tag>
      )
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const colors = {
          PUBLISHED: 'green',
          DRAFT: 'orange',
          ARCHIVED: 'default'
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      }
    },
    {
      title: 'Change Summary',
      dataIndex: 'change_summary',
      key: 'change_summary',
      ellipsis: true,
      render: (text) => <Text type="secondary">{text || 'No summary provided'}</Text>
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date) => (
        <Space>
          <ClockCircleOutlined />
          <Text>{new Date(date).toLocaleString()}</Text>
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewVersion(record)}
          >
            View
          </Button>
          <Button
            size="small"
            icon={<RollbackOutlined />}
            onClick={() => handleRevert(record)}
            disabled={record.version_number === versions[0]?.version_number}
          >
            Revert
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="report-version-control">
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>Version History</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<CompareOutlined />}
              onClick={() => {
                if (versions.length >= 2) {
                  handleCompare(versions[0], versions[1]);
                } else {
                  message.info('Need at least 2 versions to compare');
                }
              }}
              disabled={versions.length < 2}
            >
              Compare Latest
            </Button>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : versions.length === 0 ? (
          <Alert
            message="No Version History"
            description="This report has not been published yet, or version tracking is not enabled."
            type="info"
            showIcon
          />
        ) : (
          <>
            <Timeline mode="left" style={{ marginTop: 24, marginBottom: 24 }}>
              {versions.map((version) => (
                <Timeline.Item
                  key={version.version_number}
                  color={version.version_number === versions[0]?.version_number ? 'blue' : 'gray'}
                  label={
                    <Text type="secondary">{new Date(version.created_at).toLocaleDateString()}</Text>
                  }
                >
                  <Card size="small" hoverable onClick={() => handleViewVersion(version)} style={{ cursor: 'pointer' }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <Tag color="blue">v{version.version_number}</Tag>
                        <Text strong>{version.title}</Text>
                      </Space>
                      {version.change_summary && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {version.change_summary}
                        </Text>
                      )}
                    </Space>
                  </Card>
                </Timeline.Item>
              ))}
            </Timeline>

            <Divider />

            <Table
              columns={columns}
              dataSource={versions}
              rowKey="version_number"
              pagination={{ pageSize: 10 }}
              size="middle"
            />
          </>
        )}
      </Card>

      {/* Version Detail Drawer */}
      <Drawer
        title={selectedVersion ? `Version ${selectedVersion.version_number} Details` : 'Version Details'}
        width={800}
        open={versionDrawerVisible}
        onClose={() => {
          setVersionDrawerVisible(false);
          setSelectedVersion(null);
        }}
      >
        {selectedVersion && (
          <div>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Version">{selectedVersion.version_number}</Descriptions.Item>
              <Descriptions.Item label="Title">{selectedVersion.title}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedVersion.status === 'PUBLISHED' ? 'green' : 'orange'}>
                  {selectedVersion.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Created">{new Date(selectedVersion.created_at).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Change Summary">{selectedVersion.change_summary || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Change Notes">{selectedVersion.change_notes || 'N/A'}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Tabs defaultActiveKey="executive">
              <TabPane tab="Executive Summary" key="executive">
                <div style={{ padding: 16, background: '#f9f9f9', borderRadius: 4, minHeight: 200 }}>
                  <Paragraph>{selectedVersion.executive_summary || 'No executive summary'}</Paragraph>
                </div>
              </TabPane>
              <TabPane tab="Technical Summary" key="technical">
                <div style={{ padding: 16, background: '#f9f9f9', borderRadius: 4, minHeight: 200 }}>
                  <Paragraph>{selectedVersion.technical_summary || 'No technical summary'}</Paragraph>
                </div>
              </TabPane>
              <TabPane tab="Full Content" key="content">
                <div style={{ padding: 16, background: '#f9f9f9', borderRadius: 4, minHeight: 200 }}>
                  <div dangerouslySetInnerHTML={{ __html: selectedVersion.content || 'No content' }} />
                </div>
              </TabPane>
            </Tabs>
          </div>
        )}
      </Drawer>

      {/* Compare Drawer */}
      <Drawer
        title={`Compare Versions: v${compareVersions[0]?.version_number} ↔ v${compareVersions[1]?.version_number}`}
        width="90%"
        open={compareDrawerVisible}
        onClose={() => {
          setCompareDrawerVisible(false);
          setCompareVersions([null, null]);
        }}
      >
        {compareVersions[0] && compareVersions[1] && (
          <Tabs defaultActiveKey="executive">
            <TabPane tab="Executive Summary" key="executive">
              <ReactDiffViewer
                oldValue={compareVersions[1].executive_summary || ''}
                newValue={compareVersions[0].executive_summary || ''}
                splitView={true}
                leftTitle={`Version ${compareVersions[1].version_number}`}
                rightTitle={`Version ${compareVersions[0].version_number}`}
                showDiffOnly={false}
              />
            </TabPane>
            <TabPane tab="Technical Summary" key="technical">
              <ReactDiffViewer
                oldValue={compareVersions[1].technical_summary || ''}
                newValue={compareVersions[0].technical_summary || ''}
                splitView={true}
                leftTitle={`Version ${compareVersions[1].version_number}`}
                rightTitle={`Version ${compareVersions[0].version_number}`}
                showDiffOnly={false}
              />
            </TabPane>
            <TabPane tab="Full Content" key="content">
              <ReactDiffViewer
                oldValue={compareVersions[1].content || ''}
                newValue={compareVersions[0].content || ''}
                splitView={true}
                leftTitle={`Version ${compareVersions[1].version_number}`}
                rightTitle={`Version ${compareVersions[0].version_number}`}
                showDiffOnly={false}
              />
            </TabPane>
          </Tabs>
        )}
      </Drawer>
    </div>
  );
};

export default ReportVersionControl;
