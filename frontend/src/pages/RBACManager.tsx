import React, { useEffect, useState } from 'react';
import { Shield, Save, RefreshCw, CheckCircle2, XCircle, Info } from 'lucide-react';
import { rbacAPI } from '../api/client.ts';
import type { RBACMatrix, Permission, Role } from '../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Alert, AlertDescription } from '../components/ui/alert';

// ============================================
// TYPES
// ============================================

interface PermissionChanges {
  [roleId: string]: {
    [permissionId: string]: boolean;
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RBACManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matrix, setMatrix] = useState<RBACMatrix | null>(null);
  const [changes, setChanges] = useState<PermissionChanges>({});
  const [error, setError] = useState('');

  useEffect(() => {
    loadRBACMatrix();
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadRBACMatrix() {
    setLoading(true);
    setError('');
    try {
      const response = await rbacAPI.getMatrix();
      setMatrix(response.data);
      setChanges({});
    } catch (err: any) {
      console.error('Failed to load RBAC matrix', err);
      setError('Unable to load RBAC matrix. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // PERMISSION TOGGLE
  // ============================================

  function togglePermission(roleId: string, permissionId: string, currentlyHas: boolean) {
    setChanges(prev => ({
      ...prev,
      [roleId]: {
        ...(prev[roleId] || {}),
        [permissionId]: !currentlyHas,
      },
    }));
  }

  function hasPermission(roleId: string, permissionId: string): boolean {
    const role = matrix?.roles.find(r => r.id === roleId);
    if (!role) return false;

    // Check if there's a pending change
    if (changes[roleId]?.[permissionId] !== undefined) {
      return changes[roleId][permissionId];
    }

    // Otherwise return current state
    return role.permissions.includes(permissionId);
  }

  function hasChanges(): boolean {
    return Object.keys(changes).length > 0;
  }

  // ============================================
  // SAVE CHANGES
  // ============================================

  async function saveChanges() {
    setSaving(true);
    setError('');
    try {
      // Process each role's changes
      for (const [roleId, permChanges] of Object.entries(changes)) {
        const role = matrix?.roles.find(r => r.id === roleId);
        if (!role) continue;

        const newPermissions = [...role.permissions];

        // Apply changes
        for (const [permId, shouldHave] of Object.entries(permChanges)) {
          const hasIt = newPermissions.includes(permId);
          if (shouldHave && !hasIt) {
            newPermissions.push(permId);
          } else if (!shouldHave && hasIt) {
            const index = newPermissions.indexOf(permId);
            if (index > -1) newPermissions.splice(index, 1);
          }
        }

        await rbacAPI.updateRolePermissions(roleId, newPermissions);
      }

      await loadRBACMatrix();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save changes');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function discardChanges() {
    setChanges({});
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <Spinner className="mx-auto mb-4" />
            <p className="text-muted-foreground">Loading RBAC matrix...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!matrix) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>Failed to load RBAC matrix</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Group permissions by category
  const permissionsByCategory: Record<string, Permission[]> = {};
  matrix.permissions.forEach(perm => {
    const category = perm.category || 'Other';
    if (!permissionsByCategory[category]) {
      permissionsByCategory[category] = [];
    }
    permissionsByCategory[category].push(perm);
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-8 w-8" />
            RBAC Management
          </h1>
          <p className="text-muted-foreground">Manage role-based access control and permissions</p>
        </div>
        <Button variant="outline" onClick={loadRBACMatrix} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Toggle permissions for each role. Changes are saved when you click "Save Changes".
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Changes Indicator */}
      {hasChanges() && (
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved changes</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={discardChanges}>
                Discard
              </Button>
              <Button size="sm" onClick={saveChanges} disabled={saving}>
                {saving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Matrix by Category */}
      <div className="space-y-6">
        {Object.entries(permissionsByCategory).map(([category, perms]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
              <CardDescription>
                Manage {category.toLowerCase()} permissions for all roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium min-w-[200px]">Permission</th>
                      {matrix.roles.map(role => (
                        <th key={role.id} className="text-center py-3 px-4 font-medium">
                          <div className="flex flex-col items-center gap-1">
                            <span>{role.name}</span>
                            {role.description && (
                              <span className="text-xs text-muted-foreground font-normal">
                                {role.description}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {perms.map(permission => (
                      <tr key={permission.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{permission.name}</div>
                            {permission.description && (
                              <div className="text-sm text-muted-foreground">
                                {permission.description}
                              </div>
                            )}
                          </div>
                        </td>
                        {matrix.roles.map(role => {
                          const has = hasPermission(role.id, permission.id);
                          const isChanged = changes[role.id]?.[permission.id] !== undefined;
                          return (
                            <td key={role.id} className="py-3 px-4 text-center">
                              <button
                                onClick={() => togglePermission(role.id, permission.id, has)}
                                className={`
                                  inline-flex items-center justify-center rounded-full p-1
                                  transition-colors ${isChanged ? 'ring-2 ring-primary' : ''}
                                `}
                              >
                                {has ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-muted-foreground" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold">{matrix.roles.length}</div>
              <div className="text-sm text-muted-foreground">Total Roles</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{matrix.permissions.length}</div>
              <div className="text-sm text-muted-foreground">Total Permissions</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{Object.keys(permissionsByCategory).length}</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
