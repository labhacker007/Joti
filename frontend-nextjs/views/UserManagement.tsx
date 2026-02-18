'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle,
  Eye,
  Lock,
  Users as UsersIcon,
  Shield,
  UserCheck,
} from 'lucide-react';
import { usersAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { formatDate, cn } from '@/lib/utils';
import { Table, Column } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { Form, FormField } from '@/components/Form';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('USER');

  const pageSize = 10;

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'VIEWER',
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await usersAPI.getAllUsers(
        currentPage,
        pageSize
      ) as any;

      let users = response.data?.items || [];

      // Client-side filtering by search query if needed
      if (searchQuery) {
        users = users.filter((user: User) =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setUsers(users);
      setTotalPages(Math.ceil((response.data?.total || 0) / pageSize));
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
      console.error('Users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      setError('');
      setSuccess('');

      if (!formData.username || !formData.email || !formData.password) {
        setError('Username, email, and password are required');
        return;
      }

      await usersAPI.createUser({
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        role: formData.role,
      });

      setSuccess('User created successfully');
      setShowCreateModal(false);
      resetForm();
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      console.error('Create user error:', err);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setError('');
      setSuccess('');

      const numericId = parseInt(editingUser.id, 10) || editingUser.id;
      await usersAPI.updateUser(numericId as any, {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
      });

      setSuccess('User updated successfully');
      setEditingUser(null);
      resetForm();
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
      console.error('Update user error:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      setError('');
      setSuccess('');
      const numericId = parseInt(userId, 10) || userId;
      await usersAPI.deleteUser(numericId as any);
      setSuccess('User deleted successfully');
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      console.error('Delete user error:', err);
    }
  };

  const handleChangeUserStatus = async (userId: string, newStatus: string) => {
    try {
      setError('');
      setSuccess('');
      const numericId = parseInt(userId, 10) || userId;
      // Update user with new status by calling updateUser
      await usersAPI.updateUser(numericId as any, { status: newStatus });
      setSuccess(`User status updated to ${newStatus}`);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
      console.error('Status change error:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: 'VIEWER',
    });
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      password: '',
      role: user.role,
    });
  };

  const columns: Column<User>[] = [
    {
      key: 'username',
      label: 'Username',
      sortable: true,
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      key: 'full_name',
      label: 'Full Name',
      sortable: true,
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value) => (
        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-600">
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span
          className={cn(
            'px-2 py-1 rounded text-xs font-medium',
            value === 'ACTIVE'
              ? 'bg-green-500/10 text-green-600'
              : value === 'INACTIVE'
                ? 'bg-gray-500/10 text-gray-600'
                : 'bg-red-500/10 text-red-600'
          )}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value, item) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(item)}
            className="p-1 hover:bg-accent rounded text-blue-600"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteUser(value)}
            className="p-1 hover:bg-accent rounded text-red-600"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const adminUsers = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="w-8 h-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage system users and permissions</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingUser(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-blue-600" />
            {users.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active Users</p>
          <p className="text-2xl font-bold text-green-600 flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            {activeUsers}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            {adminUsers}
          </p>
        </div>
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table<User>
          data={users}
          columns={columns}
          loading={loading}
          empty="No users found"
        />
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        loading={loading}
      />

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-foreground mb-4">Add New User</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateUser}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Create User
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-foreground mb-4">Edit User</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Username
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.username}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status
                </label>
                <select
                  value={editingUser.status}
                  onChange={(e) =>
                    handleChangeUserStatus(editingUser.id, e.target.value)
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleUpdateUser}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setEditingUser(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
