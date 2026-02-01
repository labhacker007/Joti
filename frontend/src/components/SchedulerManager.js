import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, Form, Input, Select,
  Switch, message, Tooltip, Badge, Descriptions, Row, Col,
  Collapse, Alert, InputNumber, Radio, Popconfirm, Typography, Divider
} from 'antd';
import {
  ScheduleOutlined, PlayCircleOutlined, PauseCircleOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  ClockCircleOutlined, ThunderboltOutlined, FileTextOutlined,
  DatabaseOutlined, RobotOutlined, SettingOutlined, InfoCircleOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { automationAPI } from '../api/client';
import { useTimezone } from '../context/TimezoneContext';
import { useAuthStore } from '../store';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

// Category icons and colors
const CATEGORY_CONFIG = {
  ingestion: { icon: <DatabaseOutlined />, color: 'blue', label: 'Ingestion' },
  processing: { icon: <RobotOutlined />, color: 'purple', label: 'Processing' },
  reports: { icon: <FileTextOutlined />, color: 'green', label: 'Reports' },
  maintenance: { icon: <SettingOutlined />, color: 'orange', label: 'Maintenance' },
  knowledge: { icon: <DatabaseOutlined />, color: 'cyan', label: 'Knowledge Base' },
  hunts: { icon: <ThunderboltOutlined />, color: 'red', label: 'Threat Hunts' },
  custom: { icon: <ScheduleOutlined />, color: 'default', label: 'Custom' }
};

// Day of week options
const DAYS_OF_WEEK = [
  { value: '*', label: 'Every Day' },
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
  { value: 'mon-fri', label: 'Weekdays (Mon-Fri)' }
];

function SchedulerManager() {
  const { formatDateTime } = useTimezone();
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState([]);
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [form] = Form.useForm();
  
  // Only admin can edit/delete jobs
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, functionsRes] = await Promise.all([
        automationAPI.getScheduledJobs(),
        automationAPI.getAvailableFunctions()
      ]);
      setJobs(jobsRes.data?.jobs || []);
      setFunctions(functionsRes.data?.functions || []);
    } catch (err) {
      console.error('Failed to fetch scheduler data:', err);
      message.error('Failed to load scheduler data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = () => {
    setEditingJob(null);
    form.resetFields();
    form.setFieldsValue({
      trigger_type: 'cron',
      cron_hour: 8,
      cron_minute: 0,
      cron_day_of_week: '*',
      enabled: true
    });
    setModalVisible(true);
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    
    // Parse trigger to set form values
    const triggerStr = job.trigger || '';
    const isCron = triggerStr.includes('cron');
    
    form.setFieldsValue({
      job_id: job.id,
      name: job.name,
      function_id: job.function_id || job.id,
      trigger_type: isCron ? 'cron' : 'interval',
      enabled: !job.paused
    });
    
    // Try to parse trigger details
    if (isCron) {
      // Parse cron trigger string
      const hourMatch = triggerStr.match(/hour='(\d+)'/);
      const minuteMatch = triggerStr.match(/minute='(\d+)'/);
      const dowMatch = triggerStr.match(/day_of_week='([^']+)'/);
      
      if (hourMatch) form.setFieldsValue({ cron_hour: parseInt(hourMatch[1]) });
      if (minuteMatch) form.setFieldsValue({ cron_minute: parseInt(minuteMatch[1]) });
      if (dowMatch) form.setFieldsValue({ cron_day_of_week: dowMatch[1] });
    } else {
      // Parse interval trigger
      const intervalMatch = triggerStr.match(/(\d+):(\d+):(\d+)/);
      if (intervalMatch) {
        const hours = parseInt(intervalMatch[1]);
        const minutes = parseInt(intervalMatch[2]);
        form.setFieldsValue({
          interval_hours: hours,
          interval_minutes: minutes
        });
      }
    }
    
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const jobData = {
        job_id: values.job_id,
        name: values.name,
        function_id: values.function_id,
        trigger_type: values.trigger_type,
        enabled: values.enabled
      };

      if (values.trigger_type === 'interval') {
        jobData.interval_hours = values.interval_hours || 0;
        jobData.interval_minutes = values.interval_minutes || 0;
      } else {
        jobData.cron_hour = values.cron_hour;
        jobData.cron_minute = values.cron_minute;
        jobData.cron_day_of_week = values.cron_day_of_week;
      }

      if (editingJob) {
        await automationAPI.updateJob(editingJob.id, jobData);
        message.success('Job updated successfully');
      } else {
        await automationAPI.createJob(jobData);
        message.success('Job created successfully');
      }

      setModalVisible(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save job:', err);
      message.error(err.response?.data?.detail || 'Failed to save job');
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await automationAPI.deleteJob(jobId);
      message.success('Job deleted successfully');
      fetchData();
    } catch (err) {
      console.error('Failed to delete job:', err);
      message.error(err.response?.data?.detail || 'Failed to delete job');
    }
  };

  const handleTogglePause = async (job) => {
    try {
      if (job.paused) {
        await automationAPI.resumeJob(job.id);
        message.success('Job resumed');
      } else {
        await automationAPI.pauseJob(job.id);
        message.success('Job paused');
      }
      fetchData();
    } catch (err) {
      console.error('Failed to toggle job:', err);
      message.error('Failed to toggle job status');
    }
  };

  const handleRunNow = async (job) => {
    try {
      await automationAPI.runJobNow(job.id);
      message.success(`Job "${job.name}" triggered successfully`);
      // Refresh after a short delay to show updated last_run
      setTimeout(fetchData, 2000);
    } catch (err) {
      console.error('Failed to run job:', err);
      message.error('Failed to trigger job');
    }
  };

  const showJobDetails = (job) => {
    setSelectedJob(job);
    setDetailsVisible(true);
  };

  const getCategoryConfig = (category) => {
    return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.custom;
  };

  // Group functions by category
  const functionsByCategory = functions.reduce((acc, func) => {
    const cat = func.category || 'custom';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(func);
    return acc;
  }, {});

  const columns = [
    {
      title: 'Job',
      key: 'job',
      render: (_, record) => {
        const catConfig = getCategoryConfig(record.category);
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <span style={{ color: `var(--${catConfig.color === 'default' ? 'text-secondary' : catConfig.color})` }}>
                {catConfig.icon}
              </span>
              <Text strong style={{ cursor: 'pointer' }} onClick={() => showJobDetails(record)}>
                {record.name}
              </Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.id}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 130,
      render: (category) => {
        const config = getCategoryConfig(category);
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    {
      title: 'Schedule',
      dataIndex: 'trigger',
      key: 'trigger',
      width: 200,
      render: (trigger) => (
        <Text code style={{ fontSize: 11 }}>{trigger}</Text>
      )
    },
    {
      title: 'Next Run',
      dataIndex: 'next_run',
      key: 'next_run',
      width: 160,
      render: (nextRun, record) => {
        if (record.paused) {
          return <Tag color="warning">Paused</Tag>;
        }
        return nextRun ? (
          <Tooltip title={formatDateTime(nextRun)}>
            <Space>
              <ClockCircleOutlined />
              <Text style={{ fontSize: 12 }}>{new Date(nextRun).toLocaleString()}</Text>
            </Space>
          </Tooltip>
        ) : '-';
      }
    },
    {
      title: 'Last Run',
      key: 'last_run',
      width: 180,
      render: (_, record) => {
        if (!record.last_run) {
          return <Text type="secondary" style={{ fontSize: 11 }}>Never</Text>;
        }
        const lastRunDate = new Date(record.last_run);
        const statusColor = record.last_status === 'completed' ? 'green' : 
                           record.last_status === 'failed' ? 'red' : 
                           record.last_status === 'partial' ? 'orange' : 'default';
        return (
          <Tooltip title={`${formatDateTime(record.last_run)} - Duration: ${record.last_duration_ms || 0}ms`}>
            <Space direction="vertical" size={0}>
              <Text style={{ fontSize: 11 }}>{lastRunDate.toLocaleString()}</Text>
              <Space size={4}>
                <Tag color={statusColor} style={{ fontSize: 10, margin: 0 }}>
                  {record.last_status || 'unknown'}
                </Tag>
                {record.run_count > 0 && (
                  <Text type="secondary" style={{ fontSize: 10 }}>#{record.run_count}</Text>
                )}
              </Space>
            </Space>
          </Tooltip>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Badge
          status={record.paused ? 'warning' : 'success'}
          text={record.paused ? 'Paused' : 'Active'}
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          {/* Run Now button - Test scheduler immediately */}
          <Popconfirm
            title="Run this job now?"
            description={`This will trigger "${record.name}" to run immediately.`}
            onConfirm={() => handleRunNow(record)}
            okText="Run Now"
            cancelText="Cancel"
          >
            <Tooltip title="Run job immediately for testing">
              <Button
                size="small"
                type="primary"
                ghost
                icon={<ThunderboltOutlined />}
              >
                Run
              </Button>
            </Tooltip>
          </Popconfirm>
          
          {/* Play/Pause toggle button - combined like audio player */}
          <Tooltip title={record.paused ? 'Resume Schedule' : 'Pause Schedule'}>
            <Button
              size="small"
              type={record.paused ? 'primary' : 'default'}
              icon={record.paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              onClick={() => handleTogglePause(record)}
            >
              {record.paused ? 'Resume' : 'Pause'}
            </Button>
          </Tooltip>
          
          {/* Edit button - Admin only */}
          {isAdmin && (
            <Tooltip title="Edit">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditJob(record)}
              />
            </Tooltip>
          )}
          
          {/* Delete button - Admin only, with stronger confirmation for system jobs */}
          {isAdmin && (
            record.is_system ? (
              <Popconfirm
                title={<span style={{ color: '#ff4d4f', fontWeight: 600 }}>⚠️ Delete System Job?</span>}
                description={
                  <div style={{ maxWidth: 300 }}>
                    <p><strong>{record.name}</strong> is a core system job.</p>
                    <p style={{ color: '#ff4d4f' }}>
                      Deleting this may affect critical automation functions like feed ingestion, article processing, or scheduled reports.
                    </p>
                    <p>Are you absolutely sure you want to delete this job?</p>
                  </div>
                }
                onConfirm={() => handleDeleteJob(record.id)}
                okText="Yes, Delete System Job"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              >
                <Tooltip title="Delete System Job">
                  <Button size="small" icon={<DeleteOutlined />} danger />
                </Tooltip>
              </Popconfirm>
            ) : (
              <Popconfirm
                title="Delete this job?"
                description="This action cannot be undone."
                onConfirm={() => handleDeleteJob(record.id)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Delete">
                  <Button size="small" icon={<DeleteOutlined />} danger />
                </Tooltip>
              </Popconfirm>
            )
          )}
        </Space>
      )
    }
  ];

  const triggerType = Form.useWatch('trigger_type', form);

  return (
    <div className="scheduler-manager">
      <Card
        title={
          <Space>
            <ScheduleOutlined style={{ color: 'var(--primary)' }} />
            <span>Job Scheduler</span>
            <Tag color="blue">{jobs.length} jobs</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateJob}>
              Create Job
            </Button>
          </Space>
        }
      >
        <Alert
          message="Schedule Automation Jobs"
          description={
            <span>
              Configure when to run intelligence reports, data processing, feed ingestion, and other automated tasks.
              {isAdmin ? ' As an admin, you can edit and delete all jobs including system jobs.' : ' Only admins can edit or delete jobs.'}
            </span>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={jobs}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </Card>

      {/* Available Functions Reference */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ color: 'var(--primary)' }} />
            <span>Available Functions</span>
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <Collapse accordion>
          {Object.entries(functionsByCategory).map(([category, funcs]) => {
            const catConfig = getCategoryConfig(category);
            return (
              <Panel
                key={category}
                header={
                  <Space>
                    <span style={{ color: `var(--${catConfig.color})` }}>{catConfig.icon}</span>
                    <span>{catConfig.label}</span>
                    <Tag>{funcs.length}</Tag>
                  </Space>
                }
              >
                {funcs.map(func => (
                  <Card
                    key={func.id}
                    size="small"
                    style={{ marginBottom: 8 }}
                    title={
                      <Space>
                        <Text strong>{func.name}</Text>
                        <Text code style={{ fontSize: 11 }}>{func.id}</Text>
                        {func.is_system && <Tag color="blue">System</Tag>}
                      </Space>
                    }
                  >
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="Description">{func.description}</Descriptions.Item>
                      <Descriptions.Item label="Details">{func.details}</Descriptions.Item>
                      <Descriptions.Item label="Impact">
                        <Text type="success">{func.impact}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Default Schedule">
                        {func.default_trigger?.type === 'interval' 
                          ? `Every ${func.default_trigger.minutes} minutes`
                          : `Cron: ${func.default_trigger?.hour || 0}:${String(func.default_trigger?.minute || 0).padStart(2, '0')} ${func.default_trigger?.day_of_week || 'daily'}`
                        }
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                ))}
              </Panel>
            );
          })}
        </Collapse>
      </Card>

      {/* Create/Edit Job Modal */}
      <Modal
        title={editingJob ? 'Edit Scheduled Job' : 'Create Scheduled Job'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="job_id"
                label="Job ID"
                rules={[
                  { required: true, message: 'Please enter a job ID' },
                  { pattern: /^[a-z0-9_]+$/, message: 'Only lowercase letters, numbers, and underscores' }
                ]}
              >
                <Input placeholder="e.g., daily_report_8am" disabled={!!editingJob} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Job Name"
                rules={[{ required: true, message: 'Please enter a job name' }]}
              >
                <Input placeholder="e.g., Daily Intelligence Report at 8 AM" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="function_id"
            label="Function to Execute"
            rules={[{ required: true, message: 'Please select a function' }]}
          >
            <Select
              placeholder="Select the function to run"
              showSearch
              optionFilterProp="children"
            >
              {Object.entries(functionsByCategory).map(([category, funcs]) => {
                const catConfig = getCategoryConfig(category);
                return (
                  <Select.OptGroup key={category} label={
                    <Space>
                      {catConfig.icon}
                      <span>{catConfig.label}</span>
                    </Space>
                  }>
                    {funcs.map(func => (
                      <Option key={func.id} value={func.id}>
                        <Space>
                          <span>{func.name}</span>
                          <Text type="secondary" style={{ fontSize: 11 }}>({func.id})</Text>
                        </Space>
                      </Option>
                    ))}
                  </Select.OptGroup>
                );
              })}
            </Select>
          </Form.Item>

          <Form.Item
            name="trigger_type"
            label="Schedule Type"
            rules={[{ required: true }]}
          >
            <Radio.Group>
              <Radio.Button value="cron">
                <ClockCircleOutlined /> Specific Time
              </Radio.Button>
              <Radio.Button value="interval">
                <ReloadOutlined /> Interval
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {triggerType === 'cron' && (
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="cron_hour"
                  label="Hour (0-23)"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={0} max={23} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="cron_minute"
                  label="Minute (0-59)"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={0} max={59} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="cron_day_of_week"
                  label="Day of Week"
                  rules={[{ required: true }]}
                >
                  <Select>
                    {DAYS_OF_WEEK.map(day => (
                      <Option key={day.value} value={day.value}>{day.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          {triggerType === 'interval' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="interval_hours"
                  label="Hours"
                >
                  <InputNumber min={0} max={24} style={{ width: '100%' }} placeholder="0" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="interval_minutes"
                  label="Minutes"
                >
                  <InputNumber min={0} max={59} style={{ width: '100%' }} placeholder="30" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item
            name="enabled"
            label="Enabled"
            valuePropName="checked"
          >
            <Switch checkedChildren="Active" unCheckedChildren="Paused" />
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingJob ? 'Update Job' : 'Create Job'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Job Details Drawer/Modal */}
      <Modal
        title={
          <Space>
            <ScheduleOutlined />
            <span>Job Details</span>
          </Space>
        }
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsVisible(false)}>Close</Button>,
          <Button key="run" type="primary" icon={<PlayCircleOutlined />} onClick={() => {
            handleRunNow(selectedJob);
            setDetailsVisible(false);
          }}>
            Run Now
          </Button>
        ]}
        width={600}
      >
        {selectedJob && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Job ID">
              <Text code>{selectedJob.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Name">{selectedJob.name}</Descriptions.Item>
            <Descriptions.Item label="Category">
              <Tag color={getCategoryConfig(selectedJob.category).color}>
                {getCategoryConfig(selectedJob.category).label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge
                status={selectedJob.paused ? 'warning' : 'success'}
                text={selectedJob.paused ? 'Paused' : 'Active'}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Schedule">
              <Text code>{selectedJob.trigger}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Next Run">
              {selectedJob.next_run ? formatDateTime(selectedJob.next_run) : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Description">{selectedJob.description}</Descriptions.Item>
            <Descriptions.Item label="Details">{selectedJob.details}</Descriptions.Item>
            <Descriptions.Item label="Impact">
              <Text type="success">{selectedJob.impact}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="System Job">
              {selectedJob.is_system ? (
                <Tag color="blue"><CheckCircleOutlined /> Yes</Tag>
              ) : (
                <Tag><ExclamationCircleOutlined /> No (Custom)</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

export default SchedulerManager;
