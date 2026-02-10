import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus, Pencil, Trash2, Mail, User as UserIcon, Lock,
  CheckCircle, XCircle, Shield
} from 'lucide-react';
import { usersAPI } from '../api/client.ts';
import type { User, UserRole, UserCreateRequest, UserUpdateRequest } from '../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Alert, AlertDescription } from '../components/ui/alert';
import AdminNav from '../components/AdminNav';

// ============================================
// CONSTANTS
// ============================================

const ROLES: Array<{ value: UserRole; label: string; color: string; description: string }> = [
  { value: 'ADMIN', label: 'Admin', color: 'destructive', description: 'Full system access - manage sources, users, global watchlist' },
  { value: 'ANALYST', label: 'Analyst', color: 'default', description: 'Analyst access - triage, reports, advanced features' },
  { value: 'CONTRIBUTOR', label: 'Contributor', color: 'secondary', description: 'Contributor access - submit and edit content' },
  { value: 'VIEWER', label: 'Viewer', color: 'outline', description: 'Standard user - view feeds, manage personal watchlist' },
];

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createUserSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().optional(),
  role: z.enum(['ADMIN', 'ANALYST', 'CONTRIBUTOR', 'VIEWER']),
  is_active: z.boolean().optional(),
});

const editUserSchema = z.object({
  full_name: z.string().optional(),
  role: z.enum(['ADMIN', 'ANALYST', 'CONTRIBUTOR', 'VIEWER']),
  is_active: z.boolean(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;

// ============================================
// MAIN COMPONENT
// ============================================

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'VIEWER',
      is_active: true,
    },
  });

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
  });

  useEffect(() => {
    loadUsers();
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const response = await usersAPI.getUsers();
      setUsers(response.data || []);
    } catch (err: any) {
      console.error('Failed to load users', err);
      setError('Unable to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // MODAL HANDLERS
  // ============================================

  function openCreate() {
    setEditing(null);
    createForm.reset({
      email: '',
      username: '',
      password: '',
      full_name: '',
      role: 'VIEWER',
      is_active: true,
    });
    setModalOpen(true);
    setError('');
  }

  function openEdit(user: User) {
    setEditing(user);
    editForm.reset({
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
    });
    setModalOpen(true);
    setError('');
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setError('');
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async function onCreateSubmit(values: CreateUserForm) {
    try {
      setError('');
      const data: UserCreateRequest = {
        email: values.email,
        username: values.username,
        password: values.password,
        full_name: values.full_name || '',
        role: values.role,
        is_active: values.is_active ?? true,
      };

      await usersAPI.createUser(data);
      closeModal();
      loadUsers();
    } catch (err: any) {
      const errorDetail = err?.response?.data?.detail;
      if (errorDetail && typeof errorDetail === 'string' && errorDetail.includes('already')) {
        setError('A user with this email or username already exists.');
      } else {
        setError(errorDetail || 'Failed to create user. Please try again.');
      }
    }
  }

  async function onEditSubmit(values: EditUserForm) {
    if (!editing) return;

    try {
      setError('');
      const data: UserUpdateRequest = {
        full_name: values.full_name,
        role: values.role,
        is_active: values.is_active,
      };

      await usersAPI.updateUser(editing.id, data);
      closeModal();
      loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update user. Please try again.');
    }
  }

  async function onDelete(id: number) {
    try {
      await usersAPI.deleteUser(id);
      setDeleteConfirm(null);
      loadUsers();
    } catch (err: any) {
      setError('Failed to delete user. Please try again.');
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  function getRoleInfo(roleName: UserRole) {
    return ROLES.find(r => r.value === roleName) || ROLES[3];
  }

  function formatDate(dateString?: string) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Error Alert */}
      {error && !modalOpen && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Users Table */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No users found. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Username</th>
                    <th className="text-left py-3 px-4 font-medium">Full Name</th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Last Login</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const roleInfo = getRoleInfo(user.role);
                    return (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {user.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            {user.username}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {user.full_name || <span className="text-muted-foreground">Not set</span>}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={roleInfo.color as any} title={roleInfo.description}>
                            <Shield className="mr-1 h-3 w-3" />
                            {roleInfo.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {user.is_active ? (
                            <Badge variant="default">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="mr-1 h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatDate(user.last_login)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(user)}
                              title="Edit User"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {deleteConfirm === user.id ? (
                              <>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => onDelete(user.id)}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(user.id)}
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                {editing ? 'Edit User' : 'Create New User'}
              </CardTitle>
              <CardDescription>
                {editing ? 'Update user details and permissions' : 'Add a new user to the system'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {editing ? (
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      {...editForm.register('full_name')}
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <select
                      id="role"
                      {...editForm.register('role')}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label} - {role.description}
                        </option>
                      ))}
                    </select>
                    {editForm.formState.errors.role && (
                      <p className="text-sm text-destructive mt-1">
                        {editForm.formState.errors.role.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="is_active">Account Status *</Label>
                    <select
                      id="is_active"
                      {...editForm.register('is_active', { valueAsNumber: false })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      onChange={(e) => editForm.setValue('is_active', e.target.value === 'true')}
                    >
                      <option value="true">Active - User can login</option>
                      <option value="false">Inactive - User cannot login</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">Update User</Button>
                    <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...createForm.register('email')}
                      placeholder="user@example.com"
                    />
                    {createForm.formState.errors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {createForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      {...createForm.register('username')}
                      placeholder="username"
                    />
                    {createForm.formState.errors.username && (
                      <p className="text-sm text-destructive mt-1">
                        {createForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      {...createForm.register('password')}
                      placeholder="Enter password"
                    />
                    {createForm.formState.errors.password && (
                      <p className="text-sm text-destructive mt-1">
                        {createForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      {...createForm.register('full_name')}
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="role_create">Role *</Label>
                    <select
                      id="role_create"
                      {...createForm.register('role')}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label} - {role.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">Create User</Button>
                    <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
