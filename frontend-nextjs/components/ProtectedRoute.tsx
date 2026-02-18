'use client';

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/index';
import { usersAPI } from '../api/client';
import { Spinner } from './ui/spinner';

// Map route paths to page keys - defined outside component to avoid re-creation
const PATH_TO_PAGE_KEY: Record<string, string> = {
  '/feeds': 'feed',
  '/dashboard': 'dashboard',
  '/news': 'feed',
  '/sources': 'sources',
  '/watchlist': 'watchlist',
  '/profile': 'profile',
  '/audit': 'audit',
  '/admin': 'admin',
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPageKey?: string | null;
  requiredRole?: string | string[] | null;
}

/**
 * ProtectedRoute - Enforces role-based access control on routes.
 *
 * This component checks the user's permissions via the API (which respects impersonation)
 * and blocks access to pages the user doesn't have permission for.
 *
 * Props:
 *   - requiredPageKey: string - The page key to check access for (e.g., 'dashboard', 'feed')
 *   - requiredRole: string | string[] - Legacy: Role(s) that can access this route
 *   - children: React node to render if authorized
 */
function ProtectedRoute({
  children,
  requiredPageKey = null,
  requiredRole = null
}: ProtectedRouteProps): React.JSX.Element {
  const { accessToken, isImpersonating, assumedRole } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState<boolean>(true);
  const [hasAccess, setHasAccess] = useState<boolean>(false);

  const checkPermissions = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setHasAccess(false);
      return;
    }

    try {
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

        console.log('[ProtectedRoute] Access check:', {
          path: pathname,
          pageKey,
          effectiveRole,
          hasAccess: accessGranted,
          accessiblePages: pages.map((p: { key: string }) => p.key)
        });
      }

      // Also check legacy requiredRole if specified
      if (requiredRole && !accessGranted) {
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (effectiveRole && allowedRoles.includes(effectiveRole)) {
          accessGranted = true;
        }
      }

      setHasAccess(accessGranted);
    } catch (err) {
      console.error('[ProtectedRoute] Failed to check permissions:', err);
      // On error, deny access for safety (except to login page)
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [accessToken, requiredPageKey, requiredRole, pathname]);

  useEffect(() => {
    // Reset loading state when impersonation changes
    setLoading(true);
    checkPermissions();
  }, [checkPermissions, isImpersonating, assumedRole]);

  // Not logged in - redirect to login (MUST be first check before rendering loading)
  if (!accessToken) {
    console.log('[ProtectedRoute] No token - redirecting to login');
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
