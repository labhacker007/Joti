import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Shield,
  Sun,
  Moon
} from 'lucide-react';
import { useAuthStore } from '../store';
import { useTheme, themeOptions, ThemeName } from '../contexts/ThemeContext';
import { usersAPI } from '../api/client.ts';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface AccessiblePage {
  key: string;
  name: string;
}

function NavBar() {
  const {
    user,
    logout,
    accessToken,
    isImpersonating,
    assumedRole,
    originalRole,
    restoreRole
  } = useAuthStore();
  const { theme, setTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [accessiblePages, setAccessiblePages] = useState<AccessiblePage[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Fetch user's accessible pages
  const fetchMyPermissions = useCallback(async () => {
    if (!accessToken) {
      setAccessiblePages([]);
      setPermissionsLoading(false);
      return;
    }

    try {
      setPermissionsLoading(true);
      const response = await usersAPI.getMyPermissions();
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

  // Check if user has access to a page
  const hasPageAccess = useCallback((pageKey: string): boolean => {
    if (permissionsLoading) return false;
    if (accessiblePages.length > 0) {
      return accessiblePages.some(p => p.key === pageKey);
    }
    if (!isImpersonating && user?.role === 'ADMIN') {
      return true;
    }
    return false;
  }, [accessiblePages, permissionsLoading, isImpersonating, user?.role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRestoreRole = () => {
    restoreRole();
    fetchMyPermissions();
  };

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { key: 'feed', label: 'News', path: '/news', icon: FileText },
    { key: 'profile', label: 'Profile', path: '/profile', icon: User },
    { key: 'admin', label: 'Admin', path: '/admin', icon: Settings },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link to="/news" className="text-lg font-bold text-foreground hover:text-primary transition-colors">
            Joti
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              if (!hasPageAccess(item.key)) return null;
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Role Impersonation Badge */}
            {isImpersonating && (
              <Badge variant="warning" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                As {assumedRole}
                <button
                  onClick={handleRestoreRole}
                  className="ml-1 hover:text-white"
                  title="Restore original role"
                >
                  ×
                </button>
              </Badge>
            )}

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? 'daylight' : 'midnight')}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground hidden sm:inline">
                {user?.username || 'User'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
