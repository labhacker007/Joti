'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Rss,
  User,
  Settings,
  Upload,
  ChevronLeft,
  ChevronRight,
  Star,
  Eye,
  Users,
  Shield,
  FileText,
  BarChart,
  Plug,
  Bot,
  Lock,
  Activity,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  requireAdmin?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Feeds', path: '/feeds', icon: Rss },
  { label: 'My Feeds', path: '/my-feeds', icon: User },
  { label: 'Watchlist', path: '/watchlist', icon: Eye },
  { label: 'Document Upload', path: '/document-upload', icon: Upload },
  { label: 'Sources', path: '/admin/sources', icon: Settings, requireAdmin: true },
  { label: 'Users', path: '/admin/users', icon: Users, requireAdmin: true },
  { label: 'RBAC', path: '/admin/rbac', icon: Lock, requireAdmin: true },
  { label: 'Connectors', path: '/admin/connectors', icon: Plug, requireAdmin: true },
  { label: 'GenAI', path: '/admin/genai', icon: Bot, requireAdmin: true },
  { label: 'Audit Logs', path: '/admin/audit', icon: FileText, requireAdmin: true },
];

interface SidebarProps {
  userRole?: string;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ userRole, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userRole === 'ADMIN';

  const filteredItems = navItems.filter(item => !item.requireAdmin || isAdmin);

  // Split into user items and admin items
  const userItems = filteredItems.filter(item => !item.requireAdmin);
  const adminItems = filteredItems.filter(item => item.requireAdmin);

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-50 ${
        collapsed ? 'w-16' : 'w-64'
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {userItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (pathname?.startsWith(item.path + '/') ?? false);

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
            })}
          </ul>

          {/* Admin Section */}
          {adminItems.length > 0 && (
            <>
              <div className="my-3 border-t border-border" />
              {!collapsed && (
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </p>
              )}
              <ul className="space-y-1">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path || (pathname?.startsWith(item.path + '/') ?? false);

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
                })}
              </ul>
            </>
          )}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-border text-xs text-muted-foreground">
            <p>Joti Threat Intelligence</p>
            <p>v1.0.0</p>
          </div>
        )}
      </div>
    </aside>
  );
}
