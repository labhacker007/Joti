import React, { useState, useEffect } from 'react';
import {
  Card, Table, Switch, Spin, message, Typography, Space, Tabs,
  Button, Tag, Tooltip, Alert, Collapse, Checkbox, Popconfirm, Divider
} from 'antd';
import {
  LockOutlined, AppstoreOutlined, SafetyOutlined,
  InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ThunderboltOutlined, StopOutlined
} from '@ant-design/icons';
import { rbacAPI } from '../api/client';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const PageAccessManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolePageAccess, setRolePageAccess] = useState({});
  const [selectedRole, setSelectedRole] = useState('ADMIN');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePageAccess(selectedRole);
    }
  }, [selectedRole]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pagesRes, rolesRes] = await Promise.all([
        rbacAPI.getPageDefinitions(),
        rbacAPI.getRoles()
      ]);
      
      setPages(pagesRes.data?.pages || []);
      setRoles(rolesRes.data?.roles || []);
    } catch (err) {
      console.error('Failed to fetch page definitions', err);
      message.error('Failed to load page definitions');
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePageAccess = async (role) => {
    try {
      const response = await rbacAPI.getRolePageAccess(role);
      const pages = response.data?.pages || [];
      
      // Build access map
      const accessMap = {};
      pages.forEach(page => {
        accessMap[page.page_key] = {
          has_access: page.has_access,
          granted_permissions: page.granted_permissions || [],
          all_permissions: page.all_permissions || []
        };
      });
      
      setRolePageAccess(prev => ({
        ...prev,
        [role]: accessMap
      }));
    } catch (err) {
      console.error('Failed to fetch role page access', err);
      message.error(`Failed to load access for ${role}`);
    }
  };

  const handlePagePermissionToggle = async (pageKey, permission, currentlyGranted) => {
    setSaving(true);
    try {
      const pageAccess = rolePageAccess[selectedRole]?.[pageKey] || {};
      let newPermissions = [...(pageAccess.granted_permissions || [])];
      
      if (currentlyGranted) {
        // Remove permission
        newPermissions = newPermissions.filter(p => p !== permission);
      } else {
        // Add permission
        newPermissions.push(permission);
      }
      
      // Update in backend
      await rbacAPI.updatePageAccess(pageKey, selectedRole, newPermissions);
      
      // Update local state
      setRolePageAccess(prev => ({
        ...prev,
        [selectedRole]: {
          ...prev[selectedRole],
          [pageKey]: {
            ...prev[selectedRole][pageKey],
            granted_permissions: newPermissions,
            has_access: newPermissions.length > 0
          }
        }
      }));
      
      message.success(`Permission ${currentlyGranted ? 'revoked' : 'granted'}`);
    } catch (err) {
      console.error('Failed to update page permission', err);
      message.error('Failed to update permission');
    } finally {
      setSaving(false);
    }
  };

  const handlePageAccessToggle = async (pageKey, currentlyHasAccess) => {
    setSaving(true);
    try {
      const pageAccess = rolePageAccess[selectedRole]?.[pageKey] || {};
      let newPermissions = [];
      
      if (!currentlyHasAccess) {
        // Grant all permissions for this page
        const page = pages.find(p => p.page_key === pageKey);
        newPermissions = page?.permissions || [];
      }
      // If removing access, newPermissions stays empty
      
      await rbacAPI.updatePageAccess(pageKey, selectedRole, newPermissions);
      
      // Update local state
      setRolePageAccess(prev => ({
        ...prev,
        [selectedRole]: {
          ...prev[selectedRole],
          [pageKey]: {
            ...prev[selectedRole][pageKey],
            granted_permissions: newPermissions,
            has_access: newPermissions.length > 0
          }
        }
      }));
      
      message.success(`Page access ${currentlyHasAccess ? 'revoked' : 'granted'}`);
    } catch (err) {
      console.error('Failed to toggle page access', err);
      message.error('Failed to update page access');
    } finally {
      setSaving(false);
    }
  };

  // Grant full access to all pages for the selected role
  const handleGrantFullAccess = async () => {
    setSaving(true);
    try {
      // For each page, grant all its permissions
      for (const page of pages) {
        await rbacAPI.updatePageAccess(page.page_key, selectedRole, page.permissions || []);
      }
      
      // Refresh the role's page access
      await fetchRolePageAccess(selectedRole);
      
      message.success(`Full access granted to ${selectedRole}`);
    } catch (err) {
      console.error('Failed to grant full access', err);
      message.error('Failed to grant full access');
    } finally {
      setSaving(false);
    }
  };

  // Revoke all access for the selected role
  const handleRevokeAllAccess = async () => {
    setSaving(true);
    try {
      // For each page, remove all permissions
      for (const page of pages) {
        await rbacAPI.updatePageAccess(page.page_key, selectedRole, []);
      }
      
      // Refresh the role's page access
      await fetchRolePageAccess(selectedRole);
      
      message.success(`All access revoked for ${selectedRole}`);
    } catch (err) {
      console.error('Failed to revoke access', err);
      message.error('Failed to revoke access');
    } finally {
      setSaving(false);
    }
  };

  // Group pages by category
  const pagesByCategory = pages.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = [];
    }
    acc[page.category].push(page);
    return acc;
  }, {});

  const renderPageCard = (page) => {
    const access = rolePageAccess[selectedRole]?.[page.page_key] || {
      has_access: false,
      granted_permissions: [],
      all_permissions: page.permissions
    };

    return (
      <Card
        key={page.page_key}
        size="small"
        title={
          <Space>
            <AppstoreOutlined />
            <span>{page.page_name}</span>
            <Tag color={access.has_access ? 'green' : 'default'}>
              {access.has_access ? 'Accessible' : 'Blocked'}
            </Tag>
          </Space>
        }
        extra={
          <Tooltip title={access.has_access ? 'Revoke all access' : 'Grant full access'}>
            <Switch
              checked={access.has_access}
              loading={saving}
              onChange={() => handlePageAccessToggle(page.page_key, access.has_access)}
              checkedChildren={<CheckCircleOutlined />}
              unCheckedChildren={<CloseCircleOutlined />}
            />
          </Tooltip>
        }
        style={{ marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {page.description}
            </Text>
          </div>
          <div>
            <Text strong style={{ fontSize: 12 }}>Path:</Text>
            <Text code style={{ fontSize: 12, marginLeft: 8 }}>{page.page_path}</Text>
          </div>
          
          {page.permissions && page.permissions.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                Permissions:
              </Text>
              <Space wrap size="small">
                {page.permissions.map(perm => {
                  const isGranted = access.granted_permissions.includes(perm);
                  const permName = perm.split(':').pop().replace(/_/g, ' ').toUpperCase();
                  
                  return (
                    <Tooltip key={perm} title={perm}>
                      <Checkbox
                        checked={isGranted}
                        disabled={saving || !access.has_access}
                        onChange={() => handlePagePermissionToggle(page.page_key, perm, isGranted)}
                      >
                        <Text style={{ fontSize: 11 }}>{permName}</Text>
                      </Checkbox>
                    </Tooltip>
                  );
                })}
              </Space>
            </div>
          )}
        </Space>
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip="Loading page access configuration..." />
      </div>
    );
  }

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>
            <AppstoreOutlined /> Page & Tab Access Control
          </Title>
          <Paragraph type="secondary">
            Control which pages and tabs each role can access. Toggle switches to grant/revoke entire page access,
            or use checkboxes for granular permission control.
          </Paragraph>
        </div>

        <Alert
          message="Page-Level RBAC"
          description="This controls which pages appear in the navigation menu and which features are accessible within each page. Revoking page access will hide it completely from users with that role."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />

        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>Select Role:</Text>
              <Space style={{ marginLeft: 16 }} wrap>
                {roles.map(role => (
                  <Button
                    key={role.key}
                    type={selectedRole === role.key ? 'primary' : 'default'}
                    icon={<SafetyOutlined />}
                    onClick={() => setSelectedRole(role.key)}
                  >
                    {role.name}
                  </Button>
                ))}
              </Space>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div>
              <Text strong>Bulk Actions for {selectedRole}:</Text>
              <Space style={{ marginLeft: 16 }}>
                <Popconfirm
                  title="Grant Full Access"
                  description={`Grant access to ALL pages and ALL permissions for ${selectedRole}?`}
                  onConfirm={handleGrantFullAccess}
                  okText="Yes, Grant All"
                  cancelText="Cancel"
                >
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    loading={saving}
                  >
                    Grant Full Access
                  </Button>
                </Popconfirm>
                
                <Popconfirm
                  title="Revoke All Access"
                  description={`Remove access to ALL pages for ${selectedRole}? This cannot be undone.`}
                  onConfirm={handleRevokeAllAccess}
                  okText="Yes, Revoke All"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    icon={<StopOutlined />}
                    loading={saving}
                  >
                    Revoke All Access
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          </Space>
        </Card>

        {Object.keys(pagesByCategory).map(category => (
          <Card key={category} title={`${category} Pages`} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {pagesByCategory[category].map(page => renderPageCard(page))}
            </Space>
          </Card>
        ))}
      </Space>
    </div>
  );
};

export default PageAccessManager;
