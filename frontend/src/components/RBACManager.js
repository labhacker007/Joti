import React, { useState, useEffect } from 'react';
import {
  Card, Table, Switch, Spin, message, Typography, Space, Tabs,
  Button, Modal, Select, Input, Form, Tag, Tooltip, Alert, Checkbox
} from 'antd';
import {
  LockOutlined, UserOutlined, SafetyOutlined, EditOutlined,
  DeleteOutlined, PlusOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { rbacAPI, usersAPI } from '../api/client';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const RBACManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matrix, setMatrix] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOverrides, setUserOverrides] = useState([]);
  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matrixRes, usersRes] = await Promise.all([
        rbacAPI.getMatrix(),
        usersAPI.list()
      ]);
      
      setMatrix(matrixRes.data);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Failed to fetch RBAC data', err);
      message.error('Failed to load RBAC data');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = async (role, permission, currentValue) => {
    if (!matrix) return;
    
    setSaving(true);
    try {
      // Get current permissions for this role
      const roleData = matrix.matrix[role];
      const currentPermissions = Object.keys(roleData.permissions).filter(
        perm => roleData.permissions[perm]
      );
      
      // Toggle this permission
      let newPermissions;
      if (currentValue) {
        // Remove permission
        newPermissions = currentPermissions.filter(p => p !== permission);
      } else {
        // Add permission
        newPermissions = [...currentPermissions, permission];
      }
      
      // Update in backend
      await rbacAPI.updateRolePermissions(role, newPermissions);
      
      // Update local state
      setMatrix(prev => ({
        ...prev,
        matrix: {
          ...prev.matrix,
          [role]: {
            ...prev.matrix[role],
            permissions: {
              ...prev.matrix[role].permissions,
              [permission]: !currentValue
            }
          }
        }
      }));
      
      message.success(`Permission ${!currentValue ? 'granted' : 'revoked'} for ${role}`);
    } catch (err) {
      console.error('Failed to update permission', err);
      message.error('Failed to update permission');
    } finally {
      setSaving(false);
    }
  };

  const fetchUserOverrides = async (userId) => {
    try {
      const response = await rbacAPI.getUserPermissions(userId);
      setUserOverrides(response.data.overrides || []);
      setSelectedUser(response.data);
    } catch (err) {
      console.error('Failed to fetch user overrides', err);
      message.error('Failed to load user permission overrides');
    }
  };

  const handleAddOverride = () => {
    form.resetFields();
    setOverrideModalVisible(true);
  };

  const handleSaveOverride = async (values) => {
    if (!selectedUser) return;
    
    try {
      await rbacAPI.setUserPermission(
        selectedUser.user_id,
        values.permission,
        values.granted,
        values.reason
      );
      
      message.success('Permission override set successfully');
      setOverrideModalVisible(false);
      form.resetFields();
      fetchUserOverrides(selectedUser.user_id);
    } catch (err) {
      console.error('Failed to set override', err);
      message.error('Failed to set permission override');
    }
  };

  const handleRemoveOverride = async (permission) => {
    if (!selectedUser) return;
    
    Modal.confirm({
      title: 'Remove Permission Override',
      content: `Are you sure you want to remove the override for "${permission}"?`,
      onOk: async () => {
        try {
          await rbacAPI.removeUserPermission(selectedUser.user_id, permission);
          message.success('Permission override removed');
          fetchUserOverrides(selectedUser.user_id);
        } catch (err) {
          console.error('Failed to remove override', err);
          message.error('Failed to remove permission override');
        }
      }
    });
  };

  // Permission Matrix Table
  const renderPermissionMatrix = () => {
    if (!matrix) return null;

    // Group permissions by category
    const permissionsByCategory = {};
    matrix.permissions.forEach(perm => {
      const category = perm.category || 'Other';
      if (!permissionsByCategory[category]) {
        permissionsByCategory[category] = [];
      }
      permissionsByCategory[category].push(perm);
    });

    const columns = [
      {
        title: 'Permission',
        dataIndex: 'name',
        key: 'name',
        width: 300,
        render: (text, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          </Space>
        )
      },
      ...matrix.roles.map(role => ({
        title: (
          <Space direction="vertical" size={0} style={{ textAlign: 'center' }}>
            <SafetyOutlined />
            <Text strong>{role.name}</Text>
          </Space>
        ),
        key: role.key,
        align: 'center',
        width: 120,
        render: (_, permission) => {
          const hasPermission = matrix.matrix[role.key]?.permissions[permission.key] || false;
          return (
            <Switch
              checked={hasPermission}
              loading={saving}
              onChange={() => handlePermissionToggle(role.key, permission.key, hasPermission)}
              checkedChildren="✓"
              unCheckedChildren="✗"
            />
          );
        }
      }))
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="Permission Matrix"
          description="Control which permissions each role has access to. Changes are saved immediately."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
        
        {Object.keys(permissionsByCategory).map(category => (
          <Card key={category} title={category} size="small">
            <Table
              dataSource={permissionsByCategory[category]}
              columns={columns}
              rowKey="key"
              pagination={false}
              size="small"
              bordered
            />
          </Card>
        ))}
      </Space>
    );
  };

  // User Overrides Table
  const renderUserOverrides = () => {
    const columns = [
      {
        title: 'Permission',
        dataIndex: 'permission',
        key: 'permission',
        render: (text) => <Tag>{text}</Tag>
      },
      {
        title: 'Status',
        dataIndex: 'granted',
        key: 'granted',
        render: (granted) => (
          <Tag color={granted ? 'green' : 'red'}>
            {granted ? 'Granted' : 'Denied'}
          </Tag>
        )
      },
      {
        title: 'Reason',
        dataIndex: 'reason',
        key: 'reason',
        render: (text) => text || <Text type="secondary">—</Text>
      },
      {
        title: 'Created',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (date) => date ? new Date(date).toLocaleDateString() : '—'
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveOverride(record.permission)}
            size="small"
          >
            Remove
          </Button>
        )
      }
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="User Permission Overrides"
          description="Grant or deny specific permissions to individual users, overriding their role defaults."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />

        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Select User:</Text>
                <Select
                  showSearch
                  placeholder="Choose a user"
                  style={{ width: 300, marginLeft: 16 }}
                  onChange={fetchUserOverrides}
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {users.map(user => (
                    <Option key={user.id} value={user.id}>
                      {user.username} ({user.role})
                    </Option>
                  ))}
                </Select>
              </div>
              
              {selectedUser && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddOverride}
                >
                  Add Override
                </Button>
              )}
            </div>

            {selectedUser && (
              <div>
                <Space size="large">
                  <div>
                    <Text type="secondary">User:</Text>
                    <Text strong style={{ marginLeft: 8 }}>
                      {selectedUser.username}
                    </Text>
                  </div>
                  <div>
                    <Text type="secondary">Role:</Text>
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {selectedUser.role}
                    </Tag>
                  </div>
                  <div>
                    <Text type="secondary">Effective Permissions:</Text>
                    <Tag color="green" style={{ marginLeft: 8 }}>
                      {selectedUser.effective_permissions?.length || 0}
                    </Tag>
                  </div>
                </Space>
              </div>
            )}

            {selectedUser && (
              <Table
                dataSource={userOverrides}
                columns={columns}
                rowKey="id"
                pagination={false}
                locale={{
                  emptyText: 'No permission overrides for this user'
                }}
              />
            )}
          </Space>
        </Card>
      </Space>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip="Loading RBAC configuration..." />
      </div>
    );
  }

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>
            <LockOutlined /> Access Control (RBAC)
          </Title>
          <Paragraph type="secondary">
            Manage role-based permissions and user-specific permission overrides
          </Paragraph>
        </div>

        <Tabs defaultActiveKey="matrix">
          <TabPane tab={<span><SafetyOutlined /> Permission Matrix</span>} key="matrix">
            {renderPermissionMatrix()}
          </TabPane>
          <TabPane tab={<span><UserOutlined /> User Overrides</span>} key="users">
            {renderUserOverrides()}
          </TabPane>
        </Tabs>
        
        <div style={{ marginTop: 32 }}>
          <Alert
            message="Page Access Control Available"
            description="Use the 'Page Access' tab in the Admin portal to control which pages and tabs each role can access."
            type="info"
            showIcon
          />
        </div>
      </Space>

      {/* Add Override Modal */}
      <Modal
        title="Add Permission Override"
        visible={overrideModalVisible}
        onCancel={() => {
          setOverrideModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveOverride}
        >
          <Form.Item
            name="permission"
            label="Permission"
            rules={[{ required: true, message: 'Please select a permission' }]}
          >
            <Select
              showSearch
              placeholder="Select permission"
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {matrix?.permissions.map(perm => (
                <Option key={perm.key} value={perm.key}>
                  {perm.name} - {perm.description}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="granted"
            label="Action"
            rules={[{ required: true }]}
            initialValue={true}
          >
            <Select>
              <Option value={true}>
                <Tag color="green">Grant</Tag> Grant this permission
              </Option>
              <Option value={false}>
                <Tag color="red">Deny</Tag> Deny this permission
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason (Optional)"
          >
            <TextArea
              rows={3}
              placeholder="Enter a reason for this override..."
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Save Override
              </Button>
              <Button onClick={() => {
                setOverrideModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RBACManager;
