'use client';

import React, { useEffect, useState } from 'react';
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Save,
  RefreshCw,
} from 'lucide-react';
import { adminAPI } from '@/api/client';
import { cn } from '@/lib/utils';

interface RBACMatrix {
  roles: Role[];
  permissions: Permission[];
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface RolePermissions {
  [roleId: string]: string[];
}

export default function RBACManager() {
  const [matrix, setMatrix] = useState<RBACMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({});

  useEffect(() => {
    fetchRBACMatrix();
  }, []);

  const fetchRBACMatrix = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getRBACMatrix() as any;
      setMatrix(response.data);

      // Initialize role permissions
      const permissions: RolePermissions = {};
      response.data.roles.forEach((role: Role) => {
        permissions[role.id] = [];
      });
      setRolePermissions(permissions);
    } catch (err: any) {
      setError(err.message || 'Failed to load RBAC matrix');
      console.error('RBAC error:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (roleId: string, permissionId: string) => {
    const permissions = rolePermissions[roleId] || [];
    const updated = permissions.includes(permissionId)
      ? permissions.filter((p) => p !== permissionId)
      : [...permissions, permissionId];
    setRolePermissions({
      ...rolePermissions,
      [roleId]: updated,
    });
  };

  const savePermissions = async (roleId: string) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await adminAPI.updateRolePermissions(roleId, rolePermissions[roleId] || []);
      setSuccess('Permissions updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save permissions');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading RBAC matrix...</div>
      </div>
    );
  }

  if (!matrix) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">RBAC matrix not available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">RBAC Manager</h1>
          <p className="text-muted-foreground mt-2">Manage role-based access control and permissions</p>
        </div>
        <button
          onClick={fetchRBACMatrix}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-600">Error</p>
            <p className="text-sm text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-600">Success</p>
            <p className="text-sm text-green-600/80">{success}</p>
          </div>
        </div>
      )}

      {/* RBAC Matrix Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  Permission
                </th>
                {matrix.roles.map((role) => (
                  <th
                    key={role.id}
                    className="px-6 py-4 text-left text-sm font-semibold text-foreground text-center"
                  >
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.permissions.map((permission) => (
                <tr key={permission.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-foreground">{permission.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {permission.description}
                      </p>
                    </div>
                  </td>
                  {matrix.roles.map((role) => (
                    <td
                      key={`${role.id}-${permission.id}`}
                      className="px-6 py-4 text-center"
                    >
                      <input
                        type="checkbox"
                        checked={rolePermissions[role.id]?.includes(permission.id) || false}
                        onChange={() => togglePermission(role.id, permission.id)}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Buttons */}
      <div className="flex gap-2 justify-end">
        {matrix.roles.map((role) => (
          <button
            key={role.id}
            onClick={() => savePermissions(role.id)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            Save {role.name}
          </button>
        ))}
      </div>
    </div>
  );
}
