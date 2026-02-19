'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Users,
  Lock,
  Eye,
  Database,
  Cpu,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  Check,
} from 'lucide-react';
import { rbacAPI, usersAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Permission {
  key: string;
  label: string;
  description: string;
  group: string;
}

interface RoleData {
  key: string;
  label: string;
  description: string;
  color: string;
  permissions: string[];
}

interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface Override {
  id: number;
  permission: string;
  granted: boolean;
  reason?: string;
  created_at?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERMISSION_GROUPS: Record<string, { label: string; icon: React.ReactNode }> = {
  'Core Access': {
    label: 'Core Access',
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  'Sources & Feeds': {
    label: 'Sources & Feeds',
    icon: <Database className="w-3.5 h-3.5" />,
  },
  Administration: {
    label: 'Administration',
    icon: <Settings className="w-3.5 h-3.5" />,
  },
};

const ROLE_COLORS: Record<string, string> = {
  red: 'border-red-500/30 bg-red-500/5',
  blue: 'border-blue-500/30 bg-blue-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
  purple: 'border-purple-500/30 bg-purple-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  slate: 'border-slate-500/30 bg-slate-500/5',
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  red: 'bg-red-500/15 text-red-400 ring-red-500/20',
  blue: 'bg-blue-500/15 text-blue-400 ring-blue-500/20',
  emerald: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
  purple: 'bg-purple-500/15 text-purple-400 ring-purple-500/20',
  amber: 'bg-amber-500/15 text-amber-400 ring-amber-500/20',
  slate: 'bg-slate-500/15 text-slate-400 ring-slate-500/20',
};

// ─── Role Card ────────────────────────────────────────────────────────────────

interface RoleCardProps {
  role: RoleData;
  allPermissions: Permission[];
  pendingPerms: string[];
  onToggle: (perm: string) => void;
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
  isDirty: boolean;
}

function RoleCard({
  role,
  allPermissions,
  pendingPerms,
  onToggle,
  onSave,
  onReset,
  saving,
  isDirty,
}: RoleCardProps) {
  const [expanded, setExpanded] = useState(false);

  const groups = Object.keys(PERMISSION_GROUPS);
  const cardBorder = ROLE_COLORS[role.color] || ROLE_COLORS.slate;
  const badgeColor = ROLE_BADGE_COLORS[role.color] || ROLE_BADGE_COLORS.slate;

  return (
    <div className={cn('rounded-xl border-2 transition-all duration-200', cardBorder)}>
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-current opacity-70" />
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full ring-1', badgeColor)}>
                {role.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{role.description}</p>
          </div>
          <div className="text-right shrink-0 ml-3">
            <div className="text-lg font-bold text-foreground">{pendingPerms.length}</div>
            <div className="text-[10px] text-muted-foreground">/ {allPermissions.length} perms</div>
          </div>
        </div>

        {/* Permission pill summary */}
        {!expanded && (
          <div className="flex flex-wrap gap-1 mt-2">
            {pendingPerms.slice(0, 4).map((p) => (
              <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/10 text-muted-foreground font-mono">
                {p}
              </span>
            ))}
            {pendingPerms.length > 4 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/10 text-muted-foreground">
                +{pendingPerms.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 rounded-lg hover:bg-foreground/5"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Collapse
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Edit permissions
            </>
          )}
        </button>
      </div>

      {/* Expanded permission editor */}
      {expanded && (
        <div className="border-t border-border/50 p-4 space-y-4">
          {groups.map((groupName) => {
            const groupPerms = allPermissions.filter((p) => p.group === groupName);
            if (!groupPerms.length) return null;
            const groupMeta = PERMISSION_GROUPS[groupName];
            return (
              <div key={groupName}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-muted-foreground">{groupMeta.icon}</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {groupMeta.label}
                  </span>
                </div>
                <div className="space-y-1">
                  {groupPerms.map((perm) => {
                    const active = pendingPerms.includes(perm.key);
                    return (
                      <button
                        key={perm.key}
                        onClick={() => onToggle(perm.key)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150 text-xs group',
                          active
                            ? 'bg-foreground/10 text-foreground'
                            : 'hover:bg-foreground/5 text-muted-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors',
                            active
                              ? 'bg-green-500 text-white'
                              : 'border border-border group-hover:border-foreground/50'
                          )}
                        >
                          {active && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-[11px] truncate">{perm.key}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{perm.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Save/Reset footer */}
          <div className="flex gap-2 pt-2 border-t border-border/50">
            <button
              onClick={onReset}
              disabled={!isDirty || saving}
              className="flex-1 py-1.5 text-xs rounded-lg border border-border hover:bg-foreground/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
            <button
              onClick={onSave}
              disabled={!isDirty || saving}
              className="flex-1 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User Overrides Panel ─────────────────────────────────────────────────────

interface UserOverridesPanelProps {
  users: UserInfo[];
  allPermissions: Permission[];
}

function UserOverridesPanel({ users, allPermissions }: UserOverridesPanelProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [effectivePerms, setEffectivePerms] = useState<string[]>([]);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addPerm, setAddPerm] = useState('');
  const [addGranted, setAddGranted] = useState(true);
  const [addReason, setAddReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const loadUserData = async (userId: number) => {
    try {
      setLoading(true);
      setError('');
      const res = await rbacAPI.getUserOverrides(String(userId)) as any;
      const data = res?.data || res;
      setOverrides(data?.overrides || []);
      setEffectivePerms(data?.effective_permissions || []);
      setUserRole(data?.role || '');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId: number) => {
    setSelectedUserId(userId);
    loadUserData(userId);
  };

  const handleAddOverride = async () => {
    if (!selectedUserId || !addPerm) return;
    try {
      setSaving(true);
      await rbacAPI.setUserOverride(String(selectedUserId), {
        permission: addPerm,
        granted: addGranted,
        reason: addReason || undefined,
      });
      setAddPerm('');
      setAddReason('');
      await loadUserData(selectedUserId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOverride = async (permission: string) => {
    if (!selectedUserId) return;
    try {
      await rbacAPI.removeUserOverride(String(selectedUserId), permission);
      await loadUserData(selectedUserId);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* User list */}
      <div className="col-span-1 flex flex-col gap-2">
        <input
          type="text"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex-1 overflow-y-auto space-y-1 max-h-[60vh]">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user.id)}
              className={cn(
                'w-full flex flex-col items-start px-3 py-2.5 rounded-lg text-left transition-colors text-sm',
                selectedUserId === user.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-foreground/5 text-foreground'
              )}
            >
              <span className="font-medium truncate w-full">{user.username}</span>
              <span
                className={cn(
                  'text-xs truncate w-full',
                  selectedUserId === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}
              >
                {user.role} · {user.email}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Override editor */}
      <div className="col-span-2">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Users className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Select a user to view their overrides</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm">{selectedUser.username}</h3>
              <p className="text-xs text-muted-foreground">
                Role: <span className="font-mono">{userRole}</span> · {effectivePerms.length} effective permissions
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
              </div>
            )}

            {/* Existing overrides */}
            {overrides.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Active Overrides
                </p>
                <div className="space-y-1.5">
                  {overrides.map((ov) => (
                    <div
                      key={ov.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-foreground/5 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]',
                            ov.granted ? 'bg-green-500' : 'bg-red-500'
                          )}
                        >
                          {ov.granted ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </span>
                        <div>
                          <span className="font-mono text-xs">{ov.permission}</span>
                          {ov.reason && (
                            <p className="text-[10px] text-muted-foreground">{ov.reason}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveOverride(ov.permission)}
                        className="text-muted-foreground hover:text-red-400 transition-colors p-1 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add override form */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Add Override
              </p>
              <div className="space-y-2">
                <select
                  value={addPerm}
                  onChange={(e) => setAddPerm(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select permission…</option>
                  {allPermissions.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.key} — {p.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="granted"
                      checked={addGranted}
                      onChange={() => setAddGranted(true)}
                      className="accent-green-500"
                    />
                    <span className="text-green-400">Grant</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="granted"
                      checked={!addGranted}
                      onChange={() => setAddGranted(false)}
                      className="accent-red-500"
                    />
                    <span className="text-red-400">Deny</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={addReason}
                  onChange={(e) => setAddReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleAddOverride}
                  disabled={!addPerm || saving}
                  className="w-full py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? 'Saving…' : 'Add override'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RBACManager() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'roles' | 'overrides'>('roles');
  // pendingPerms: role key → current permission list (local edits before save)
  const [pendingPerms, setPendingPerms] = useState<Record<string, string[]>>({});
  const [savedPerms, setSavedPerms] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null); // role key being saved

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [rolesRes, permsRes, usersRes] = await Promise.allSettled([
        rbacAPI.getRoles(),
        rbacAPI.getPermissions(),
        usersAPI.getAllUsers(1, 200),
      ]);

      if (rolesRes.status === 'fulfilled') {
        const data = (rolesRes.value as any)?.data || rolesRes.value;
        const rawRoles: RoleData[] = data?.roles || [];
        setRoles(rawRoles);
        const initial: Record<string, string[]> = {};
        rawRoles.forEach((r) => {
          initial[r.key] = [...(r.permissions || [])];
        });
        setPendingPerms(initial);
        setSavedPerms(initial);
      }

      if (permsRes.status === 'fulfilled') {
        const data = (permsRes.value as any)?.data || permsRes.value;
        const rawPerms: Permission[] = data?.permissions || [];
        setAllPermissions(rawPerms);
      }

      if (usersRes.status === 'fulfilled') {
        const data = (usersRes.value as any)?.data || usersRes.value;
        setUsers(data?.items || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = useCallback((role: string, perm: string) => {
    setPendingPerms((prev) => {
      const current = prev[role] || [];
      const updated = current.includes(perm) ? current.filter((p) => p !== perm) : [...current, perm];
      return { ...prev, [role]: updated };
    });
  }, []);

  const resetRole = useCallback((role: string) => {
    setPendingPerms((prev) => ({ ...prev, [role]: [...(savedPerms[role] || [])] }));
  }, [savedPerms]);

  const saveRole = async (role: string) => {
    try {
      setSaving(role);
      setError('');
      await rbacAPI.updateRolePermissions(role, pendingPerms[role] || []);
      setSavedPerms((prev) => ({ ...prev, [role]: [...(pendingPerms[role] || [])] }));
      setSuccess(`${role} permissions saved`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  const isDirty = (role: string) => {
    const pending = pendingPerms[role] || [];
    const saved = savedPerms[role] || [];
    if (pending.length !== saved.length) return true;
    const savedSet = new Set(saved);
    return pending.some((p) => !savedSet.has(p));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading access control…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Access Control</h1>
            <p className="text-sm text-muted-foreground">
              Manage role permissions · {allPermissions.length} permissions · {roles.length} roles
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-foreground/5 transition-colors text-muted-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Status banners */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-3 border border-green-500/20">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-foreground/5 rounded-lg p-1 w-fit">
        {(['roles', 'overrides'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'roles' ? (
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Role Permissions
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> User Overrides
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'roles' ? (
        <div className="grid grid-cols-2 gap-4">
          {roles.map((role) => (
            <RoleCard
              key={role.key}
              role={role}
              allPermissions={allPermissions}
              pendingPerms={pendingPerms[role.key] || []}
              onToggle={(perm) => togglePermission(role.key, perm)}
              onSave={() => saveRole(role.key)}
              onReset={() => resetRole(role.key)}
              saving={saving === role.key}
              isDirty={isDirty(role.key)}
            />
          ))}
        </div>
      ) : (
        <UserOverridesPanel users={users} allPermissions={allPermissions} />
      )}
    </div>
  );
}
