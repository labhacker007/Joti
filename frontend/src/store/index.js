import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAdmin: false,
  
  // Role impersonation state
  isImpersonating: false,
  assumedRole: null,
  originalRole: null,

  setAuth: (user, accessToken, refreshToken) => {
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

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },

  setUser: (user) => set({ user, isAdmin: !!(user && user.role && user.role === 'ADMIN') }),

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
  
  // Role switching for admins
  switchRole: (newToken, assumedRole, originalRole) => {
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
  
  restoreRole: (newToken, originalRole) => {
    localStorage.setItem('accessToken', newToken);
    localStorage.removeItem('impersonationState');
    set({
      accessToken: newToken,
      isImpersonating: false,
      assumedRole: null,
      originalRole: null
    });
  },
  
  // Load impersonation state from localStorage on init
  loadImpersonationState: () => {
    try {
      const saved = localStorage.getItem('impersonationState');
      if (saved) {
        const state = JSON.parse(saved);
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

export const useArticleStore = create((set) => ({
  articles: [],
  selectedArticle: null,
  loading: false,
  total: 0,

  setArticles: (articles, total) => set({ articles, total }),
  setSelectedArticle: (article) => set({ selectedArticle: article }),
  setLoading: (loading) => set({ loading }),
}));
