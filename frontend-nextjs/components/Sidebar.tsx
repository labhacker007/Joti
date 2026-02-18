'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Rss,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  Shield,
  FileText,
  Plug,
  Bot,
  Lock,
  Activity,
  LogOut,
  UserCircle,
  BarChart3,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { usersAPI } from '@/api/client';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Badge } from './ui/badge';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  requireAdmin?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Feeds', path: '/feeds', icon: Rss },
  { label: 'Watchlist', path: '/watchlist', icon: Eye },
];

const adminItems: NavItem[] = [
  { label: 'Sources', path: '/admin/sources', icon: Rss },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'RBAC', path: '/admin/rbac', icon: Lock },
  { label: 'Connectors', path: '/admin/connectors', icon: Plug },
  { label: 'GenAI', path: '/admin/genai', icon: Bot },
  { label: 'Guardrails', path: '/admin/guardrails', icon: Shield },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'Audit Logs', path: '/admin/audit', icon: FileText },
  { label: 'Monitoring', path: '/admin/monitoring', icon: Activity },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

interface SidebarProps {
  userRole?: string;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ userRole, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    accessToken,
    logout,
    isImpersonating,
    assumedRole,
    originalRole,
    restoreRole,
  } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const isAdmin = userRole === 'ADMIN';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleRestoreRole = async () => {
    try {
      const response = (await usersAPI.restoreRole()) as any;
      if (response.data) {
        restoreRole(response.data.access_token, originalRole || '');
      }
    } catch (err) {
      console.error('[Sidebar] Failed to restore role:', err);
    }
  };

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;
    const isActive =
      pathname === item.path ||
      (item.path !== '/admin' && (pathname?.startsWith(item.path + '/') ?? false));

    return (
      <li key={item.path}>
        <Link
          href={item.path}
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition ${
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-50 ${
        collapsed ? 'w-16' : 'w-48'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!collapsed && (
            <h1 className="text-xl font-bold text-foreground">Joti</h1>
          )}
          <button
            onClick={onToggle}
            className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Impersonation Badge */}
        {isImpersonating && !collapsed && (
          <div className="px-3 py-2 border-b border-border">
            <Badge variant="warning" className="flex items-center gap-1 w-full justify-center">
              <Shield className="h-3 w-3" />
              As {assumedRole}
              <button
                onClick={handleRestoreRole}
                className="ml-1 hover:text-white"
                title="Restore original role"
              >
                &times;
              </button>
            </Badge>
          </div>
        )}
        {isImpersonating && collapsed && (
          <div className="px-2 py-2 border-b border-border flex justify-center">
            <button
              onClick={handleRestoreRole}
              className="p-1.5 bg-yellow-500/20 text-yellow-600 rounded-md hover:bg-yellow-500/30"
              title={`Impersonating as ${assumedRole} - Click to restore`}
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {navItems.map(renderNavLink)}
          </ul>

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="my-3 border-t border-border" />
              {!collapsed && (
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </p>
              )}
              <ul className="space-y-1">
                {adminItems.map(renderNavLink)}
              </ul>
            </>
          )}
        </nav>

        {/* Bottom Panel - User Controls */}
        <div className="border-t border-border p-2 space-y-1">
          {/* Theme Switcher */}
          <div
            className={`flex items-center ${collapsed ? 'justify-center' : 'px-3 py-1'}`}
          >
            <ThemeSwitcher
              selectedTheme={theme as any}
              onThemeChange={(newTheme) => setTheme(newTheme as ThemeName)}
              compact={collapsed}
            />
          </div>

          {/* Profile Link */}
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition ${
              pathname === '/profile'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
            title={collapsed ? 'Profile' : undefined}
          >
            <UserCircle className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <span className="truncate">
                {user?.username || 'Profile'}
              </span>
            )}
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md transition w-full text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
