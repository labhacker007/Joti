'use client';

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/index';
import { Spinner } from './ui/spinner';

// Map route paths to page keys - defined outside component to avoid re-creation
const PATH_TO_PAGE_KEY: Record<string, string> = {
  '/feeds': 'feed',
  '/my-feeds': 'feed',
  '/dashboard': 'dashboard',
  '/news': 'feed',
  '/sources': 'sources',
  '/watchlist': 'watchlist',
  '/profile': 'feed',  // profile is accessible to all authenticated users
  '/document-upload': 'feed',
  '/analytics': 'feed',
  '/audit': 'audit',
  '/admin': 'admin',
  '/admin/sources': 'sources',
  '/admin/users': 'users',
  '/admin/rbac': 'rbac',
  '/admin/connectors': 'connectors',
  '/admin/genai': 'genai',
  '/admin/guardrails': 'guardrails',
  '/admin/analytics': 'admin',
  '/admin/audit': 'audit',
  '/admin/monitoring': 'monitoring',
  '/admin/settings': 'settings',
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPageKey?: string | null;
  requiredRole?: string | string[] | null;
}

function ProtectedRoute({
  children,
  requiredPageKey = null,
  requiredRole = null
}: ProtectedRouteProps): React.JSX.Element {
  const { accessToken, isImpersonating, assumedRole, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState<boolean>(true);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Only run on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  const checkPermissions = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setHasAccess(false);
      return;
    }

    try {
      // Dynamic import to avoid loading axios during SSR
      const { usersAPI } = await import('../api/client');
      const response = await usersAPI.getMyPermissions() as any;
      const pages = response.data?.accessible_pages || [];
      const effectiveRole = response.data?.effective_role;

      // Determine which page key to check
      const pageKey = requiredPageKey || PATH_TO_PAGE_KEY[pathname as keyof typeof PATH_TO_PAGE_KEY];

      let accessGranted = false;

      if (!pageKey) {
        // Unknown page - allow access if user is authenticated
        accessGranted = true;
      } else {
        // Check if user has access to this page
        accessGranted = pages.some((p: { key: string }) => p.key === pageKey);
      }

      // Also check legacy requiredRole if specified
      if (requiredRole && !accessGranted) {
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (effectiveRole && allowedRoles.includes(effectiveRole)) {
          accessGranted = true;
        }
      }

      setHasAccess(accessGranted);
    } catch (err: any) {
      console.error('[ProtectedRoute] Failed to check permissions:', err);
      const status = err?.response?.status || err?.status;
      if (status === 401 || status === 403) {
        // Token is invalid/expired — clear state and redirect to login
        logout();
        router.replace('/login');
        return;
      }
      // Other errors — deny access for safety
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [accessToken, requiredPageKey, requiredRole, pathname, logout, router]);

  useEffect(() => {
    if (!mounted) return;
    setLoading(true);
    checkPermissions();
  }, [mounted, checkPermissions, isImpersonating, assumedRole]);

  // During SSR or before hydration, show loading
  if (!mounted) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!accessToken) {
    router.replace('/login');
    return <></>;
  }

  // Still checking permissions
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <span className="text-sm text-muted-foreground">Checking permissions...</span>
        </div>
      </div>
    );
  }

  // No access - redirect to unauthorized
  if (!hasAccess) {
    router.replace('/unauthorized');
    return <></>;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
