import { useState, useEffect, useContext, createContext } from 'react';
import { useAuthStore } from '../store';

// Create permissions context
const PermissionsContext = createContext({
  permissions: [],
  pageAccess: {},
  loading: true,
  hasPermission: () => false,
  hasPageAccess: () => false,
  hasPagePermission: () => false,
  refresh: () => {}
});

/**
 * Provider component that wraps the app and provides permissions
 */
export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([]);
  const [pageAccess, setPageAccess] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      // Use the /users/my-permissions endpoint which respects impersonation
      const { usersAPI } = await import('../api/client');
      
      const response = await usersAPI.getMyPermissions();
      const data = response.data;
      
      if (!data) {
        setPermissions([]);
        setPageAccess({});
        setLoading(false);
        return;
      }

      // Set permissions from API response
      setPermissions(data.all_permissions || []);

      // Build page access map from accessible_pages
      const accessMap = {};
      (data.accessible_pages || []).forEach(page => {
        accessMap[page.key] = {
          has_access: true,
          permissions: page.permissions || []
        };
      });
      setPageAccess(accessMap);
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch permissions', err);
      setPermissions([]);
      setPageAccess({});
      setLoading(false);
    }
  };

  // Get impersonation state to trigger re-fetch when role changes
  const { isImpersonating, assumedRole, accessToken } = useAuthStore();
  
  useEffect(() => {
    if (accessToken) {
      fetchPermissions();
    }
  }, [accessToken, isImpersonating, assumedRole]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  /**
   * Check if user has access to a page
   */
  const hasPageAccess = (pageKey) => {
    return pageAccess[pageKey]?.has_access || false;
  };

  /**
   * Check if user has a specific permission on a page
   */
  const hasPagePermission = (pageKey, permission) => {
    const page = pageAccess[pageKey];
    if (!page || !page.has_access) return false;
    return page.permissions.includes(permission);
  };

  const value = {
    permissions,
    pageAccess,
    loading,
    hasPermission,
    hasPageAccess,
    hasPagePermission,
    refresh: fetchPermissions
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

/**
 * Hook to use permissions in components
 */
export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

/**
 * Hook to check if user has permission
 */
export const useHasPermission = (permission) => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
};

/**
 * Hook to check page access
 */
export const useHasPageAccess = (pageKey) => {
  const { hasPageAccess } = usePermissions();
  return hasPageAccess(pageKey);
};

/**
 * Hook to check page permission
 */
export const useHasPagePermission = (pageKey, permission) => {
  const { hasPagePermission } = usePermissions();
  return hasPagePermission(pageKey, permission);
};

export default usePermissions;
