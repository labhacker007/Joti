'use client';

import React, { useEffect, useState } from 'react';
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Save,
  RefreshCw,
  Users,
  Lock,
  Key,
} from 'lucide-react';
import { rbacAPI, usersAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';

interface RoleInfo {
  role: string;
  permissions: string[];
}

interface PermissionInfo {
  name: string;
  description?: string;
  category?: string;
}

interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface UserOverride {
  permission: string;
  granted: boolean;
  reason?: string;
}

export default function RBACManager() {
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [permissions, setPermissions] = useState<PermissionInfo[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'matrix' | 'overrides'>('matrix');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userOverrides, setUserOverrides] = useState<UserOverride[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [matrixRes, permsRes, usersRes] = await Promise.allSettled([
        rbacAPI.getMatrix(),
        rbacAPI.getPermissions(),
        usersAPI.getAllUsers(1, 100),
      ]);

      if (matrixRes.status === 'fulfilled') {
        const data = (matrixRes.value as any)?.data || matrixRes.value;
        const rolesData = Array.isArray(data) ? data : data?.roles || [];
        setRoles(rolesData);
        // Initialize pending changes from current state
        const changes: Record<string, string[]> = {};
        rolesData.forEach((r: RoleInfo) => {
          changes[r.role] = [...(r.permissions || [])];
        });
        setPendingChanges(changes);
      }

      if (permsRes.status === 'fulfilled') {
        const data = (permsRes.value as any)?.data || permsRes.value;
        setPermissions(Array.isArray(data) ? data : data?.permissions || []);
      }

      if (usersRes.status === 'fulfilled') {
        const data = (usersRes.value as any)?.data || usersRes.value;
        const userList = data?.items || (Array.isArray(data) ? data : []);
        setUsers(userList);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (role: string, permission: string) => {
    setPendingChanges((prev) => {
      const current = prev[role] || [];
      const updated = current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission];
      return { ...prev, [role]: updated };
    });
  };

  const hasPermission = (role: string, permission: string): boolean => {
    return (pendingChanges[role] || []).includes(permission);
  };

  const saveRolePermissions = async (role: string) => {
    try {
      setSaving(true);
      setError('');
      await rbacAPI.updateRolePermissions(role, pendingChanges[role] || []);
      setSuccess(`Permissions for ${role} saved successfully`);
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const loadUserOverrides = async (userId: string) => {
    if (!userId) {
      setUserOverrides([]);
      return;
    }
    try {
      setError('');
      const response = await rbacAPI.getUserOverrides(userId) as any;
      const data = response?.data || response;
      setUserOverrides(Array.isArray(data) ? data : data?.overrides || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleUserSelect = async (userId: string) => {
    setSelectedUserId(userId);
    await loadUserOverrides(userId);
  };

  const handleAddOverride = async (permission: string, granted: boolean) => {
    if (!selectedUserId) return;
    try {
      setError('');
      await rbacAPI.setUserOverride(selectedUserId, { permission, granted });
      setSuccess('Permission override added');
      await loadUserOverrides(selectedUserId);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleRemoveOverride = async (permission: string) => {
    if (!selectedUserId) return;
    try {
      setError('');
      await rbacAPI.removeUserOverride(selectedUserId, permission);
      setSuccess('Permission override removed');
      await loadUserOverrides(selectedUserId);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce<Record<string, PermissionInfo[]>>((acc, p) => {
    const cat = p.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const roleNames = roles.map((r) => r.role);
  const selectedUser = users.find((u) => u.id === selectedUserId);

  const tabs = [
    { key: 'matrix' as const, label: 'Permission Matrix', icon: Shield },
    { key: 'overrides' as const, label: 'User Overrides', icon: Key },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading RBAC configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Lock className="w-8 h-8" />
            RBAC Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage role-based access control and user permissions
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Roles</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            {roles.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Permissions</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-600" />
            {permissions.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Users</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            {users.length}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 text-red-700 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-500/10 text-green-700 rounded-md flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Permission Matrix Tab */}
      {activeTab === 'matrix' && (
        <>
          <div className="bg-card border border-border rounded-lg overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[200px]">
                      Permission
                    </th>
                    {roleNames.map((role) => (
                      <th
                        key={role}
                        className="px-4 py-3 text-center text-sm font-semibold text-foreground min-w-[100px]"
                      >
                        <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-600">
                          {role}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <React.Fragment key={category}>
                      <tr className="bg-muted/30">
                        <td
                          colSpan={roleNames.length + 1}
                          className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider"
                        >
                          {category}
                        </td>
                      </tr>
                      {perms.map((perm) => (
                        <tr key={perm.name} className="border-b border-border hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground text-sm">{perm.name}</p>
                            {perm.description && (
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                            )}
                          </td>
                          {roleNames.map((role) => (
                            <td key={`${role}-${perm.name}`} className="px-4 py-3 text-center">
                              <button
                                onClick={() => togglePermission(role, perm.name)}
                                className={cn(
                                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                  hasPermission(role, perm.name) ? 'bg-primary' : 'bg-gray-300'
                                )}
                              >
                                <span
                                  className={cn(
                                    'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                                    hasPermission(role, perm.name) ? 'translate-x-4.5' : 'translate-x-0.5'
                                  )}
                                />
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {permissions.length === 0 && (
                    <tr>
                      <td colSpan={roleNames.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                        No permissions defined
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save Buttons */}
          <div className="flex gap-2 justify-end">
            {roleNames.map((role) => (
              <button
                key={role}
                onClick={() => saveRolePermissions(role)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm"
              >
                <Save className="w-4 h-4" />
                Save {role}
              </button>
            ))}
          </div>
        </>
      )}

      {/* User Overrides Tab */}
      {activeTab === 'overrides' && (
        <div className="space-y-6">
          {/* User Selector */}
          <div className="bg-card border border-border rounded-lg p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserSelect(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choose a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email}) - {user.role}
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <>
              {/* User Info */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-foreground">{selectedUser.username}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600">
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              {/* Current Overrides */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Permission Overrides</h3>
                {userOverrides.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-lg">
                    <Key className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No permission overrides for this user</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userOverrides.map((override) => (
                      <div
                        key={override.permission}
                        className="bg-card border border-border rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              override.granted ? 'bg-green-500' : 'bg-red-500'
                            )}
                          />
                          <span className="font-medium text-foreground text-sm">
                            {override.permission}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              override.granted
                                ? 'bg-green-500/10 text-green-700'
                                : 'bg-red-500/10 text-red-700'
                            )}
                          >
                            {override.granted ? 'Granted' : 'Denied'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveOverride(override.permission)}
                          className="text-xs text-red-600 hover:text-red-700 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Override */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Add Override</h3>
                <div className="grid grid-cols-2 gap-2">
                  {permissions
                    .filter((p) => !userOverrides.some((o) => o.permission === p.name))
                    .slice(0, 10)
                    .map((perm) => (
                      <div
                        key={perm.name}
                        className="flex items-center justify-between p-2 border border-border rounded-md text-sm"
                      >
                        <span className="text-foreground">{perm.name}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAddOverride(perm.name, true)}
                            className="px-2 py-0.5 text-xs bg-green-500/10 text-green-700 rounded hover:bg-green-500/20"
                          >
                            Grant
                          </button>
                          <button
                            onClick={() => handleAddOverride(perm.name, false)}
                            className="px-2 py-0.5 text-xs bg-red-500/10 text-red-700 rounded hover:bg-red-500/20"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
