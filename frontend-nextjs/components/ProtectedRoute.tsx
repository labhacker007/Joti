'use client';

import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/index';
import { Spinner } from './ui/spinner';

// Map route paths to page keys - defined outside component to avoid re-creation
const PATH_TO_PAGE_KEY: Record<string, string> = {
  '/feeds': 'feeds',
  '/my-feeds': 'feeds',
  '/dashboard': 'feeds',
  '/news': 'feeds',
  '/sources': 'sources',
  '/watchlist': 'watchlist',
  '/intelligence': 'feeds',
  '/profile': 'feeds',  // profile is accessible to all authenticated users
  '/document-upload': 'feeds',
  '/analytics': 'feeds',
  '/audit': 'audit',
  '/admin': 'admin',
  '/admin/sources': 'admin',
  '/admin/users': 'admin',
  '/admin/rbac': 'admin',
  '/admin/connectors': 'admin',
  '/admin/genai': 'admin',
  '/admin/guardrails': 'admin',
  '/admin/analytics': 'admin',
  '/admin/audit': 'admin',
  '/admin/monitoring': 'admin',
  '/admin/settings': 'admin',
};

// Permission cache TTL: 5 minutes
const PERMISSION_CACHE_TTL = 5 * 60 * 1000;

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
  const {
    accessToken, user, isImpersonating, assumedRole, logout,
    cachedPermissions, setPermissions, clearPermissions, setUser
  } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState<boolean>(true);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const fetchingRef = useRef(false);

  // Only run on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check access using cached or fresh permissions
  const checkAccess = useCallback((
    pages: { key: string }[],
    effectiveRole: string | null,
    currentPath: string | null
  ) => {
    const pageKey = requiredPageKey || PATH_TO_PAGE_KEY[(currentPath ?? '') as keyof typeof PATH_TO_PAGE_KEY];

    if (!pageKey) {
      // Unknown page - allow access if user is authenticated
      return true;
    }

    let accessGranted = pages.some((p) => p.key === pageKey);

    // Also check legacy requiredRole if specified
    if (requiredRole && !accessGranted) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (effectiveRole && allowedRoles.includes(effectiveRole)) {
        accessGranted = true;
      }
    }

    return accessGranted;
  }, [requiredPageKey, requiredRole]);

  // Fetch permissions from API (only when cache is missing or stale)
  const fetchPermissions = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { usersAPI } = await import('../api/client');

      // If user object is missing (e.g. fresh tab, page reload), hydrate it
      const permissionsPromise = usersAPI.getMyPermissions();
      const profilePromise = !user ? usersAPI.getProfile() : Promise.resolve(null);

      const [permResponse, profileResponse] = await Promise.all([permissionsPromise, profilePromise]);

      const permData = (permResponse as any).data || permResponse;
      const pages = permData?.accessible_pages || [];
      const effectiveRole = permData?.effective_role || null;

      // Hydrate user object if it was missing
      if (profileResponse) {
        const profileData = (profileResponse as any).data || profileResponse;
        if (profileData && profileData.id) {
          setUser(profileData);
        }
      }

      // Cache permissions in store
      setPermissions(pages, effectiveRole);

      // Check access for current path
      const granted = checkAccess(pages, effectiveRole, pathname);
      setHasAccess(granted);
    } catch (err: any) {
      console.error('[ProtectedRoute] Failed to check permissions:', err);
      const status = err?.response?.status || err?.status;
      if (status === 401 || status === 403) {
        logout();
        router.replace('/login');
        return;
      }
      setHasAccess(false);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [accessToken, user, setPermissions, setUser, checkAccess, pathname, logout, router]);

  // Main permission check effect - runs on mount and when auth state changes
  useEffect(() => {
    // Wait for client-side mount before doing anything — avoids a race where
    // loading & hasAccess get set to false before the permissions fetch starts,
    // which would trigger an immediate redirect to /unauthorized.
    if (!mounted) return;

    if (!accessToken) {
      setLoading(false);
      setHasAccess(false);
      return;
    }

    // Check if we have valid cached permissions
    if (
      cachedPermissions &&
      (Date.now() - cachedPermissions.fetchedAt) < PERMISSION_CACHE_TTL
    ) {
      // Use cached permissions — instant, no API call
      const granted = checkAccess(cachedPermissions.pages, cachedPermissions.effectiveRole, pathname);
      setHasAccess(granted);
      setLoading(false);
      return;
    }

    // No cache or stale — fetch from API
    setLoading(true);
    fetchPermissions();
  }, [mounted, accessToken, isImpersonating, assumedRole, pathname, cachedPermissions, checkAccess, fetchPermissions]);

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

  // Still checking permissions (only on first load)
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
