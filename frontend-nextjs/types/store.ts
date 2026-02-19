/**
 * Zustand Store Type Definitions
 */

import { User, Article } from './api';

// ============================================
// AUTH STORE TYPES
// ============================================

export interface CachedPermissions {
  pages: { key: string }[];
  effectiveRole: string | null;
  fetchedAt: number;
}

export interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAdmin: boolean;
  isImpersonating: boolean;
  assumedRole: string | null;
  originalRole: string | null;
  cachedPermissions: CachedPermissions | null;

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  switchRole: (newToken: string, assumedRole: string, originalRole: string) => void;
  restoreRole: (newToken: string, originalRole: string) => void;
  loadImpersonationState: () => void;
  loadAuthState: () => void;
  setPermissions: (pages: { key: string }[], effectiveRole: string | null) => void;
  clearPermissions: () => void;
}

// ============================================
// ARTICLE STORE TYPES
// ============================================

export interface ArticleState {
  // State
  articles: Article[];
  selectedArticle: Article | null;
  loading: boolean;
  total: number;

  // Actions
  setArticles: (articles: Article[], total: number) => void;
  setSelectedArticle: (article: Article | null) => void;
  setLoading: (loading: boolean) => void;
  addArticle: (article: Article) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  removeArticle: (id: string) => void;
  clearArticles: () => void;
}

// ============================================
// UI STATE TYPES (Future Extension)
// ============================================

export interface UIState {
  sidebarCollapsed: boolean;
  viewMode: 'list' | 'card' | 'magazine';
  toggleSidebar: () => void;
  setViewMode: (mode: 'list' | 'card' | 'magazine') => void;
}
