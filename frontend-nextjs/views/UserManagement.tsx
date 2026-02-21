'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle,
  Users as UsersIcon,
  Shield,
  UserCheck,
  ChevronRight,
  X,
  Save,
} from 'lucide-react';
import { usersAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { formatDate, cn } from '@/lib/utils';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:     'bg-purple-500/10 text-purple-600 border-purple-500/20',
  ANALYST:   'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ENGINEER:  'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  MANAGER:   'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  EXECUTIVE: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  VIEWER:    'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-green-500/10 text-green-600',
  INACTIVE:  'bg-gray-500/10 text-gray-500',
  SUSPENDED: 'bg-red-500/10 text-red-600',
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected user panel (view + edit)
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<{ email: string; full_name: string; role: string; status: User['status'] }>({ email: '', full_name: '', role: 'VIEWER', status: 'ACTIVE' });
  const [saving, setSaving] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'VIEWER' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);

  const fetchUsers = async () => {
    try {
      setLoading(true); setError('');
      const response = await usersAPI.getAllUsers(1, 200) as any;
      let list: User[] = Array.isArray(response)
        ? response
        : (response.data?.items || response.items || response.data || response || []);
      setUsers(list);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  const openUser = (user: User) => {
    setSelectedUser(user);
    setFormData({ email: user.email, full_name: user.full_name || '', role: user.role, status: user.status as User['status'] });
    setEditMode(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setSaving(true); setError('');
    try {
      const numericId = parseInt(selectedUser.id, 10) || selectedUser.id;
      await usersAPI.updateUser(numericId as any, {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
      });
      setSuccess('User updated');
      setSelectedUser({ ...selectedUser, ...formData, status: formData.status as User['status'] });
      setEditMode(false);
      await fetchUsers();
    } catch (err: any) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      setError('');
      const numericId = parseInt(userId, 10) || userId;
      await usersAPI.deleteUser(numericId as any);
      setSuccess('User deleted');
      if (selectedUser?.id === userId) setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) { setError(getErrorMessage(err)); }
  };

  const handleCreate = async () => {
    if (!createForm.username || !createForm.email || !createForm.password) {
      setError('Username, email, and password are required'); return;
    }
    setCreating(true); setError('');
    try {
      await usersAPI.createUser(createForm);
      setSuccess('User created');
      setShowCreate(false);
      setCreateForm({ username: '', email: '', full_name: '', password: '', role: 'VIEWER' });
      await fetchUsers();
    } catch (err: any) { setError(getErrorMessage(err)); }
    finally { setCreating(false); }
  };

  const q = searchQuery.toLowerCase();
  const filtered = q
    ? users.filter((u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q)
      )
    : users;

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const adminCount  = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <div className="space-y-4 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground shrink-0 flex items-center gap-2">
          <UsersIcon className="w-4 h-4" /> User Management
        </h1>
        <div className="flex-1" />
        {/* Search */}
        <div className="relative w-52 shrink-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-card border border-border rounded-md text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add User
        </button>
      </div>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Total Users</p>
          <p className="text-xl font-bold text-foreground flex items-center gap-2 mt-0.5">
            <UsersIcon className="w-4 h-4 text-blue-600" /> {users.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-xl font-bold text-green-600 flex items-center gap-2 mt-0.5">
            <UserCheck className="w-4 h-4" /> {activeCount}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Admins</p>
          <p className="text-xl font-bold text-purple-600 flex items-center gap-2 mt-0.5">
            <Shield className="w-4 h-4" /> {adminCount}
          </p>
        </div>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="p-2.5 bg-red-500/10 text-red-700 rounded-md flex items-center gap-2 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="p-2.5 bg-green-500/10 text-green-700 rounded-md flex items-center gap-2 text-xs">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> {success}
        </div>
      )}

      {/* ── Main content: list + detail panel ── */}
      <div className={cn('flex gap-4', selectedUser ? 'items-start' : '')}>
        {/* User list */}
        <div className={cn('bg-card border border-border rounded-lg overflow-hidden flex-1 min-w-0')}>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_auto] gap-3 px-4 py-2 border-b border-border bg-muted/40">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Username</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Email</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Role</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Status</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide w-8" />
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Loading users...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No users found</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => openUser(user)}
                    className={cn(
                      'grid grid-cols-[1fr_1.5fr_1fr_1fr_auto] gap-3 px-4 py-2.5 cursor-pointer transition-colors items-center',
                      isSelected ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-muted/40 border-l-2 border-transparent'
                    )}
                  >
                    <span className="text-sm font-medium text-foreground truncate">{user.username}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium w-fit', ROLE_COLORS[user.role] || ROLE_COLORS.VIEWER)}>
                      {user.role}
                    </span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium w-fit', STATUS_COLORS[user.status] || '')}>
                      {user.status}
                    </span>
                    <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', isSelected && 'rotate-90')} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── User detail / edit panel ── */}
        {selectedUser && (
          <div className="w-72 shrink-0 bg-card border border-border rounded-lg overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <span className="text-sm font-semibold text-foreground truncate">{selectedUser.username}</span>
              <div className="flex items-center gap-1">
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => { setSelectedUser(null); setEditMode(false); }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Read-only fields */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Username</p>
                <p className="text-sm text-foreground">{selectedUser.username}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Member since</p>
                <p className="text-xs text-muted-foreground">{formatDate(selectedUser.created_at)}</p>
              </div>

              {/* Editable fields */}
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Email</label>
                {editMode ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                ) : (
                  <p className="text-xs text-foreground">{selectedUser.email}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Full Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                ) : (
                  <p className="text-xs text-foreground">{selectedUser.full_name || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Role</label>
                {editMode ? (
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="ANALYST">Analyst</option>
                    <option value="ENGINEER">Engineer</option>
                    <option value="MANAGER">Manager</option>
                    <option value="EXECUTIVE">Executive</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                ) : (
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', ROLE_COLORS[selectedUser.role] || ROLE_COLORS.VIEWER)}>
                    {selectedUser.role}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Status</label>
                {editMode ? (
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as User['status'] })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                ) : (
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', STATUS_COLORS[selectedUser.status] || '')}>
                    {selectedUser.status}
                  </span>
                )}
              </div>

              {/* Actions */}
              {editMode ? (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setFormData({ email: selectedUser.email, full_name: selectedUser.full_name || '', role: selectedUser.role, status: selectedUser.status as User['status'] }); }}
                    className="flex-1 px-3 py-1.5 bg-muted text-foreground rounded text-xs font-medium hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleDelete(selectedUser.id)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-red-500/20 text-red-500 text-xs font-medium hover:bg-red-500/10 transition-colors mt-2"
                >
                  <Trash2 className="w-3 h-3" /> Delete User
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Create User Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Add New User</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Username *', key: 'username', type: 'text' },
                { label: 'Email *', key: 'email', type: 'email' },
                { label: 'Full Name', key: 'full_name', type: 'text' },
                { label: 'Password *', key: 'password', type: 'password' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
                  <input
                    type={type}
                    value={(createForm as any)[key]}
                    onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.value })}
                    className="w-full px-3 py-1.5 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="ENGINEER">Engineer</option>
                  <option value="MANAGER">Manager</option>
                  <option value="EXECUTIVE">Executive</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create User'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-3 py-2 bg-muted text-foreground rounded text-sm hover:bg-accent"
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
