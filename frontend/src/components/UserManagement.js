import React, { useEffect, useState } from 'react';
import { 
  Table, Button, Modal, Form, Input, Select, Space, message, 
  Popconfirm, Tag, Tooltip, Typography
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined,
  LockOutlined,
  MailOutlined
} from '@ant-design/icons';
import client from '../api/client';

const { Option } = Select;
const { Text } = Typography;

const ROLES = [
  { value: 'ADMIN', label: 'Admin', color: 'red', description: 'Full system access - manage sources, users, global watchlist' },
  { value: 'VIEWER', label: 'Viewer', color: 'blue', description: 'Standard user - view feeds, manage personal watchlist' },
];

export default function UserManagement({ onUserChange }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
  }, []);

  const notifyChange = () => {
    if (onUserChange) {
      onUserChange();
    }
  };

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await client.get('/users/');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to load users', error);
      message.error('Unable to load users');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ role: 'VIEWER', is_active: true });
    setModalVisible(true);
  }

  function openEdit(record) {
    setEditing(record);
    form.setFieldsValue({
      email: record.email,
      username: record.username,
      full_name: record.full_name,
      role: record.role,
      is_active: record.is_active,
    });
    setModalVisible(true);
  }

  async function onSubmit(values) {
    try {
      if (editing) {
        // Update user
        await client.patch(`/users/${editing.id}`, {
          full_name: values.full_name,
          role: values.role,
          is_active: values.is_active,
        });
        message.success('User updated successfully');
      } else {
        // Create new user - first check if already exists
        const existingCheck = await client.get('/users/').catch(() => ({ data: [] }));
        const existingUser = existingCheck.data.find(u => 
          u.email === values.email || u.username === values.username
        );
        
        if (existingUser) {
          message.error(`User with this ${existingUser.email === values.email ? 'email' : 'username'} already exists`);
          return;
        }
        
        await client.post('/auth/register', {
          email: values.email,
          username: values.username,
          password: values.password,
          full_name: values.full_name || '',
        });
        
        // If role is not VIEWER, update it
        if (values.role && values.role !== 'VIEWER') {
          // Small delay to ensure user is created
          await new Promise(resolve => setTimeout(resolve, 300));
          const usersResponse = await client.get('/users/');
          const newUser = usersResponse.data.find(u => u.email === values.email);
          if (newUser) {
            await client.patch(`/users/${newUser.id}`, { role: values.role });
          }
        }
        
        message.success('User created successfully');
      }
      setModalVisible(false);
      form.resetFields(); // Ensure form is reset
      loadUsers();
      notifyChange();
    } catch (error) {
      const errorDetail = error?.response?.data?.detail;
      if (errorDetail && errorDetail.includes('already')) {
        message.error('A user with this email or username already exists. Please use different credentials.');
      } else {
        message.error(errorDetail || 'Operation failed. Please check your input and try again.');
      }
    }
  }

  async function onDelete(id) {
    try {
      await client.delete(`/users/${id}`);
      message.success('User deleted successfully');
      loadUsers();
      notifyChange();
    } catch (error) {
      message.error('Failed to delete user');
    }
  }

  function getRoleInfo(roleName) {
    return ROLES.find(r => r.value === roleName) || ROLES[1];
  }

  const columns = [
    { 
      title: 'Email', 
      dataIndex: 'email', 
      key: 'email',
      render: (email) => (
        <Space>
          <MailOutlined />
          {email}
        </Space>
      ),
    },
    { 
      title: 'Username', 
      dataIndex: 'username', 
      key: 'username',
      render: (username) => (
        <Space>
          <UserOutlined />
          {username}
        </Space>
      ),
    },
    { 
      title: 'Full Name', 
      dataIndex: 'full_name', 
      key: 'full_name',
      render: (name) => name || <span style={{ color: '#999' }}>Not set</span>,
    },
    { 
      title: 'Role', 
      dataIndex: 'role', 
      key: 'role',
      render: (role) => {
        const roleInfo = getRoleInfo(role);
        return (
          <Tooltip title={roleInfo.description}>
            <Tag color={roleInfo.color}>{roleInfo.label}</Tag>
          </Tooltip>
        );
      },
    },
    { 
      title: 'Status', 
      dataIndex: 'is_active', 
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    { 
      title: 'Last Login', 
      dataIndex: 'last_login', 
      key: 'last_login',
      render: (date) => date ? new Date(date).toLocaleString() : 'Never',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit User">
            <Button 
              icon={<EditOutlined />} 
              size="small" 
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this user?"
            description="This action cannot be undone."
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Tooltip title="Delete User">
              <Button 
                icon={<DeleteOutlined />} 
                size="small" 
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>User Management</h3>
          <p style={{ color: '#666', margin: 0 }}>
            Manage user accounts and permissions
          </p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={openCreate}
        >
          Create User
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={users}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={
          <Space>
            <UserOutlined />
            {editing ? 'Edit User' : 'Create New User'}
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={550}
        okText={editing ? 'Update' : 'Create'}
      >
        <Form 
          form={form} 
          onFinish={onSubmit} 
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          {!editing && (
            <>
              <Form.Item
                name="email"
                label={<span style={{ fontWeight: 500 }}>Email</span>}
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input 
                  prefix={<MailOutlined style={{ color: '#999' }} />}
                  placeholder="user@example.com"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="username"
                label={<span style={{ fontWeight: 500 }}>Username</span>}
                rules={[
                  { required: true, message: 'Username is required' },
                  { min: 3, message: 'Username must be at least 3 characters' },
                ]}
              >
                <Input 
                  prefix={<UserOutlined style={{ color: '#999' }} />}
                  placeholder="username"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ fontWeight: 500 }}>Password</span>}
                rules={[
                  { required: true, message: 'Password is required' },
                  { min: 6, message: 'Password must be at least 6 characters' },
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined style={{ color: '#999' }} />}
                  placeholder="Enter password"
                  size="large"
                />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="full_name"
            label={<span style={{ fontWeight: 500 }}>Full Name</span>}
          >
            <Input 
              placeholder="John Doe"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="role"
            label={<span style={{ fontWeight: 500 }}>Role</span>}
            rules={[{ required: true, message: 'Role is required' }]}
            tooltip="Select user's access level and permissions"
          >
            <Select 
              placeholder="Select role"
              size="large"
            >
              {ROLES.map(role => (
                <Option key={role.value} value={role.value}>
                  <Space>
                    <Tag color={role.color}>{role.label}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>{role.description}</Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {editing && (
            <Form.Item
              name="is_active"
              label={<span style={{ fontWeight: 500 }}>Account Status</span>}
            >
              <Select size="large">
                <Option value={true}>
                  <Space>
                    <Tag color="success">Active</Tag>
                    <Text type="secondary">User can login</Text>
                  </Space>
                </Option>
                <Option value={false}>
                  <Space>
                    <Tag>Inactive</Tag>
                    <Text type="secondary">User cannot login</Text>
                  </Space>
                </Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
