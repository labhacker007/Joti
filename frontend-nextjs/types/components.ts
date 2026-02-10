/**
 * Component Prop Types
 */

import { ReactNode } from 'react';

// ============================================
// THEME CONTEXT TYPES
// ============================================

export type ThemeName = 'midnight' | 'daylight' | 'command-center' | 'aurora' | 'red-alert' | 'matrix';

export interface ThemeOption {
  emoji: string;
  label: string;
}

export interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: string) => void;
  cycleTheme: () => void;
  themeEmoji: string;
  themeLabel: string;
}

// ============================================
// TIMEZONE CONTEXT TYPES
// ============================================

export interface TimezoneContextValue {
  timezone: string;
  setTimezone: (tz: string) => void;
  formatDateTime: (date: string | Date, format?: string) => string;
  getRelativeTime: (date: string | Date) => string;
  getTimezoneAbbr: () => string;
}

// ============================================
// ANIMATED BACKGROUND TYPES
// ============================================

export interface AnimatedBackgroundProps {
  color: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Orb {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
}

// ============================================
// ROUTE PROTECTION TYPES
// ============================================

export interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requireAdmin?: boolean;
}

// ============================================
// LAYOUT TYPES
// ============================================

export interface NavBarProps {
  className?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

// ============================================
// ARTICLE COMPONENTS TYPES
// ============================================

export interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    summary?: string;
    source_name?: string;
    published_at: string;
    is_high_priority?: boolean;
    is_bookmarked?: boolean;
  };
  onView?: (id: string) => void;
  onBookmark?: (id: string) => void;
  viewMode?: 'list' | 'card' | 'magazine';
}

export interface ArticleFiltersProps {
  onFilterChange: (filters: any) => void;
  sources?: Array<{ id: string; name: string }>;
}

// ============================================
// TABLE TYPES
// ============================================

export interface DataTableProps<TData> {
  data: TData[];
  columns: any[]; // Will be typed as ColumnDef when using TanStack Table
  loading?: boolean;
  onRowClick?: (row: TData) => void;
}

// ============================================
// FORM TYPES
// ============================================

export interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
}

// ============================================
// PERMISSION TYPES
// ============================================

export interface WithPermissionProps {
  children: ReactNode;
  permission?: string;
  fallback?: ReactNode;
}
