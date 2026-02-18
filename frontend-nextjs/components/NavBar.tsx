'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Rss,
  Settings,
  User,
  Shield,
  Upload,
} from 'lucide-react';
import { useAuthStore } from '../store';
import { usersAPI } from '../api/client';
import { Badge } from './ui/badge';

interface AccessiblePage {
  key: string;
  name: string;
}

function NavBar() {
  const {
    user,
    accessToken,
    isImpersonating,
    assumedRole,
    originalRole,
    restoreRole,
  } = useAuthStore();
  const pathname = usePathname();
  const [accessiblePages, setAccessiblePages] = useState<AccessiblePage[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  const fetchMyPermissions = useCallback(async () => {
    if (!accessToken) {
      setAccessiblePages([]);
      setPermissionsLoading(false);
      return;
    }

    try {
      setPermissionsLoading(true);
      const response = (await usersAPI.getMyPermissions()) as any;
      const pages = response.data?.accessible_pages || [];
      setAccessiblePages(pages);
    } catch (err) {
      console.error('[NavBar] Failed to fetch permissions:', err);
      setAccessiblePages([]);
    } finally {
      setPermissionsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchMyPermissions();
  }, [fetchMyPermissions, isImpersonating, assumedRole]);

  const hasPageAccess = useCallback(
    (pageKey: string): boolean => {
      if (permissionsLoading) return false;
      if (accessiblePages.length > 0) {
        return accessiblePages.some((p) => p.key === pageKey);
      }
      if (!isImpersonating && user?.role === 'ADMIN') {
        return true;
      }
      return false;
    },
    [accessiblePages, permissionsLoading, isImpersonating, user?.role]
  );

  const handleRestoreRole = async () => {
    try {
      const response = (await usersAPI.restoreRole()) as any;
      if (response.data) {
        restoreRole(response.data.access_token, originalRole || '');
        fetchMyPermissions();
      }
    } catch (err) {
      console.error('[NavBar] Failed to restore role:', err);
    }
  };

  const navItems = [
    { key: 'feed', label: 'Feeds', path: '/feeds', icon: Rss },
    { key: 'my-feeds', label: 'My Feeds', path: '/my-feeds', icon: Rss },
    { key: 'upload', label: 'Upload', path: '/document-upload', icon: Upload },
    { key: 'admin', label: 'Admin', path: '/admin', icon: Settings },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link
            href="/feeds"
            className="text-lg font-bold text-foreground hover:text-primary transition-colors"
          >
            Joti
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              if (!hasPageAccess(item.key)) return null;
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right Side - Impersonation Badge Only */}
          <div className="flex items-center gap-2">
            {isImpersonating && (
              <Badge variant="warning" className="flex items-center gap-1">
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
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
