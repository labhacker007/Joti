import React, { useState, useEffect } from 'react';
import {
  Card, Tabs, Table, Button, Space, Modal, Form, Input, Select, Switch,
  message, Tag, Tooltip, Popconfirm, Divider, Row, Col, Statistic,
  Descriptions, Badge, Checkbox, Tree, Collapse, Alert, Empty, Avatar,
  Typography, Steps, Progress
} from 'antd';
import {
  UserOutlined, SafetyOutlined, LockOutlined, TeamOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined,
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
  AppstoreOutlined, AuditOutlined, SettingOutlined, SearchOutlined,
  ReloadOutlined, InfoCircleOutlined, ThunderboltOutlined, FilterOutlined
} from '@ant-design/icons';
import { usersAPI, rbacAPI } from '../api/client';
import UserManagement from './UserManagement';
import ComprehensiveRBACManager from './ComprehensiveRBACManager';
import RBACManager from './RBACManager';
import PageAccessManager from './PageAccessManager';
import './UnifiedUserManagement.css';

const { TabPane } = Tabs;
const { Option } = Select;
const { Panel } = Collapse;
const { Text, Title, Paragraph } = Typography;
const { Step } = Steps;

/**
 * Unified User Management - All user, role, and permission management in one place
 * Enhanced with intuitive navigation and modern design
 */
const UnifiedUserManagement = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({
    total_users: 0,
    active_users: 0,
    roles: 4,
    permissions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [usersRes] = await Promise.all([
        usersAPI.listUsers(),
      ]);
      
      const users = usersRes.data || [];
      const activeUsers = users.filter(u => u.is_active).length;
      
      // Count permissions from the RBAC system
      let permissionCount = 50; // default
      try {
        const rbacRes = await rbacAPI.getPermissions();
        if (rbacRes.data && Array.isArray(rbacRes.data)) {
          permissionCount = rbacRes.data.length;
        }
      } catch (e) {
        console.log('RBAC API not available');
      }
      
      setStats({
        total_users: users.length,
        active_users: activeUsers,
        roles: 4,
        permissions: permissionCount
      });
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'users',
      label: (
        <span className="tab-label">
          <TeamOutlined />
          <span>Users</span>
          <Badge count={stats.total_users} style={{ backgroundColor: 'var(--info)' }} />
        </span>
      ),
      children: (
        <div className="tab-content">
          <div className="tab-intro">
            <Title level={5}>User Management</Title>
            <Paragraph type="secondary">
              Create, edit, and manage user accounts. Assign roles to control what each user can access.
            </Paragraph>
          </div>
          <UserManagement onUserChange={fetchStats} />
        </div>
      ),
    },
    {
      key: 'rbac-comprehensive',
      label: (
        <span className="tab-label">
          <SafetyOutlined />
          <span>Role Permissions</span>
        </span>
      ),
      children: (
        <div className="tab-content">
          <div className="tab-intro">
            <Title level={5}>Role-Based Access Control</Title>
            <Paragraph type="secondary">
              Define which actions each role can perform. Changes apply immediately to all users with that role.
            </Paragraph>
          </div>
          <div className="rbac-quick-tips">
            <Alert
              message={
                <Space>
                  <ThunderboltOutlined />
                  <span>Quick Tips</span>
                </Space>
              }
              description={
                <Row gutter={16}>
                  <Col span={8}>
                    <Text strong>ADMIN</Text>
                    <br />
                    <Text type="secondary">Full access to all features</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>TI (Threat Intel)</Text>
                    <br />
                    <Text type="secondary">Analyze threats, create reports</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>TH (Threat Hunter)</Text>
                    <br />
                    <Text type="secondary">Run hunts, use connectors</Text>
                  </Col>
                </Row>
              }
              type="info"
              showIcon={false}
              className="quick-tips-alert"
            />
          </div>
          <ComprehensiveRBACManager />
        </div>
      ),
    },
    {
      key: 'page-access',
      label: (
        <span className="tab-label">
          <AppstoreOutlined />
          <span>Page Access</span>
        </span>
      ),
      children: (
        <div className="tab-content">
          <div className="tab-intro">
            <Title level={5}>Page-Level Access Control</Title>
            <Paragraph type="secondary">
              Control which roles can see and access specific pages in the application.
            </Paragraph>
          </div>
          <PageAccessManager />
        </div>
      ),
    },
    {
      key: 'rbac',
      label: (
        <span className="tab-label">
          <LockOutlined />
          <span>User Overrides</span>
        </span>
      ),
      children: (
        <div className="tab-content">
          <div className="tab-intro">
            <Title level={5}>User-Specific Permission Overrides</Title>
            <Paragraph type="secondary">
              Grant or revoke specific permissions for individual users, overriding their role defaults.
            </Paragraph>
          </div>
          <Alert
            message="Use Sparingly"
            description="User overrides should be exceptions. Prefer using role-based permissions for consistency."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <RBACManager />
        </div>
      ),
    },
    {
      key: 'reference',
      label: (
        <span className="tab-label">
          <AuditOutlined />
          <span>Reference Guide</span>
        </span>
      ),
      children: (
        <div className="tab-content">
          <div className="tab-intro">
            <Title level={5}>Role & Permission Reference</Title>
            <Paragraph type="secondary">
              Quick reference for understanding roles and their typical permissions.
            </Paragraph>
          </div>
          <RoleReferenceGuide />
        </div>
      ),
    },
  ];

  return (
    <div className="unified-user-management">
      {/* Stats Overview - Single Card with inline stats */}
      <Card size="small" className="stats-overview-card" style={{ marginBottom: 16 }}>
        <div className="stats-inline-row">
          <div 
            className={`stat-inline-item stat-users ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <TeamOutlined className="stat-inline-icon" />
            <span className="stat-inline-value">{stats.total_users}</span>
            <span className="stat-inline-label">Total Users</span>
          </div>
          <div className="stat-divider" />
          <div 
            className={`stat-inline-item stat-active ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <CheckCircleOutlined className="stat-inline-icon" />
            <span className="stat-inline-value">{stats.active_users}</span>
            <span className="stat-inline-label">Active</span>
          </div>
          <div className="stat-divider" />
          <div 
            className={`stat-inline-item stat-roles ${activeTab === 'rbac-comprehensive' ? 'active' : ''}`}
            onClick={() => setActiveTab('rbac-comprehensive')}
          >
            <SafetyOutlined className="stat-inline-icon" />
            <span className="stat-inline-value">{stats.roles}</span>
            <span className="stat-inline-label">Roles</span>
          </div>
          <div className="stat-divider" />
          <div 
            className={`stat-inline-item stat-permissions ${activeTab === 'rbac-comprehensive' ? 'active' : ''}`}
            onClick={() => setActiveTab('rbac-comprehensive')}
          >
            <LockOutlined className="stat-inline-icon" />
            <span className="stat-inline-value">{stats.permissions}</span>
            <span className="stat-inline-label">Permissions</span>
          </div>
        </div>
      </Card>

      {/* Main Tabs */}
      <Card className="management-card">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
          className="management-tabs"
          tabBarExtraContent={
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchStats}
              loading={loading}
              size="small"
            >
              Refresh
            </Button>
          }
        />
      </Card>
    </div>
  );
};

/**
 * Role Reference Guide - Quick overview of roles and their typical permissions
 */
const RoleReferenceGuide = () => {
  const roles = [
    {
      key: 'admin',
      name: 'ADMIN',
      title: 'Administrator',
      color: '#f5222d',
      icon: <SettingOutlined />,
      description: 'Full system access. Can manage users, configure integrations, and access all features.',
      users: 'System administrators, security operations managers',
      permissions: [
        { text: 'Manage users and roles', granted: true },
        { text: 'Configure all integrations', granted: true },
        { text: 'Access all pages and features', granted: true },
        { text: 'Manage GenAI and knowledge base', granted: true },
        { text: 'View audit logs', granted: true },
        { text: 'Configure automation', granted: true },
      ],
    },
    {
      key: 'ti',
      name: 'TI',
      title: 'Threat Intelligence',
      color: '#1890ff',
      icon: <EyeOutlined />,
      description: 'Threat intelligence analysts who review, analyze, and generate reports on threats.',
      users: 'Threat intel analysts, security researchers',
      permissions: [
        { text: 'View and manage articles', granted: true },
        { text: 'Extract IOCs and TTPs', granted: true },
        { text: 'Generate and publish reports', granted: true },
        { text: 'Manage intelligence data', granted: true },
        { text: 'Configure sources', granted: true },
        { text: 'Manage users', granted: false },
      ],
    },
    {
      key: 'th',
      name: 'TH',
      title: 'Threat Hunter',
      color: '#52c41a',
      icon: <ThunderboltOutlined />,
      description: 'Threat hunters who create and execute hunt queries, analyze results, and respond to threats.',
      users: 'Threat hunters, SOC analysts',
      permissions: [
        { text: 'View articles and intelligence', granted: true },
        { text: 'Create and run hunt queries', granted: true },
        { text: 'Manage hunt executions', granted: true },
        { text: 'Access connectors', granted: true },
        { text: 'View IOCs and TTPs', granted: true },
        { text: 'Generate reports', granted: false },
      ],
    },
    {
      key: 'analyst',
      name: 'ANALYST',
      title: 'Security Analyst',
      color: '#722ed1',
      icon: <UserOutlined />,
      description: 'General security analysts with read access to intelligence and limited operational capabilities.',
      users: 'Junior analysts, security engineers',
      permissions: [
        { text: 'View articles and reports', granted: true },
        { text: 'View IOCs and TTPs', granted: true },
        { text: 'Use chatbot/AI assistant', granted: true },
        { text: 'View dashboards', granted: true },
        { text: 'Create or execute hunts', granted: false },
        { text: 'Generate reports', granted: false },
      ],
    },
  ];

  return (
    <div className="role-reference">
      <Row gutter={[16, 16]}>
        {roles.map(role => (
          <Col xs={24} sm={12} key={role.key}>
            <Card className="role-card" size="small">
              <div className="role-header">
                <Avatar 
                  style={{ backgroundColor: role.color }} 
                  icon={role.icon}
                  size="large"
                />
                <div className="role-info">
                  <div className="role-name">
                    <Tag color={role.color}>{role.name}</Tag>
                    <Text strong>{role.title}</Text>
                  </div>
                  <Text type="secondary" className="role-desc">{role.description}</Text>
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="role-permissions">
                {role.permissions.map((perm, idx) => (
                  <div key={idx} className={`perm-item ${perm.granted ? 'granted' : 'denied'}`}>
                    {perm.granted ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    )}
                    <span>{perm.text}</span>
                  </div>
                ))}
              </div>
              <div className="role-users">
                <Text type="secondary" style={{ fontSize: 11 }}>
                  <UserOutlined style={{ marginRight: 4 }} />
                  {role.users}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Divider />

      <Card title="Permission Categories" size="small" className="categories-card">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div className="category-box">
              <div className="category-title">
                <EyeOutlined style={{ color: 'var(--info)' }} />
                Articles & Intel
              </div>
              <ul className="category-list">
                <li>View Articles</li>
                <li>Create Articles</li>
                <li>Edit Articles</li>
                <li>Delete Articles</li>
                <li>Extract IOCs/TTPs</li>
              </ul>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="category-box">
              <div className="category-title">
                <ThunderboltOutlined style={{ color: '#52c41a' }} />
                Hunts & Detection
              </div>
              <ul className="category-list">
                <li>View Hunts</li>
                <li>Create Hunts</li>
                <li>Execute Hunts</li>
                <li>Delete Hunts</li>
                <li>Manage Connectors</li>
              </ul>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="category-box">
              <div className="category-title">
                <AuditOutlined style={{ color: '#722ed1' }} />
                Reports
              </div>
              <ul className="category-list">
                <li>View Reports</li>
                <li>Create Reports</li>
                <li>Edit Reports</li>
                <li>Publish Reports</li>
                <li>Share Reports</li>
              </ul>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="category-box">
              <div className="category-title">
                <SettingOutlined style={{ color: '#f5222d' }} />
                Administration
              </div>
              <ul className="category-list">
                <li>Manage Users</li>
                <li>Configure Sources</li>
                <li>Manage GenAI</li>
                <li>View Audit Logs</li>
                <li>System Config</li>
              </ul>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default UnifiedUserManagement;
