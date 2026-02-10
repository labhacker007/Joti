import { create } from 'zustand';
import type { AuthState, ArticleState } from '@/types/store';
import type { User, Article } from '@/types/api';

/**
 * Authentication Store
 * Manages user authentication state, tokens, and role impersonation
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // State
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAdmin: false,
  isImpersonating: false,
  assumedRole: null,
  originalRole: null,

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => {
    const adminFlag = !!(user && user.role && user.role === 'ADMIN');
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({
      user,
      accessToken,
      refreshToken,
      isAdmin: adminFlag,
      // Reset impersonation on new auth
      isImpersonating: false,
      assumedRole: null,
      originalRole: null
    });
  },

  setTokens: (accessToken: string, refreshToken?: string) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, ...(refreshToken && { refreshToken }) });
  },

  setUser: (user: User) => {
    const isAdmin = !!(user && user.role && user.role === 'ADMIN');
    set({ user, isAdmin });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('impersonationState');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAdmin: false,
      isImpersonating: false,
      assumedRole: null,
      originalRole: null
    });
  },

  switchRole: (newToken: string, assumedRole: string, originalRole: string) => {
    localStorage.setItem('accessToken', newToken);
    localStorage.setItem('impersonationState', JSON.stringify({
      isImpersonating: true,
      assumedRole,
      originalRole
    }));
    set({
      accessToken: newToken,
      isImpersonating: true,
      assumedRole,
      originalRole
    });
  },

  restoreRole: (newToken: string, originalRole: string) => {
    localStorage.setItem('accessToken', newToken);
    localStorage.removeItem('impersonationState');
    set({
      accessToken: newToken,
      isImpersonating: false,
      assumedRole: null,
      originalRole: null
    });
  },

  loadImpersonationState: () => {
    try {
      const saved = localStorage.getItem('impersonationState');
      if (saved) {
        const state = JSON.parse(saved) as {
          isImpersonating: boolean;
          assumedRole: string;
          originalRole: string;
        };
        set({
          isImpersonating: state.isImpersonating,
          assumedRole: state.assumedRole,
          originalRole: state.originalRole
        });
      }
    } catch (e) {
      console.error('Failed to load impersonation state:', e);
    }
  }
}));

/**
 * Article Store
 * Manages article list state and selection
 */
export const useArticleStore = create<ArticleState>((set) => ({
  // State
  articles: [],
  selectedArticle: null,
  loading: false,
  total: 0,

  // Actions
  setArticles: (articles: Article[], total: number) => set({ articles, total }),

  setSelectedArticle: (article: Article | null) => set({ selectedArticle: article }),

  setLoading: (loading: boolean) => set({ loading }),

  addArticle: (article: Article) => set((state) => ({
    articles: [article, ...state.articles],
    total: state.total + 1
  })),

  updateArticle: (id: string, updates: Partial<Article>) => set((state) => ({
    articles: state.articles.map(article =>
      article.id === id ? { ...article, ...updates } : article
    ),
    selectedArticle: state.selectedArticle?.id === id
      ? { ...state.selectedArticle, ...updates }
      : state.selectedArticle
  })),

  removeArticle: (id: string) => set((state) => ({
    articles: state.articles.filter(article => article.id !== id),
    total: state.total - 1,
    selectedArticle: state.selectedArticle?.id === id ? null : state.selectedArticle
  })),

  clearArticles: () => set({ articles: [], total: 0, selectedArticle: null })
}));
