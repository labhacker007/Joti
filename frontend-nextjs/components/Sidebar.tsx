'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Rss,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  Shield,
  FileText,
  Plug,
  Bot,
  Activity,
  LogOut,
  UserCircle,
  Eye,
  Globe,
  Bookmark,
  Wrench,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { usersAPI, sourcesAPI, userFeedsAPI } from '@/api/client';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Badge } from './ui/badge';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface FeedItem {
  id: string;
  name: string;
  url?: string;
  enabled?: boolean;
}

const adminItems: NavItem[] = [
  { label: 'Sources', path: '/admin/sources', icon: Rss },
  { label: 'Access Control', path: '/admin/users', icon: Users },
  { label: 'Connectors', path: '/admin/connectors', icon: Plug },
  { label: 'AI Engine', path: '/admin/genai', icon: Bot },
  { label: 'Audit Logs', path: '/admin/audit', icon: FileText },
  { label: 'Platform', path: '/admin/settings', icon: Layers },
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

  const [orgFeeds, setOrgFeeds] = useState<FeedItem[]>([]);
  const [customFeeds, setCustomFeeds] = useState<FeedItem[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [orgFeedsOpen, setOrgFeedsOpen] = useState(true);
  const [customFeedsOpen, setCustomFeedsOpen] = useState(true);

  // Auto-open admin section if on an admin page, and collapse feeds
  useEffect(() => {
    if (pathname?.startsWith('/admin')) {
      setShowAdmin(true);
      setOrgFeedsOpen(false);
      setCustomFeedsOpen(false);
    }
  }, [pathname]);

  // Fetch org sources and custom feeds
  useEffect(() => {
    if (!accessToken) return;

    const fetchFeeds = async () => {
      try {
        const [sourcesRes, customRes] = await Promise.allSettled([
          sourcesAPI.getSources(1, 100),
          userFeedsAPI.getMyFeeds(),
        ]);

        if (sourcesRes.status === 'fulfilled') {
          const data = (sourcesRes.value as any)?.data || sourcesRes.value;
          const items = (data?.items || data || [])
            .filter((s: any) => s.enabled !== false)
            .map((s: any) => ({ id: s.id, name: s.name, url: s.url }));
          setOrgFeeds(items);
        }

        if (customRes.status === 'fulfilled') {
          const data = (customRes.value as any)?.data || customRes.value;
          const items = (data || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            url: f.url,
          }));
          setCustomFeeds(items);
        }
      } catch {
        // Non-critical
      }
    };

    fetchFeeds();
  }, [accessToken]);

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

  const getFavicon = (url?: string) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=16`;
    } catch {
      return null;
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
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition text-sm ${
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
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
        <div className="p-3 border-b border-border flex items-center justify-between">
          {!collapsed && (
            <h1 className="text-lg font-bold text-foreground">J.O.T.I</h1>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground"
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

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* All Feeds link */}
          <Link
            href="/feeds"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition text-sm ${
              pathname === '/feeds'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
            title={collapsed ? 'Feeds' : undefined}
          >
            <Rss className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="font-medium">Feeds</span>}
          </Link>

          {/* Watchlist link */}
          <Link
            href="/watchlist"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition text-sm ${
              pathname === '/watchlist'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
            title={collapsed ? 'Watchlist' : undefined}
          >
            <Eye className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Watchlist</span>}
          </Link>

          {/* Threat Intelligence link */}
          <Link
            href="/intelligence"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition text-sm ${
              pathname === '/intelligence'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
            title={collapsed ? 'Intelligence' : undefined}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Intelligence</span>}
          </Link>

          {/* Org Feeds — scrollable section */}
          {!collapsed && orgFeeds.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setOrgFeedsOpen(!orgFeedsOpen)}
                className="flex items-center justify-between w-full px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                <span>Org Feeds</span>
                {orgFeedsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {orgFeedsOpen && (
                <ul className="mt-1 space-y-0.5">
                  {orgFeeds.map((feed) => {
                    const favicon = getFavicon(feed.url);
                    return (
                      <li key={feed.id}>
                        <Link
                          href={`/feeds?source=${encodeURIComponent(feed.name)}`}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition truncate"
                          title={feed.name}
                        >
                          {favicon ? (
                            <img
                              src={favicon}
                              alt=""
                              className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                          <span className="truncate">{feed.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Custom Feeds — scrollable section */}
          {!collapsed && customFeeds.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setCustomFeedsOpen(!customFeedsOpen)}
                className="flex items-center justify-between w-full px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                <span>Custom</span>
                {customFeedsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {customFeedsOpen && (
                <ul className="mt-1 space-y-0.5">
                  {customFeeds.map((feed) => {
                    const favicon = getFavicon(feed.url);
                    return (
                      <li key={feed.id}>
                        <Link
                          href={`/my-feeds`}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition truncate"
                          title={feed.name}
                        >
                          {favicon ? (
                            <img
                              src={favicon}
                              alt=""
                              className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                          <span className="truncate">{feed.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Collapsed: show feed icons */}
          {collapsed && orgFeeds.length > 0 && (
            <div className="mt-2 space-y-0.5">
              <div className="flex justify-center py-1">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Admin Section — toggled from button, not always shown */}
          {isAdmin && showAdmin && (
            <div id="sidebar-admin-section">
              <div className="my-2 border-t border-border" />
              {!collapsed && (
                <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </p>
              )}
              <ul className="space-y-0.5">
                {adminItems.map(renderNavLink)}
              </ul>
            </div>
          )}
        </nav>

        {/* Bottom Panel */}
        <div className="border-t border-border p-2 space-y-1">
          {/* Theme Switcher */}
          <div
            className={`flex items-center ${collapsed ? 'justify-center' : 'px-3 py-1'}`}
          >
            <ThemeSwitcher
              selectedTheme={theme as any}
              onThemeChange={(newTheme) => setTheme(newTheme as ThemeName)}
            />
          </div>

          {/* Admin Toggle (for admins) */}
          {isAdmin && (
            <button
              onClick={() => {
                if (!showAdmin) {
                  // Opening admin: show admin items, collapse all feeds
                  setShowAdmin(true);
                  setOrgFeedsOpen(false);
                  setCustomFeedsOpen(false);
                  if (!pathname?.startsWith('/admin')) {
                    router.push('/admin/sources');
                  }
                  setTimeout(() => {
                    document.getElementById('sidebar-admin-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                } else if (orgFeedsOpen || customFeedsOpen) {
                  // Admin is open but feeds are also open — collapse feeds, keep admin
                  setOrgFeedsOpen(false);
                  setCustomFeedsOpen(false);
                  setTimeout(() => {
                    document.getElementById('sidebar-admin-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                } else {
                  // Admin is open and feeds are collapsed — close admin, restore feeds
                  setShowAdmin(false);
                  setOrgFeedsOpen(true);
                  setCustomFeedsOpen(true);
                }
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition w-full text-sm ${
                showAdmin
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              title={collapsed ? 'Admin Panel' : undefined}
            >
              <Wrench className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Admin</span>}
            </button>
          )}

          {/* Profile Link */}
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition text-sm ${
              pathname === '/profile'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
            title={collapsed ? 'Profile' : undefined}
          >
            <UserCircle className="w-4 h-4 flex-shrink-0" />
            {!collapsed && (
              <span className="truncate">
                {user?.username || 'Profile'}
              </span>
            )}
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md transition w-full text-sm text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
