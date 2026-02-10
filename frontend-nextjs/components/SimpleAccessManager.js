import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Select, Switch, Tag, Tooltip,
  message, Divider, Row, Col, Input, Typography, Alert, Badge,
  Tabs, Avatar, Popconfirm, Descriptions, Checkbox
} from 'antd';
import {
  UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, 
  SafetyOutlined, CheckCircleOutlined, CloseCircleOutlined,
  SearchOutlined, TeamOutlined, EyeOutlined, LockOutlined, 
  CrownOutlined, FileTextOutlined, RobotOutlined, SettingOutlined,
  ApiOutlined, AuditOutlined, PlusCircleOutlined, MinusCircleOutlined,
  SaveOutlined, ToolOutlined
} from '@ant-design/icons';
import { usersAPI, rbacAPI } from '../api/client';
import { useAuthStore } from '../store';

const { Title, Text } = Typography;
const { Option } = Select;

// Available roles with descriptions and default permissions
// Permissions follow backend format: action:resource
const ROLES = [
  { 
    value: 'ADMIN', 
    label: 'Administrator', 
    description: 'Full system access - all permissions granted', 
    color: 'red', 
    icon: <CrownOutlined />,
    permissions: 'ALL' // Special case - all permissions
  },
  { 
    value: 'TI', 
    label: 'Threat Intel Analyst', 
    description: 'Article triage, IOC extraction, view hunts', 
    color: 'blue', 
    icon: <EyeOutlined />,
    permissions: [
      'read:dashboard', 'read:articles', 'triage:articles', 'analyze:articles',
      'read:intelligence', 'extract:intelligence', 'read:hunts', 'create:hunts',
      'read:reports', 'create:reports', 'share:reports',
      'read:sources', 'manage:sources', 'read:watchlist', 'manage:watchlist'
    ]
  },
  { 
    value: 'TH', 
    label: 'Threat Hunter', 
    description: 'Hunt creation and execution', 
    color: 'purple', 
    icon: <SearchOutlined />,
    permissions: [
      'read:dashboard', 'read:articles', 'read:intelligence',
      'read:hunts', 'create:hunts', 'execute:hunts', 'manage:hunts',
      'read:sources'
    ]
  },
  { 
    value: 'IR', 
    label: 'Incident Response', 
    description: 'High priority investigations', 
    color: 'orange', 
    icon: <SafetyOutlined />,
    permissions: [
      'read:dashboard', 'read:articles', 'triage:articles',
      'read:intelligence', 'read:hunts', 'execute:hunts',
      'read:reports', 'share:reports'
    ]
  },
  { 
    value: 'MANAGER', 
    label: 'Manager', 
    description: 'Reports and team oversight', 
    color: 'cyan', 
    icon: <TeamOutlined />,
    permissions: [
      'read:dashboard', 'read:articles', 'read:reports', 'create:reports',
      'read:audit', 'read:analytics'
    ]
  },
  { 
    value: 'EXECUTIVE', 
    label: 'Executive', 
    description: 'Dashboards and reports only', 
    color: 'gold', 
    icon: <CrownOutlined />,
    permissions: ['read:dashboard', 'read:reports']
  },
  { 
    value: 'VIEWER', 
    label: 'Viewer', 
    description: 'Read-only access to news feeds', 
    color: 'default', 
    icon: <EyeOutlined />,
    permissions: ['read:articles']
  },
];

// All available permissions organized by function area
// Keys match backend format: action:resource (e.g., read:articles, triage:articles)
const PERMISSION_AREAS = [
  {
    area: 'Articles & News',
    icon: <FileTextOutlined />,
    permissions: [
      { key: 'read:articles', label: 'View', description: 'View articles and news feeds' },
      { key: 'triage:articles', label: 'Triage', description: 'Change article status, mark priority' },
      { key: 'analyze:articles', label: 'Analyze', description: 'Add summaries, extract intelligence' },
      { key: 'delete:articles', label: 'Delete', description: 'Delete articles' },
    ]
  },
  {
    area: 'Threat Hunts',
    icon: <SearchOutlined />,
    permissions: [
      { key: 'read:hunts', label: 'View', description: 'View hunt queries and results' },
      { key: 'create:hunts', label: 'Create', description: 'Create new hunt queries' },
      { key: 'execute:hunts', label: 'Execute', description: 'Run hunts against connectors' },
      { key: 'manage:hunts', label: 'Manage', description: 'Edit/delete hunt queries' },
    ]
  },
  {
    area: 'Reports',
    icon: <FileTextOutlined />,
    permissions: [
      { key: 'read:reports', label: 'View', description: 'View intelligence reports' },
      { key: 'create:reports', label: 'Create', description: 'Create and edit reports' },
      { key: 'share:reports', label: 'Share/Export', description: 'Share and export reports' },
      { key: 'delete:reports', label: 'Delete', description: 'Delete reports' },
    ]
  },
  {
    area: 'Intelligence',
    icon: <SafetyOutlined />,
    permissions: [
      { key: 'read:intelligence', label: 'View', description: 'View extracted IOCs/TTPs' },
      { key: 'extract:intelligence', label: 'Extract', description: 'Extract IOCs and TTPs with AI' },
    ]
  },
  {
    area: 'Sources & Connectors',
    icon: <ApiOutlined />,
    permissions: [
      { key: 'read:sources', label: 'View Sources', description: 'View feed sources' },
      { key: 'manage:sources', label: 'Manage Sources', description: 'Add/edit/delete sources' },
      { key: 'read:connectors', label: 'View Connectors', description: 'View connector configs' },
      { key: 'manage:connectors', label: 'Manage Connectors', description: 'Configure connectors' },
    ]
  },
  {
    area: 'Watchlist',
    icon: <EyeOutlined />,
    permissions: [
      { key: 'read:watchlist', label: 'View', description: 'View watchlist items' },
      { key: 'manage:watchlist', label: 'Manage', description: 'Add/edit/delete watchlist items' },
    ]
  },
  {
    area: 'Administration',
    icon: <SettingOutlined />,
    permissions: [
      { key: 'manage:users', label: 'Manage Users', description: 'Create/edit/delete users' },
      { key: 'manage:rbac', label: 'Manage RBAC', description: 'Configure roles and permissions' },
      { key: 'manage:genai', label: 'GenAI Config', description: 'Configure GenAI settings' },
      { key: 'manage:guardrails', label: 'Guardrails', description: 'Manage AI guardrails' },
    ]
  },
  {
    area: 'Monitoring',
    icon: <AuditOutlined />,
    permissions: [
      { key: 'read:dashboard', label: 'Dashboard', description: 'View main dashboard' },
      { key: 'read:analytics', label: 'Analytics', description: 'View analytics and metrics' },
      { key: 'read:audit', label: 'Audit Logs', description: 'View system audit logs' },
    ]
  },
];

const SimpleAccessManager = () => {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [roleInfoVisible, setRoleInfoVisible] = useState(false);
  const [selectedRoleForInfo, setSelectedRoleForInfo] = useState(null);
  
  // User overrides state
  const [grantedOverrides, setGrantedOverrides] = useState([]);
  const [deniedOverrides, setDeniedOverrides] = useState([]);
  
  // Role editing state
  const [roleEditModalVisible, setRoleEditModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [savingRolePermissions, setSavingRolePermissions] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('users');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersAPI.listUsers();
      setUsers(response.data || []);
    } catch (err) {
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  // Fetch role permissions from backend
  const fetchRolePermissions = async (role) => {
    try {
      const response = await rbacAPI.getRolePermissions(role);
      return response.data?.permissions || [];
    } catch (err) {
      console.error('Failed to fetch role permissions:', err);
      // Fall back to frontend defaults
      const roleInfo = ROLES.find(r => r.value === role);
      if (roleInfo?.permissions === 'ALL') {
        return PERMISSION_AREAS.flatMap(area => area.permissions.map(p => p.key));
      }
      return roleInfo?.permissions || [];
    }
  };
  
  // Open role edit modal
  const openRoleEditModal = async (role) => {
    setEditingRole(role);
    const perms = await fetchRolePermissions(role);
    setRolePermissions(perms);
    setRoleEditModalVisible(true);
  };
  
  // Save role permissions
  const handleSaveRolePermissions = async () => {
    if (!editingRole) return;
    
    setSavingRolePermissions(true);
    try {
      await rbacAPI.updateRolePermissions(editingRole, rolePermissions);
      message.success(`Permissions updated for ${editingRole} role`);
      setRoleEditModalVisible(false);
      // Refresh users to reflect any permission changes
      fetchUsers();
    } catch (err) {
      console.error('Failed to save role permissions:', err);
      message.error(err.response?.data?.detail || 'Failed to save role permissions');
    } finally {
      setSavingRolePermissions(false);
    }
  };
  
  // Toggle permission for a role
  const toggleRolePermission = (permKey) => {
    if (rolePermissions.includes(permKey)) {
      setRolePermissions(rolePermissions.filter(p => p !== permKey));
    } else {
      setRolePermissions([...rolePermissions, permKey]);
    }
  };

  const getRoleInfo = (roleValue) => ROLES.find(r => r.value === roleValue) || ROLES[ROLES.length - 1];
  
  const getRolePermissions = (roleValue) => {
    const role = getRoleInfo(roleValue);
    if (role.permissions === 'ALL') {
      // Return all permissions for admin
      return PERMISSION_AREAS.flatMap(area => area.permissions.map(p => p.key));
    }
    return role.permissions || [];
  };

  const openEditModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      form.setFieldsValue({
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        additional_roles: user.additional_roles || [],
        is_active: user.is_active,
      });
      setGrantedOverrides(user.custom_permissions?.grant || []);
      setDeniedOverrides(user.custom_permissions?.deny || []);
    } else {
      form.resetFields();
      form.setFieldsValue({
        role: 'VIEWER',
        additional_roles: [],
        is_active: true,
      });
      setGrantedOverrides([]);
      setDeniedOverrides([]);
    }
    setEditModalVisible(true);
  };

  const handleSave = async (values) => {
    try {
      const userData = {
        email: values.email,
        username: values.username,
        full_name: values.full_name,
        role: values.role,
        additional_roles: values.additional_roles || [],
        custom_permissions: {
          grant: grantedOverrides,
          deny: deniedOverrides,
        },
        is_active: values.is_active,
      };

      if (editingUser) {
        await usersAPI.updateUser(editingUser.id, userData);
        message.success('User updated');
      } else {
        userData.password = values.password;
        await usersAPI.createUser(userData);
        message.success('User created');
      }
      setEditModalVisible(false);
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to save user');
    }
  };

  const handleDelete = async (userId) => {
    try {
      await usersAPI.deleteUser(userId);
      message.success('User deleted');
      fetchUsers();
    } catch (err) {
      message.error('Failed to delete user');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await usersAPI.updateUser(user.id, { is_active: !user.is_active });
      message.success(user.is_active ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch (err) {
      message.error('Failed to update user status');
    }
  };

  const handleQuickRoleChange = async (user, newRole) => {
    try {
      await usersAPI.updateUser(user.id, { role: newRole });
      message.success(`Role changed to ${newRole}`);
      fetchUsers();
    } catch (err) {
      message.error('Failed to update role');
    }
  };
  
  // Toggle permission override
  const toggleOverride = (permKey, type) => {
    if (type === 'grant') {
      if (grantedOverrides.includes(permKey)) {
        setGrantedOverrides(grantedOverrides.filter(k => k !== permKey));
      } else {
        // Remove from deny if granting
        setDeniedOverrides(deniedOverrides.filter(k => k !== permKey));
        setGrantedOverrides([...grantedOverrides, permKey]);
      }
    } else {
      if (deniedOverrides.includes(permKey)) {
        setDeniedOverrides(deniedOverrides.filter(k => k !== permKey));
      } else {
        // Remove from grant if denying
        setGrantedOverrides(grantedOverrides.filter(k => k !== permKey));
        setDeniedOverrides([...deniedOverrides, permKey]);
      }
    }
  };
  
  // Check if permission is granted by role
  const isPermissionInRole = (permKey, role, additionalRoles = []) => {
    const allRoles = [role, ...(additionalRoles || [])];
    for (const r of allRoles) {
      const perms = getRolePermissions(r);
      if (perms.includes(permKey)) return true;
    }
    return false;
  };

  const filteredUsers = users.filter(u => 
    !searchText || 
    u.username?.toLowerCase().includes(searchText.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchText.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: getRoleInfo(record.role).color === 'default' ? '#888' : `var(--${getRoleInfo(record.role).color})` }} />
          <Space direction="vertical" size={0}>
            <Text strong>{record.full_name || record.username}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Role',
      key: 'role',
      width: 180,
      render: (_, record) => {
        const primaryRole = getRoleInfo(record.role);
        return (
          <Space direction="vertical" size={2}>
            <Tooltip title={primaryRole.description}>
              <Tag color={primaryRole.color} icon={primaryRole.icon} style={{ cursor: 'pointer' }}
                onClick={() => { setSelectedRoleForInfo(record.role); setRoleInfoVisible(true); }}>
                {primaryRole.label}
              </Tag>
            </Tooltip>
            {(record.additional_roles || []).length > 0 && (
              <Space size={2} wrap>
                {record.additional_roles.map(r => {
                  const role = getRoleInfo(r);
                  return <Tag key={r} color={role.color} style={{ fontSize: 10, opacity: 0.8 }}>+{role.value}</Tag>;
                })}
              </Space>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Exceptions',
      key: 'custom',
      width: 120,
      render: (_, record) => {
        const grants = record.custom_permissions?.grant?.length || 0;
        const denies = record.custom_permissions?.deny?.length || 0;
        if (grants === 0 && denies === 0) return <Text type="secondary">None</Text>;
        return (
          <Space size={4}>
            {grants > 0 && (
              <Tooltip title={`${grants} extra permission(s) granted`}>
                <Tag color="success" icon={<PlusCircleOutlined />}>{grants}</Tag>
              </Tooltip>
            )}
            {denies > 0 && (
              <Tooltip title={`${denies} permission(s) blocked`}>
                <Tag color="error" icon={<MinusCircleOutlined />}>{denies}</Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active, record) => (
        <Switch
          checked={active}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
          onChange={() => handleToggleActive(record)}
          disabled={record.id === currentUser?.id}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit permissions">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              Edit
            </Button>
          </Tooltip>
          <Select
            size="small"
            value={record.role}
            onChange={(val) => handleQuickRoleChange(record, val)}
            style={{ width: 90 }}
            disabled={record.id === currentUser?.id}
          >
            {ROLES.map(r => (
              <Option key={r.value} value={r.value}>
                <Tag color={r.color} style={{ margin: 0 }}>{r.value}</Tag>
              </Option>
            ))}
          </Select>
          {record.id !== currentUser?.id && (
            <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];
  
  // Get current role from form for permission display
  const currentFormRole = Form.useWatch('role', form);
  const currentAdditionalRoles = Form.useWatch('additional_roles', form);

  return (
    <div className="simple-access-manager">
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>Access Management</span>
          </Space>
        }
      >
        <Tabs 
          activeKey={activeMainTab} 
          onChange={setActiveMainTab}
          items={[
            {
              key: 'users',
              label: (
                <Space>
                  <UserOutlined />
                  Users
                  <Badge count={users.length} style={{ backgroundColor: 'var(--primary)' }} />
                </Space>
              ),
              children: (
                <>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Alert
                      message="Role-Based Access Control"
                      description={
                        <span>
                          <strong>Role</strong> defines default permissions. <strong>Exceptions</strong> allow per-user grants/blocks.
                          Click any role tag to view or edit its permissions.
                        </span>
                      }
                      type="info"
                      showIcon
                      style={{ flex: 1, marginRight: 16 }}
                    />
                    <Space>
                      <Input
                        placeholder="Search users..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 200 }}
                        allowClear
                      />
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditModal(null)}>
                        Add User
                      </Button>
                    </Space>
                  </div>

                  <Table
                    dataSource={filteredUsers}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    size="middle"
                  />
                </>
              ),
            },
            {
              key: 'roles',
              label: (
                <Space>
                  <ToolOutlined />
                  Role Permissions
                </Space>
              ),
              children: (
                <>
                  <Alert
                    message="Role Permission Management"
                    description="Define default permissions for each role. Users inherit these permissions, which can be overridden with per-user exceptions."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  
                  <Row gutter={[16, 16]}>
                    {ROLES.map(role => (
                      <Col span={8} key={role.value}>
                        <Card
                          size="small"
                          title={
                            <Space>
                              {role.icon}
                              <Tag color={role.color}>{role.label}</Tag>
                            </Space>
                          }
                          extra={
                            role.value !== 'ADMIN' && (
                              <Button 
                                size="small" 
                                icon={<EditOutlined />}
                                onClick={() => openRoleEditModal(role.value)}
                              >
                                Edit
                              </Button>
                            )
                          }
                        >
                          <Text type="secondary" style={{ fontSize: 12 }}>{role.description}</Text>
                          <Divider style={{ margin: '8px 0' }} />
                          {role.permissions === 'ALL' ? (
                            <Tag color="success">All Permissions</Tag>
                          ) : (
                            <div>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {(role.permissions || []).length} permissions
                              </Text>
                              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                {(role.permissions || []).slice(0, 6).map(p => (
                                  <Tag key={p} size="small" style={{ fontSize: 10 }}>
                                    {p.split(':')[0]}
                                  </Tag>
                                ))}
                                {(role.permissions || []).length > 6 && (
                                  <Tag size="small" style={{ fontSize: 10 }}>+{role.permissions.length - 6} more</Tag>
                                )}
                              </div>
                            </div>
                          )}
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Role Info Modal */}
      <Modal
        title={
          <Space>
            {selectedRoleForInfo && getRoleInfo(selectedRoleForInfo).icon}
            <span>{selectedRoleForInfo && getRoleInfo(selectedRoleForInfo).label} - Default Permissions</span>
          </Space>
        }
        open={roleInfoVisible}
        onCancel={() => setRoleInfoVisible(false)}
        footer={
          <Space>
            {selectedRoleForInfo && selectedRoleForInfo !== 'ADMIN' && (
              <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={() => {
                  setRoleInfoVisible(false);
                  openRoleEditModal(selectedRoleForInfo);
                }}
              >
                Edit Role Permissions
              </Button>
            )}
            <Button onClick={() => setRoleInfoVisible(false)}>Close</Button>
          </Space>
        }
        width={600}
      >
        {selectedRoleForInfo && (
          <div>
            <Alert 
              message={getRoleInfo(selectedRoleForInfo).description} 
              type="info" 
              style={{ marginBottom: 16 }} 
            />
            
            {getRoleInfo(selectedRoleForInfo).permissions === 'ALL' ? (
              <Alert message="Administrator has ALL permissions" type="success" />
            ) : (
              <div>
                {PERMISSION_AREAS.map(area => {
                  const areaPerms = area.permissions.filter(p => 
                    getRolePermissions(selectedRoleForInfo).includes(p.key)
                  );
                  if (areaPerms.length === 0) return null;
                  
                  return (
                    <div key={area.area} style={{ marginBottom: 16 }}>
                      <Text strong>{area.icon} {area.area}</Text>
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {areaPerms.map(p => (
                          <Tooltip key={p.key} title={p.description}>
                            <Tag color="green" icon={<CheckCircleOutlined />}>{p.label}</Tag>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
      
      {/* Edit Role Permissions Modal */}
      <Modal
        title={
          <Space>
            <ToolOutlined />
            <span>Edit {editingRole && getRoleInfo(editingRole).label} Role Permissions</span>
          </Space>
        }
        open={roleEditModalVisible}
        onCancel={() => setRoleEditModalVisible(false)}
        width={900}
        footer={
          <Space>
            <Button onClick={() => setRoleEditModalVisible(false)}>Cancel</Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              loading={savingRolePermissions}
              onClick={handleSaveRolePermissions}
            >
              Save Role Permissions
            </Button>
          </Space>
        }
      >
        {editingRole && (
          <div>
            <Alert
              message={`Editing permissions for ${getRoleInfo(editingRole).label} role`}
              description="Changes will apply to all users with this role. Per-user exceptions (grants/blocks) will still override role defaults."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            {editingRole === 'ADMIN' ? (
              <Alert message="Administrator role cannot be edited - it has all permissions" type="info" />
            ) : (
              <Row gutter={[16, 16]}>
                {PERMISSION_AREAS.map(area => (
                  <Col span={12} key={area.area}>
                    <Card size="small" title={<Space>{area.icon} {area.area}</Space>}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {area.permissions.map(perm => {
                          const isChecked = rolePermissions.includes(perm.key);
                          return (
                            <div 
                              key={perm.key}
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '4px 8px',
                                background: isChecked ? 'rgba(82, 196, 26, 0.1)' : 'transparent',
                                borderRadius: 4
                              }}
                            >
                              <Space direction="vertical" size={0}>
                                <Text>{perm.label}</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>{perm.description}</Text>
                              </Space>
                              <Checkbox
                                checked={isChecked}
                                onChange={() => toggleRolePermission(perm.key)}
                              />
                            </div>
                          );
                        })}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={editingUser ? `Edit User: ${editingUser.username}` : 'Create New User'}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        width={800}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Tabs defaultActiveKey="basic" items={[
            {
              key: 'basic',
              label: 'Basic Info',
              children: (
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                        <Input prefix={<UserOutlined />} disabled={!!editingUser} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="full_name" label="Full Name">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      {!editingUser && (
                        <Form.Item name="password" label="Password" rules={[{ required: !editingUser }]}>
                          <Input.Password prefix={<LockOutlined />} />
                        </Form.Item>
                      )}
                    </Col>
                  </Row>

                  <Divider>Role Assignment</Divider>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item 
                        name="role" 
                        label="Primary Role" 
                        rules={[{ required: true }]}
                      >
                        <Select>
                          {ROLES.map(r => (
                            <Option key={r.value} value={r.value}>
                              <Space>
                                <Tag color={r.color} icon={r.icon}>{r.label}</Tag>
                                <Text type="secondary" style={{ fontSize: 11 }}>{r.description}</Text>
                              </Space>
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item 
                        name="additional_roles" 
                        label="Additional Roles (Optional)"
                      >
                        <Select mode="multiple" placeholder="Add more roles if needed">
                          {ROLES.filter(r => r.value !== 'ADMIN').map(r => (
                            <Option key={r.value} value={r.value}>
                              <Tag color={r.color}>{r.label}</Tag>
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="is_active" label="Account Status" valuePropName="checked">
                    <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'permissions',
              label: (
                <Space>
                  Permissions
                  {(grantedOverrides.length > 0 || deniedOverrides.length > 0) && (
                    <Badge count={grantedOverrides.length + deniedOverrides.length} size="small" />
                  )}
                </Space>
              ),
              children: (
                <>
                  <Alert
                    message="Permission Overview"
                    description={
                      <span>
                        Showing permissions for <Tag color={getRoleInfo(currentFormRole || 'VIEWER').color}>
                          {getRoleInfo(currentFormRole || 'VIEWER').label}
                        </Tag> role.
                        Click <Tag color="success" size="small">Grant</Tag> to add extra permissions or 
                        <Tag color="error" size="small">Block</Tag> to restrict permissions.
                      </span>
                    }
                    type="info"
                    style={{ marginBottom: 16 }}
                  />

                  {PERMISSION_AREAS.map(area => (
                    <Card 
                      key={area.area} 
                      size="small" 
                      title={<Space>{area.icon} {area.area}</Space>}
                      style={{ marginBottom: 12 }}
                    >
                      <Row gutter={[16, 8]}>
                        {area.permissions.map(perm => {
                          const hasFromRole = isPermissionInRole(perm.key, currentFormRole, currentAdditionalRoles);
                          const isGranted = grantedOverrides.includes(perm.key);
                          const isDenied = deniedOverrides.includes(perm.key);
                          
                          // Compute effective permission
                          let effectiveStatus = 'denied';
                          if (hasFromRole && !isDenied) effectiveStatus = 'granted';
                          if (isGranted) effectiveStatus = 'granted';
                          if (isDenied) effectiveStatus = 'denied';
                          
                          return (
                            <Col span={12} key={perm.key}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: effectiveStatus === 'granted' ? 'rgba(82, 196, 26, 0.1)' : 'rgba(0,0,0,0.02)',
                                borderRadius: 6,
                                border: `1px solid ${effectiveStatus === 'granted' ? 'rgba(82, 196, 26, 0.3)' : 'transparent'}`
                              }}>
                                <Space direction="vertical" size={0}>
                                  <Space>
                                    {effectiveStatus === 'granted' ? 
                                      <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                                      <CloseCircleOutlined style={{ color: '#999' }} />
                                    }
                                    <Text strong={effectiveStatus === 'granted'}>{perm.label}</Text>
                                    {hasFromRole && !isGranted && !isDenied && (
                                      <Tag size="small" color="blue">From Role</Tag>
                                    )}
                                    {isGranted && <Tag size="small" color="success">+Granted</Tag>}
                                    {isDenied && <Tag size="small" color="error">-Blocked</Tag>}
                                  </Space>
                                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 22 }}>
                                    {perm.description}
                                  </Text>
                                </Space>
                                
                                <Space size={4}>
                                  {!hasFromRole && (
                                    <Tooltip title="Grant this permission">
                                      <Button 
                                        size="small" 
                                        type={isGranted ? 'primary' : 'default'}
                                        style={{ background: isGranted ? '#52c41a' : undefined, borderColor: isGranted ? '#52c41a' : undefined }}
                                        icon={<PlusCircleOutlined />}
                                        onClick={() => toggleOverride(perm.key, 'grant')}
                                      />
                                    </Tooltip>
                                  )}
                                  {(hasFromRole || isGranted) && (
                                    <Tooltip title="Block this permission">
                                      <Button 
                                        size="small" 
                                        danger={isDenied}
                                        type={isDenied ? 'primary' : 'default'}
                                        icon={<MinusCircleOutlined />}
                                        onClick={() => toggleOverride(perm.key, 'deny')}
                                      />
                                    </Tooltip>
                                  )}
                                </Space>
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    </Card>
                  ))}
                </>
              ),
            },
          ]} />

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                {editingUser ? 'Save Changes' : 'Create User'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SimpleAccessManager;
