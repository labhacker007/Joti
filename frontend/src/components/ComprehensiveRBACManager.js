import React, { useState, useEffect } from 'react';
import {
  Card, Table, Switch, Spin, message, Typography, Space, Tabs, Button, Tag, Tooltip, Alert,
  Collapse, Input, Select, Checkbox, Row, Col, Statistic, Progress, Popconfirm, Divider
} from 'antd';
import {
  SafetyOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined,
  FilterOutlined, ReloadOutlined, SaveOutlined, InfoCircleOutlined,
  DashboardOutlined, ReadOutlined, FileTextOutlined, BugOutlined,
  ThunderboltOutlined, BarChartOutlined, ApiOutlined, SyncOutlined,
  EyeOutlined, RobotOutlined, AuditOutlined, SettingOutlined, StopOutlined
} from '@ant-design/icons';
import { rbacAPI } from '../api/client';
import './ComprehensiveRBACManager.css';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Search } = Input;

/**
 * Comprehensive RBAC Manager
 * Shows ALL permissions for ALL functions organized by page/area
 */
const ComprehensiveRBACManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [functionalAreas, setFunctionalAreas] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArea, setFilterArea] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole);
    }
  }, [selectedRole]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [permsRes, rolesRes, areasRes] = await Promise.all([
        rbacAPI.getAllPermissions(),
        rbacAPI.getRoles(),
        rbacAPI.getFunctionalAreas()
      ]);

      setPermissions(permsRes.data?.permissions || []);
      setRoles(rolesRes.data?.roles || []);
      setFunctionalAreas(areasRes.data?.areas || []);
    } catch (err) {
      console.error('Failed to fetch RBAC data', err);
      message.error('Failed to load RBAC configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async (role) => {
    try {
      const response = await rbacAPI.getRolePermissions(role);
      setRolePermissions(prev => ({
        ...prev,
        [role]: response.data?.permissions || []
      }));
    } catch (err) {
      console.error('Failed to fetch role permissions', err);
    }
  };

  const handlePermissionToggle = async (role, permission, currentlyGranted) => {
    setSaving(true);
    try {
      let newPermissions = [...(rolePermissions[role] || [])];
      
      if (currentlyGranted) {
        newPermissions = newPermissions.filter(p => p !== permission);
      } else {
        newPermissions.push(permission);
      }

      await rbacAPI.updateRolePermissions(role, newPermissions);
      
      setRolePermissions(prev => ({
        ...prev,
        [role]: newPermissions
      }));

      message.success(`Permission ${currentlyGranted ? 'revoked' : 'granted'}`);
    } catch (err) {
      console.error('Failed to update permission', err);
      message.error('Failed to update permission');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkToggle = async (role, areaKey, grant) => {
    setSaving(true);
    try {
      const area = functionalAreas.find(a => a.key === areaKey);
      if (!area) return;

      let newPermissions = [...(rolePermissions[role] || [])];
      
      if (grant) {
        // Add all permissions from this area
        area.permissions.forEach(perm => {
          if (!newPermissions.includes(perm)) {
            newPermissions.push(perm);
          }
        });
      } else {
        // Remove all permissions from this area
        newPermissions = newPermissions.filter(p => !area.permissions.includes(p));
      }

      await rbacAPI.updateRolePermissions(role, newPermissions);
      
      setRolePermissions(prev => ({
        ...prev,
        [role]: newPermissions
      }));

      message.success(`${grant ? 'Granted' : 'Revoked'} all ${area.name} permissions`);
    } catch (err) {
      console.error('Failed to bulk update', err);
      message.error('Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  // Grant ALL permissions across ALL areas
  const handleGrantAllPermissions = async () => {
    setSaving(true);
    try {
      // Collect all permissions from all areas
      const allPermissions = [];
      functionalAreas.forEach(area => {
        area.permissions.forEach(perm => {
          if (!allPermissions.includes(perm)) {
            allPermissions.push(perm);
          }
        });
      });

      await rbacAPI.updateRolePermissions(selectedRole, allPermissions);
      
      setRolePermissions(prev => ({
        ...prev,
        [selectedRole]: allPermissions
      }));

      message.success(`Granted ALL ${allPermissions.length} permissions to ${selectedRole}`);
    } catch (err) {
      console.error('Failed to grant all permissions', err);
      message.error('Failed to grant all permissions');
    } finally {
      setSaving(false);
    }
  };

  // Revoke ALL permissions
  const handleRevokeAllPermissions = async () => {
    setSaving(true);
    try {
      await rbacAPI.updateRolePermissions(selectedRole, []);
      
      setRolePermissions(prev => ({
        ...prev,
        [selectedRole]: []
      }));

      message.success(`Revoked ALL permissions from ${selectedRole}`);
    } catch (err) {
      console.error('Failed to revoke all permissions', err);
      message.error('Failed to revoke all permissions');
    } finally {
      setSaving(false);
    }
  };

  const getAreaIcon = (areaKey) => {
    const icons = {
      dashboard: <DashboardOutlined />,
      feed: <ReadOutlined />,
      articles: <FileTextOutlined />,
      intelligence: <BugOutlined />,
      hunts: <ThunderboltOutlined />,
      reports: <BarChartOutlined />,
      connectors: <ApiOutlined />,
      sources: <SyncOutlined />,
      watchlist: <EyeOutlined />,
      chatbot: <RobotOutlined />,
      audit: <AuditOutlined />,
      admin: <SettingOutlined />
    };
    return icons[areaKey] || <InfoCircleOutlined />;
  };

  const getPermissionStats = (role) => {
    const granted = rolePermissions[role]?.length || 0;
    const total = permissions.length;
    return {
      granted,
      total,
      percentage: total > 0 ? Math.round((granted / total) * 100) : 0
    };
  };

  const renderAreaPermissions = (area) => {
    const rolePerms = rolePermissions[selectedRole] || [];
    const grantedCount = area.permissions.filter(p => rolePerms.includes(p)).length;
    const totalCount = area.permissions.length;
    const allGranted = grantedCount === totalCount;
    const noneGranted = grantedCount === 0;

    // Filter permissions by search
    let filteredPermissions = area.permissions;
    if (searchQuery) {
      filteredPermissions = area.permissions.filter(perm =>
        perm.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filteredPermissions.length === 0) return null;

    return (
      <Card
        key={area.key}
        size="small"
        title={
          <Space>
            {getAreaIcon(area.key)}
            <span>{area.name}</span>
            <Tag color={allGranted ? 'green' : noneGranted ? 'default' : 'blue'}>
              {grantedCount}/{totalCount}
            </Tag>
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Grant all">
              <Button
                size="small"
                type="text"
                icon={<CheckCircleOutlined />}
                onClick={() => handleBulkToggle(selectedRole, area.key, true)}
                disabled={saving || allGranted}
              />
            </Tooltip>
            <Tooltip title="Revoke all">
              <Button
                size="small"
                type="text"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleBulkToggle(selectedRole, area.key, false)}
                disabled={saving || noneGranted}
              />
            </Tooltip>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {area.description}
          </Text>
        </div>
        <Progress
          percent={(grantedCount / totalCount) * 100}
          size="small"
          status={allGranted ? 'success' : 'active'}
          showInfo={false}
          style={{ marginBottom: 12 }}
        />
        <Row gutter={[8, 8]}>
          {filteredPermissions.map(perm => {
            const isGranted = rolePerms.includes(perm);
            const permName = perm.split(':').pop().replace(/_/g, ' ');

            return (
              <Col key={perm} span={12}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '4px 8px',
                  borderRadius: 4,
                  background: isGranted ? '#f6ffed' : '#fff1f0',
                  border: `1px solid ${isGranted ? '#b7eb8f' : '#ffa39e'}`
                }}>
                  <Checkbox
                    checked={isGranted}
                    disabled={saving}
                    onChange={() => handlePermissionToggle(selectedRole, perm, isGranted)}
                  >
                    <Tooltip title={`${perm} - ${isGranted ? 'GRANTED' : 'BLOCKED'}`}>
                      <Text style={{ fontSize: 12, color: isGranted ? '#52c41a' : '#ff4d4f' }}>
                        {permName.charAt(0).toUpperCase() + permName.slice(1)}
                      </Text>
                    </Tooltip>
                  </Checkbox>
                  <Tag 
                    color={isGranted ? 'success' : 'error'} 
                    style={{ marginLeft: 'auto', fontSize: 10 }}
                  >
                    {isGranted ? 'GRANTED' : 'BLOCKED'}
                  </Tag>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip="Loading comprehensive RBAC configuration..." />
      </div>
    );
  }

  const stats = getPermissionStats(selectedRole);
  const filteredAreas = filterArea === 'all' 
    ? functionalAreas 
    : functionalAreas.filter(a => a.key === filterArea);

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>
            <SafetyOutlined /> Comprehensive Permission Manager
          </Title>
          <Paragraph type="secondary">
            Manage all {permissions.length} permissions across {functionalAreas.length} functional areas.
            Control exactly what each role can view, edit, delete, and execute.
          </Paragraph>
        </div>

        <Alert
          message="Default Deny: Unchecked = Blocked"
          description={
            <span>
              <strong>Permissions use "default deny"</strong> - if a permission is not checked (granted), it is automatically <strong style={{ color: '#ff4d4f' }}>BLOCKED</strong>. 
              You only need to check the permissions you want to GRANT. No need to explicitly block anything.
            </span>
          }
          type="warning"
          showIcon
        />

        {/* Role Selector & Stats */}
        <Card>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Select Role:
                </Text>
                <Select
                  value={selectedRole}
                  onChange={setSelectedRole}
                  style={{ width: '100%' }}
                  size="large"
                >
                  {roles.map(role => (
                    <Select.Option key={role.key} value={role.key}>
                      <SafetyOutlined /> {role.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col span={16}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Granted"
                    value={stats.granted}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Blocked"
                    value={stats.total - stats.granted}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Total"
                    value={stats.total}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Access %"
                    value={stats.percentage}
                    suffix="%"
                    valueStyle={{ color: stats.percentage > 50 ? '#3f8600' : '#cf1322' }}
                  />
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {/* Bulk Actions */}
        <Card size="small">
          <Row justify="space-between" align="middle">
            <Col>
              <Space wrap>
                <Search
                  placeholder="Search permissions..."
                  allowClear
                  style={{ width: 300 }}
                  onSearch={setSearchQuery}
                  onChange={(e) => {
                    if (!e.target.value) setSearchQuery('');
                  }}
                />
                <Select
                  value={filterArea}
                  onChange={setFilterArea}
                  style={{ width: 200 }}
                  placeholder="Filter by area"
                >
                  <Select.Option value="all">All Areas</Select.Option>
                  {functionalAreas.map(area => (
                    <Select.Option key={area.key} value={area.key}>
                      {getAreaIcon(area.key)} {area.name}
                    </Select.Option>
                  ))}
                </Select>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>
                  Refresh
                </Button>
              </Space>
            </Col>
            <Col>
              <Space>
                <Popconfirm
                  title="Grant All Permissions"
                  description={`Grant ALL ${permissions.length} permissions to ${selectedRole}?`}
                  onConfirm={handleGrantAllPermissions}
                  okText="Yes, Grant All"
                  cancelText="Cancel"
                >
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    loading={saving}
                  >
                    Grant All
                  </Button>
                </Popconfirm>
                
                <Popconfirm
                  title="Revoke All Permissions"
                  description={`Remove ALL permissions from ${selectedRole}? This cannot be undone.`}
                  onConfirm={handleRevokeAllPermissions}
                  okText="Yes, Revoke All"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    icon={<StopOutlined />}
                    loading={saving}
                  >
                    Revoke All
                  </Button>
                </Popconfirm>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Permission Areas */}
        <div>
          {filteredAreas.map(area => renderAreaPermissions(area))}
        </div>
      </Space>
    </div>
  );
};

export default ComprehensiveRBACManager;
