import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store';
import type {
  LoginResponse,
  LoginRequest,
  User,
  PaginatedArticles,
  Article,
  ArticleSummaryResponse,
  Source,
  SourceStats,
  SourceCreateRequest,
  SourceUpdateRequest,
  WatchlistKeyword,
  CustomFeed,
  CustomFeedCreateRequest,
  Category,
  PaginatedAuditLogs,
  AuditLog,
  SystemSettings,
  SystemStats,
  GenAIStatus,
  GenAIModel,
  UserPermissions,
  RBACMatrix,
  Role,
  Permission,
} from '@/types/api';

// API URL configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// REQUEST INTERCEPTOR - JWT Token Injection
// ============================================

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    if (process.env.NODE_ENV === 'development') {
      console.log('[API Request]', config.method?.toUpperCase(), config.url, 'hasToken:', !!accessToken);
    }

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const csrfToken = sessionStorage.getItem('csrf_token');
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR - Logging
// ============================================

client.interceptors.response.use(
  (response: AxiosResponse) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Response OK]', response.config?.url, 'status:', response.status);
    }
    return response;
  },
  (error: AxiosError) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Response ERROR]', error.config?.url, 'status:', error.response?.status, 'message:', error.message);
    }
    return Promise.reject(error);
  }
);

// ============================================
// TOKEN REFRESH INTERCEPTOR
// ============================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const resp = await authAPI.refresh(refreshToken);
        const newAccess = resp.data.access_token;
        setTokens(newAccess, refreshToken);
        processQueue(null, newAccess);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }
        return client(originalRequest);
      } catch (err) {
        processQueue(err as AxiosError, null);
        logout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================

export const authAPI = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>('/auth/login', data),

  register: (email: string, password: string, name?: string) =>
    client.post<LoginResponse>('/auth/register', { email, password, name }),

  refresh: (refreshToken: string) =>
    client.post<{ access_token: string }>('/auth/refresh', { refresh_token: refreshToken }),

  me: () =>
    client.get<User>('/auth/me'),

  logout: () =>
    client.post('/auth/logout'),

  changePassword: (currentPassword: string, newPassword: string) =>
    client.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    }),

  checkSaml: () =>
    client.get<{ enabled: boolean }>('/auth/saml/check'),
};

// ============================================
// USERS API
// ============================================

export const usersAPI = {
  getUsers: (params?: { page?: number; page_size?: number; search?: string }) =>
    client.get<User[]>('/users', { params }),

  getUser: (id: number) =>
    client.get<UserResponse>(`/users/${id}`),

  createUser: (data: UserCreateRequest) =>
    client.post<UserResponse>('/users', data),

  updateUser: (id: number, data: UserUpdateRequest) =>
    client.patch<UserResponse>(`/users/${id}`, data),

  deleteUser: (id: number) =>
    client.delete(`/users/${id}`),

  switchRole: (role: UserRole) =>
    client.post('/users/switch-role', { role }),

  restoreRole: () =>
    client.post('/users/restore-role'),

  getMyPermissions: () =>
    client.get('/users/my-permissions'),

  getAvailableRoles: () =>
    client.get<UserRole[]>('/users/available-roles'),
};

// ============================================
// ARTICLES API
// ============================================

export const articlesAPI = {
  getTriageQueue: (
    page = 1,
    pageSize = 20,
    statusFilter: string | null = null,
    highPriorityOnly = false,
    sourceId: string | null = null
  ) => {
    const params: Record<string, any> = { page, page_size: pageSize };
    if (highPriorityOnly === true) params.high_priority_only = true;
    if (statusFilter) params.status_filter = statusFilter;
    if (sourceId) params.source_id = sourceId;
    return client.get<PaginatedArticles>('/articles/triage', { params });
  },

  getArticle: (id: string) =>
    client.get<Article>(`/articles/${id}`),

  updateStatus: (id: string, status: string) =>
    client.patch<Article>(`/articles/${id}/status`, { status }),

  summarizeArticle: (articleId: string, modelId: string | null = null) =>
    client.post<ArticleSummaryResponse>(`/articles/${articleId}/summarize`, { model_id: modelId }),

  delete: (articleId: string) =>
    client.delete(`/articles/${articleId}`),

  markAsRead: (articleId: string) =>
    client.post(`/articles/${articleId}/read`),

  markAllAsRead: (sourceId: string | null = null) =>
    client.post('/articles/mark-all-read', null, {
      params: sourceId ? { source_id: sourceId } : {}
    }),

  bookmark: (articleId: string) =>
    client.post(`/articles/${articleId}/bookmark`),

  unbookmark: (articleId: string) =>
    client.delete(`/articles/${articleId}/bookmark`),

  getBookmarks: (page = 1, pageSize = 20) =>
    client.get<PaginatedArticles>('/articles/bookmarks', {
      params: { page, page_size: pageSize }
    }),

  exportPdf: (articleId: string) =>
    client.get(`/articles/${articleId}/export/pdf`, { responseType: 'blob' }),

  exportWord: (articleId: string) =>
    client.get(`/articles/${articleId}/export/word`, { responseType: 'blob' }),
};

// ============================================
// SOURCES API
// ============================================

export const sourcesAPI = {
  list: () =>
    client.get<Source[]>('/sources/'),

  get: (id: string) =>
    client.get<Source>(`/sources/${id}`),

  create: (data: SourceCreateRequest) =>
    client.post<Source>('/sources/', data),

  update: (id: string, data: SourceUpdateRequest) =>
    client.patch<Source>(`/sources/${id}`, data),

  delete: (id: string, deleteArticles = false) =>
    client.delete(`/sources/${id}`, {
      params: { delete_articles: deleteArticles }
    }),

  triggerIngest: (id: string) =>
    client.post(`/sources/${id}/ingest`),

  ingestAll: () =>
    client.post('/sources/ingest-all'),

  getStats: (timeRange: string | null = null) =>
    client.get<SourceStats>('/sources/stats/summary', {
      params: timeRange ? { time_range: timeRange } : {}
    }),

  // Default feeds management (admin)
  listDefaultFeeds: () =>
    client.get<Source[]>('/admin/default-feeds/'),

  addDefaultFeed: (sourceId: string) =>
    client.post(`/admin/default-feeds/${sourceId}`),

  removeDefaultFeed: (sourceId: string) =>
    client.delete(`/admin/default-feeds/${sourceId}`),

  // Refresh settings
  getRefreshPresets: () =>
    client.get('/sources/refresh/presets'),

  getSystemRefreshSettings: () =>
    client.get('/sources/refresh/system'),

  updateSystemRefreshSettings: (settings: any) =>
    client.put('/sources/refresh/system', settings),

  getAllSourceRefreshSettings: () =>
    client.get('/sources/refresh/sources'),

  updateSourceRefreshSettings: (sourceId: string, settings: any) =>
    client.put(`/sources/refresh/sources/${sourceId}`, settings),

  getMySourcePreferences: () =>
    client.get('/sources/refresh/my-preferences'),

  updateMySourcePreference: (sourceId: string, preferences: any) =>
    client.put(`/sources/refresh/my-preferences/${sourceId}`, preferences),

  resetMySourcePreference: (sourceId: string) =>
    client.delete(`/sources/refresh/my-preferences/${sourceId}`),

  // Dashboard settings
  getDashboardPresets: () =>
    client.get('/sources/refresh/dashboard/presets'),

  getDashboardSettings: () =>
    client.get('/sources/refresh/dashboard/settings'),

  updateDashboardSettings: (settings: any) =>
    client.put('/sources/refresh/dashboard/settings', settings),

  getMyDashboardPreferences: () =>
    client.get('/sources/refresh/dashboard/my-preferences'),

  updateMyDashboardPreferences: (preferences: any) =>
    client.put('/sources/refresh/dashboard/my-preferences', preferences),

  resetMyDashboardPreferences: () =>
    client.delete('/sources/refresh/dashboard/my-preferences'),
};

// ============================================
// WATCHLIST API (Global - Admin)
// ============================================

export const watchlistAPI = {
  list: () =>
    client.get<WatchlistKeyword[]>('/watchlist/'),

  create: (keyword: string) =>
    client.post<WatchlistKeyword>('/watchlist/', { keyword }),

  delete: (id: string) =>
    client.delete(`/watchlist/${id}`),

  toggle: (id: string, isActive: boolean) =>
    client.patch<WatchlistKeyword>(`/watchlist/${id}`, { is_active: isActive }),

  refresh: () =>
    client.post('/watchlist/refresh'),
};

// ============================================
// USER PERSONAL WATCHLIST API
// ============================================

export const userWatchlistAPI = {
  list: () =>
    client.get<WatchlistKeyword[]>('/users/watchlist/'),

  create: (keyword: string) =>
    client.post<WatchlistKeyword>('/users/watchlist/', { keyword }),

  delete: (id: string) =>
    client.delete(`/users/watchlist/${id}`),

  toggle: (id: string) =>
    client.patch<WatchlistKeyword>(`/users/watchlist/${id}/toggle`),
};

// ============================================
// USER CUSTOM FEEDS API
// ============================================

export const userFeedsAPI = {
  list: (includeInactive = false) =>
    client.get<CustomFeed[]>('/users/feeds/', {
      params: { include_inactive: includeInactive }
    }),

  get: (feedId: string) =>
    client.get<CustomFeed>(`/users/feeds/${feedId}`),

  create: (data: CustomFeedCreateRequest) =>
    client.post<CustomFeed>('/users/feeds/', data),

  update: (feedId: string, data: Partial<CustomFeedCreateRequest>) =>
    client.patch<CustomFeed>(`/users/feeds/${feedId}`, data),

  delete: (feedId: string) =>
    client.delete(`/users/feeds/${feedId}`),

  toggle: (feedId: string) =>
    client.post(`/users/feeds/${feedId}/toggle`),

  ingest: (feedId: string) =>
    client.post(`/users/feeds/${feedId}/ingest`),

  getArticles: (feedId: string, page = 1, limit = 20) =>
    client.get<PaginatedArticles>(`/users/feeds/${feedId}/articles`, {
      params: { page, limit }
    }),

  validateUrl: (url: string) =>
    client.post<{ valid: boolean; error?: string }>('/users/feeds/validate-url', null, {
      params: { url }
    }),
};

// ============================================
// USER CATEGORIES API
// ============================================

export const userCategoriesAPI = {
  list: () =>
    client.get<Category[]>('/users/categories/'),

  create: (data: { name: string }) =>
    client.post<Category>('/users/categories/', data),

  update: (id: string, data: { name: string }) =>
    client.patch<Category>(`/users/categories/${id}`, data),

  delete: (id: string) =>
    client.delete(`/users/categories/${id}`),

  reorder: (categoryIds: string[]) =>
    client.post('/users/categories/reorder', { category_ids: categoryIds }),
};

// ============================================
// AUDIT LOGS API
// ============================================

export const auditAPI = {
  list: (page = 1, pageSize = 50, filters: Record<string, any> = {}) =>
    client.get<PaginatedAuditLogs>('/audit/', {
      params: { page, page_size: pageSize, ...filters }
    }),

  get: (id: string) =>
    client.get<AuditLog>(`/audit/${id}`),
};

// ============================================
// ADMIN API
// ============================================

export const adminAPI = {
  // Generic methods
  get: (url: string, config = {}) =>
    client.get(url, config),

  post: (url: string, data?: any, config = {}) =>
    client.post(url, data, config),

  patch: (url: string, data?: any, config = {}) =>
    client.patch(url, data, config),

  delete: (url: string, config = {}) =>
    client.delete(url, config),

  // Specific methods
  getSettings: () =>
    client.get<SystemSettings>('/admin/settings'),

  getStats: () =>
    client.get<SystemStats>('/admin/stats'),

  getHealth: () =>
    client.get<{ status: string }>('/admin/health'),

  getAuditSummary: (days = 7) =>
    client.get(`/admin/audit-summary?days=${days}`),

  // GenAI model management
  getGenaiStatus: () =>
    client.get<GenAIStatus>('/admin/genai/status'),

  getAvailableModels: () =>
    client.get<GenAIModel[]>('/admin/genai/models'),

  testGenAI: (request: { prompt: string; model_id?: string }) =>
    client.post('/admin/genai/test', request),

  // Ollama management
  getOllamaStatus: () =>
    client.get('/admin/genai/ollama/status'),

  setupOllama: (url: string, model: string, setAsPrimary = true) =>
    client.post('/admin/genai/ollama/setup', {
      url,
      model,
      set_as_primary: setAsPrimary
    }),

  pullOllamaModel: (modelName: string) =>
    client.post(`/admin/genai/ollama/pull-model?model_name=${modelName}`),

  // GenAI Functions
  listFunctions: () =>
    client.get('/admin/genai-functions/'),

  createFunction: (data: any) =>
    client.post('/admin/genai-functions/', data),

  updateFunction: (id: string, data: any) =>
    client.patch(`/admin/genai-functions/${id}`, data),

  deleteFunction: (id: string) =>
    client.delete(`/admin/genai-functions/${id}`),

  // Prompt Templates
  listPrompts: () =>
    client.get('/admin/prompts/'),

  createPrompt: (data: any) =>
    client.post('/admin/prompts/', data),

  updatePrompt: (id: string, data: any) =>
    client.patch(`/admin/prompts/${id}`, data),

  deletePrompt: (id: string) =>
    client.delete(`/admin/prompts/${id}`),

  renderPrompt: (id: string, variables: Record<string, any>) =>
    client.post(`/admin/prompts/${id}/render`, { variables }),

  // Guardrails
  listGuardrails: () =>
    client.get('/admin/genai-guardrails/'),

  getGuardrailTypes: () =>
    client.get('/admin/genai-guardrails/types'),

  createGuardrail: (data: any) =>
    client.post('/admin/genai-guardrails/', data),

  updateGuardrail: (id: string, data: any) =>
    client.patch(`/admin/genai-guardrails/${id}`, data),

  deleteGuardrail: (id: string) =>
    client.delete(`/admin/genai-guardrails/${id}`),

  testGuardrail: (id: string, input: string) =>
    client.post(`/admin/genai-guardrails/${id}/test`, { input_text: input }),

  assignGuardrailToPrompt: (promptId: string, guardrailId: string, order: number) =>
    client.post(`/admin/prompts/${promptId}/guardrails`, {
      guardrail_id: guardrailId,
      execution_order: order
    }),

  removeGuardrailFromPrompt: (promptId: string, guardrailId: string) =>
    client.delete(`/admin/prompts/${promptId}/guardrails/${guardrailId}`),
};


// ============================================
// RBAC API (Admin)
// ============================================

export const rbacAPI = {
  getPermissions: () =>
    client.get<Permission[]>('/admin/rbac/permissions'),

  getRoles: () =>
    client.get<Role[]>('/admin/rbac/roles'),

  getMatrix: () =>
    client.get<RBACMatrix>('/admin/rbac/matrix'),

  getRolePermissions: (role: string) =>
    client.get(`/admin/rbac/comprehensive/role/${role}`),

  updateRolePermissions: (role: string, permissions: string[]) =>
    client.put(`/admin/rbac/comprehensive/role/${role}`, { permissions }),

  getUserPermissions: (userId: string) =>
    client.get(`/admin/rbac/users/${userId}/permissions`),

  setUserPermission: (userId: string, permission: string, granted: boolean, reason: string | null = null) =>
    client.post(`/admin/rbac/users/${userId}/permissions`, {
      permission,
      granted,
      reason
    }),

  removeUserPermission: (userId: string, permission: string) =>
    client.delete(`/admin/rbac/users/${userId}/permissions/${permission}`),

  getPageDefinitions: () =>
    client.get('/admin/rbac/pages'),

  getRolePageAccess: (role: string) =>
    client.get(`/admin/rbac/pages/role/${role}`),

  updatePageAccess: (pageKey: string, role: string, permissions: string[]) =>
    client.put(`/admin/rbac/pages/${pageKey}/role/${role}`, { permissions }),
};

export default client;
