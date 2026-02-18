/**
 * API Client
 * Central API communication module for all backend interactions
 * Handles authentication, error handling, and response formatting
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse, ApiError } from '@/types/api';

// Get API base URL from environment or default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Create and configure axios instance with interceptors
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Mutex for token refresh to prevent race conditions
  let refreshPromise: Promise<string> | null = null;

  // Request interceptor - attach auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors and token refresh
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized - attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        if (!refreshToken) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        try {
          // Use shared promise to prevent concurrent refresh requests
          if (!refreshPromise) {
            refreshPromise = (async () => {
              try {
                const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                  refresh_token: refreshToken,
                });
                const newToken = refreshResponse.data.access_token;
                if (typeof window !== 'undefined') localStorage.setItem('accessToken', newToken);
                return newToken;
              } finally {
                refreshPromise = null;
              }
            })();
          }

          const newAccessToken = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          refreshPromise = null;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

/**
 * Error handler to extract meaningful messages from API errors
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;

    if (data?.detail) {
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      if (typeof data.detail === 'object') {
        return Object.values(data.detail).flat().join(', ');
      }
    }

    if (data?.msg) return data.msg;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

/**
 * Make a GET request
 */
export const get = async <T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.get<ApiResponse<T>>(url, config);
  return response.data;
};

/**
 * Make a POST request
 */
export const post = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.post<ApiResponse<T>>(url, data, config);
  return response.data;
};

/**
 * Make a PUT request
 */
export const put = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.put<ApiResponse<T>>(url, data, config);
  return response.data;
};

/**
 * Make a DELETE request
 */
export const del = async <T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.delete<ApiResponse<T>>(url, config);
  return response.data;
};

/**
 * Make a PATCH request
 */
export const patch = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
  return response.data;
};

// ============================================
// USERS API
// ============================================

export const usersAPI = {
  /**
   * Login user with email and password
   */
  login: async (email: string, password: string) => {
    return post('/auth/login', { email, password });
  },

  /**
   * Register new user
   */
  register: async (email: string, username: string, password: string) => {
    return post('/auth/register', { email, username, password });
  },

  /**
   * Get current user's permissions and accessible pages
   */
  getMyPermissions: async () => {
    return get('/users/me/permissions');
  },

  /**
   * Get current user's profile
   */
  getProfile: async () => {
    return get('/users/me');
  },

  /**
   * Update current user's profile
   */
  updateProfile: async (data: any) => {
    return put('/users/me', data);
  },

  /**
   * Change current user's password
   */
  changePassword: async (currentPassword: string, newPassword: string) => {
    return post('/users/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  /**
   * Get all users (admin only)
   */
  getAllUsers: async (page = 1, pageSize = 10) => {
    return get(`/users?page=${page}&page_size=${pageSize}`);
  },

  /**
   * Get user by ID (admin only)
   */
  getUser: async (userId: number) => {
    return get(`/users/${userId}`);
  },

  /**
   * Create new user (admin only)
   */
  createUser: async (userData: any) => {
    return post('/users/', userData);
  },

  /**
   * Update user (admin only)
   */
  updateUser: async (userId: number, userData: any) => {
    return put(`/users/${userId}`, userData);
  },

  /**
   * Delete user (admin only)
   */
  deleteUser: async (userId: number) => {
    return del(`/users/${userId}`);
  },

  /**
   * Assume a user's role (admin impersonation)
   */
  assumeRole: async (userId: number) => {
    return post(`/users/${userId}/assume-role`, {});
  },

  /**
   * Restore original role (after impersonation)
   */
  restoreRole: async () => {
    return post('/users/restore-role', {});
  },

  /**
   * Enable OTP for current user
   */
  enableOTP: async () => {
    return post('/users/me/otp/enable', {});
  },

  /**
   * Verify OTP token
   */
  verifyOTP: async (token: string, code: string) => {
    return post('/users/me/otp/verify', { token, code });
  },

  /**
   * Disable OTP for current user
   */
  disableOTP: async () => {
    return post('/users/me/otp/disable', {});
  },
};

// ============================================
// ARTICLES API
// ============================================

export const articlesAPI = {
  /**
   * Get paginated articles
   */
  getArticles: async (page = 1, pageSize = 10, filters?: any) => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (filters?.status_filter) {
      params.append('status_filter', filters.status_filter);
    }
    if (filters?.source_id) {
      params.append('source_id', filters.source_id.toString());
    }
    if (filters?.severity) {
      params.append('severity', filters.severity);
    }
    if (filters?.threat_category) {
      params.append('threat_category', filters.threat_category);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.unread_only) {
      params.append('unread_only', 'true');
    }
    if (filters?.watchlist_only) {
      params.append('watchlist_only', 'true');
    }
    if (filters?.bookmarked_only) {
      params.append('bookmarked_only', 'true');
    }
    if (filters?.time_range) {
      params.append('time_range', filters.time_range);
    }
    return get(`/articles/?${params}`);
  },

  /**
   * Get article by ID
   */
  getArticle: async (id: string) => {
    return get(`/articles/${id}`);
  },

  /**
   * Update article
   */
  updateArticle: async (id: string, data: any) => {
    return put(`/articles/${id}`, data);
  },

  /**
   * Mark article as read
   */
  markAsRead: async (id: string) => {
    return post(`/articles/${id}/read`, {});
  },

  /**
   * Toggle article bookmark
   */
  toggleBookmark: async (id: string) => {
    return post(`/articles/${id}/bookmark`, {});
  },

  /**
   * Get article summary/analysis
   */
  getSummary: async (id: string) => {
    return get(`/articles/${id}/summary`);
  },

  /**
   * Generate AI summary for article (executive + technical)
   */
  summarizeArticle: async (id: string, modelId?: string) => {
    return post(`/articles/${id}/summarize`, modelId ? { model_id: modelId } : {});
  },

  /**
   * Extract intelligence (IOCs, TTPs) from article
   */
  extractIntelligence: async (id: string) => {
    return post(`/articles/${id}/extract-intelligence`, {});
  },

  /**
   * Get article with full intelligence detail
   */
  getArticleDetail: async (id: string) => {
    return get(`/articles/${id}?include_intel=true`);
  },

  /**
   * Get article counts by category
   */
  getCounts: async () => {
    return get('/articles/counts');
  },

  /**
   * Mark all articles as read
   */
  markAllAsRead: async () => {
    return post('/articles/mark-all-read', {});
  },

  /**
   * Bulk update articles
   */
  bulkUpdate: async (articleIds: string[], updates: any) => {
    return post('/articles/bulk-update', { ids: articleIds, updates });
  },

  /**
   * Get trending articles (public, no auth required)
   */
  getTrending: async () => {
    return get('/articles/trending');
  },
};

// ============================================
// SOURCES API
// ============================================

export const sourcesAPI = {
  getSources: async (page = 1, pageSize = 100) => {
    return get(`/sources/?page=${page}&page_size=${pageSize}`);
  },
  getSource: async (id: string) => {
    return get(`/sources/${id}`);
  },
  createSource: async (data: any) => {
    return post('/sources/', data);
  },
  updateSource: async (id: string, data: any) => {
    return patch(`/sources/${id}`, data);
  },
  deleteSource: async (id: string, deleteArticles = false) => {
    return del(`/sources/${id}?delete_articles=${deleteArticles}`);
  },
  getStats: async () => {
    return get('/sources/stats/summary');
  },
  triggerFetch: async (id: string) => {
    return post(`/sources/${id}/ingest`, {});
  },
  ingestAll: async () => {
    return post('/sources/ingest-all', {});
  },
};

// ============================================
// WATCHLIST API
// ============================================

export const watchlistAPI = {
  getKeywords: async () => {
    return get('/watchlist/');
  },
  addKeyword: async (keyword: string, category?: string) => {
    return post('/watchlist/', { keyword, ...(category ? { category } : {}) });
  },
  updateKeyword: async (id: string, data: any) => {
    return patch(`/watchlist/${id}`, data);
  },
  toggleKeyword: async (id: string, isActive: boolean) => {
    return patch(`/watchlist/${id}`, { is_active: isActive });
  },
  deleteKeyword: async (id: string) => {
    return del(`/watchlist/${id}`);
  },
  refresh: async () => {
    return post('/watchlist/refresh', {});
  },
};

// ============================================
// AUDIT API
// ============================================

export const auditAPI = {
  /**
   * Get audit logs
   */
  getLogs: async (page = 1, pageSize = 10, filters?: any) => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (filters) {
      params.append('filter', JSON.stringify(filters));
    }
    return get(`/audit/?${params}`);
  },

  /**
   * Get single audit log
   */
  getLog: async (id: string) => {
    return get(`/audit/${id}`);
  },
};

// ============================================
// USER FEEDS API
// ============================================

export const userFeedsAPI = {
  /**
   * Get current user's custom feeds
   */
  getMyFeeds: async () => {
    return get('/users/feeds');
  },

  /**
   * Validate feed URL before creating
   */
  validateFeedUrl: async (url: string) => {
    return post('/users/feeds/validate-url', { url });
  },

  /**
   * Create new custom feed for current user
   */
  createFeed: async (data: any) => {
    return post('/users/feeds', data);
  },

  /**
   * Update user's custom feed
   */
  updateFeed: async (feedId: string, data: any) => {
    return put(`/users/feeds/${feedId}`, data);
  },

  /**
   * Delete user's custom feed
   */
  deleteFeed: async (feedId: string) => {
    return del(`/users/feeds/${feedId}`);
  },

  /**
   * Trigger ingestion for user's custom feed
   */
  triggerIngest: async (feedId: string) => {
    return post(`/users/feeds/${feedId}/ingest`, {});
  },

  /**
   * Get articles from user's custom feed
   */
  getFeedArticles: async (feedId: string, page = 1, pageSize = 10) => {
    return get(`/users/feeds/${feedId}/articles?page=${page}&page_size=${pageSize}`);
  },

  /**
   * Upload and ingest custom document (PDF, Word, Excel, HTML, etc.)
   */
  uploadDocument: async (file: File, metadata?: { title?: string; description?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.description) formData.append('description', metadata.description);

    return post('/sources/custom/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    } as any);
  },
};

// ============================================
// ADMIN API
// ============================================

export const adminAPI = {
  getSystemStats: async () => {
    return get('/admin/stats');
  },
  getSettings: async () => {
    return get('/admin/settings');
  },
  updateSettings: async (settings: any) => {
    return put('/admin/settings', settings);
  },
  seedDatabase: async () => {
    return post('/admin/seed-database', {});
  },
  getSchedulerStatus: async () => {
    return get('/admin/scheduler/status');
  },
  runSchedulerJob: async (jobId: string) => {
    return post(`/admin/scheduler/jobs/${jobId}/run`, {});
  },
  getGuardrails: async () => {
    return get('/admin/genai-guardrails/guardrails/global');
  },
  createGuardrail: async (data: any) => {
    return post('/admin/genai-guardrails/guardrails/global', data);
  },
  updateGuardrail: async (id: string, data: any) => {
    return put(`/admin/genai-guardrails/guardrails/global/${id}`, data);
  },
  deleteGuardrail: async (id: string) => {
    return del(`/admin/genai-guardrails/guardrails/global/${id}`);
  },
  testGuardrail: async (id: string, input: string) => {
    return post('/admin/genai-guardrails/test', { input_text: input, guardrail_id: id });
  },
  getRetentionSettings: async () => {
    return get('/admin/retention-settings');
  },
  updateRetentionSettings: async (data: {
    article_retention_days?: number;
    audit_retention_days?: number;
    hunt_retention_days?: number;
  }) => {
    return put('/admin/retention-settings', data);
  },
  exportArticles: async (page = 1, pageSize = 100) => {
    return get(`/admin/export/articles?page=${page}&page_size=${pageSize}`);
  },
  exportIOCs: async (page = 1, pageSize = 100) => {
    return get(`/admin/export/iocs?page=${page}&page_size=${pageSize}`);
  },
  exportTTPs: async (page = 1, pageSize = 100) => {
    return get(`/admin/export/ttps?page=${page}&page_size=${pageSize}`);
  },
  exportAuditLogs: async (page = 1, pageSize = 100) => {
    return get(`/admin/export/audit-logs?page=${page}&page_size=${pageSize}`);
  },
  // GenAI Admin
  getGenAIStatus: async () => {
    return get('/admin/genai/status');
  },
  getGenAIModels: async () => {
    return get('/admin/genai/models');
  },
  updateGenAIConfig: async (config: any) => {
    return put('/admin/genai/config', config);
  },
  testGenAIProvider: async (provider: string) => {
    return post('/admin/genai/test', { provider });
  },
};

// ============================================
// RBAC API
// ============================================

export const rbacAPI = {
  getPermissions: async () => {
    return get('/admin/rbac/permissions');
  },
  getRoles: async () => {
    return get('/admin/rbac/roles');
  },
  getMatrix: async () => {
    return get('/admin/rbac/matrix');
  },
  updateRolePermissions: async (role: string, permissions: string[]) => {
    return put(`/admin/rbac/roles/${role}/permissions`, { permissions });
  },
  getComprehensivePermissions: async () => {
    return get('/admin/rbac/comprehensive/permissions');
  },
  getComprehensiveAreas: async () => {
    return get('/admin/rbac/comprehensive/areas');
  },
  getComprehensiveRole: async (role: string) => {
    return get(`/admin/rbac/comprehensive/role/${role}`);
  },
  updateComprehensiveRole: async (role: string, permissions: any) => {
    return put(`/admin/rbac/comprehensive/role/${role}`, permissions);
  },
  getUserOverrides: async (userId: string) => {
    return get(`/admin/rbac/users/${userId}/permissions`);
  },
  setUserOverride: async (userId: string, data: any) => {
    return post(`/admin/rbac/users/${userId}/permissions`, data);
  },
  removeUserOverride: async (userId: string, permission: string) => {
    return del(`/admin/rbac/users/${userId}/permissions/${permission}`);
  },
  getPages: async () => {
    return get('/admin/rbac/pages');
  },
  getRolePageAccess: async (role: string) => {
    return get(`/admin/rbac/pages/role/${role}`);
  },
  updatePageAccess: async (pageKey: string, role: string, data: any) => {
    return put(`/admin/rbac/pages/${pageKey}/role/${role}`, data);
  },
};

// ============================================
// CONNECTORS API
// ============================================

export const connectorsAPI = {
  getConnectors: async () => {
    return get('/admin/connectors');
  },
  getConfigurations: async (category?: string) => {
    if (category) {
      return get(`/admin/configurations/${category}`);
    }
    return get('/admin/configurations');
  },
  saveConfiguration: async (data: any) => {
    return post('/admin/configuration', data);
  },
  saveConfigurations: async (data: any) => {
    return post('/admin/configurations', data);
  },
  deleteConfiguration: async (category: string, key: string) => {
    return del(`/admin/configurations/${category}/${key}`);
  },
  testConfiguration: async (category: string, data?: any) => {
    return post(`/admin/configurations/test/${category}`, data || {});
  },
};

// ============================================
// GENAI API
// ============================================

export const genaiAPI = {
  getProviderStatus: async () => {
    return get('/genai/providers/status');
  },
  getAvailableModels: async () => {
    return get('/genai/models/available');
  },
  getAdminModels: async () => {
    return get('/genai/admin/models/all');
  },
  getAvailableAdminModels: async () => {
    return get('/genai/admin/models/available');
  },
  registerModel: async (data: any) => {
    return post('/genai/admin/models/register', data);
  },
  toggleModel: async (modelId: string) => {
    return patch(`/genai/admin/models/${modelId}/toggle`, {});
  },
  syncModels: async () => {
    return post('/genai/admin/models/sync', {});
  },
  getConfigs: async () => {
    return get('/genai/admin/configs');
  },
  createConfig: async (data: any) => {
    return post('/genai/admin/configs', data);
  },
  updateConfig: async (configId: string, data: any) => {
    return put(`/genai/admin/configs/${configId}`, data);
  },
  deleteConfig: async (configId: string) => {
    return del(`/genai/admin/configs/${configId}`);
  },
  getQuotas: async () => {
    return get('/genai/admin/quotas');
  },
  getUsageStats: async () => {
    return get('/genai/admin/usage/stats');
  },
  getMyQuota: async () => {
    return get('/genai/my-quota');
  },
  getHelp: async (data: any) => {
    return post('/genai/help', data);
  },
  getSuggestions: async () => {
    return get('/genai/suggestions');
  },
  testGenAI: async () => {
    return get('/articles/test-genai');
  },
  // Function-to-model mapping
  getFunctionConfigs: async () => {
    return get('/admin/genai/functions/');
  },
  updateFunctionConfig: async (functionName: string, data: any) => {
    return patch(`/admin/genai/functions/${functionName}`, data);
  },
  createFunctionConfig: async (data: any) => {
    return post('/admin/genai/functions/', data);
  },
  // Ollama
  getOllamaStatus: async () => {
    return get('/admin/ollama/status');
  },
  getOllamaLibrary: async () => {
    return get('/admin/genai/ollama/library');
  },
  pullOllamaModel: async (modelName: string) => {
    return post(`/admin/genai/ollama/pull-model?model_name=${encodeURIComponent(modelName)}`, {});
  },
  setupOllama: async (data: any) => {
    return post('/admin/genai/ollama/setup', data);
  },
  // Admin model preferences
  setModelPreferences: async (data: { primary_model: string; secondary_model?: string }) => {
    return post('/admin/genai/models/preferences', data);
  },
  // Admin GenAI test
  testProvider: async (provider: string, testType?: string) => {
    return post('/admin/genai/test', { provider, test_type: testType || 'summary' });
  },
};

// ============================================
// ANALYTICS API
// ============================================

export const analyticsAPI = {
  getMyAnalytics: async (timeRange = '30d') => {
    return get(`/analytics/me?time_range=${timeRange}`);
  },
  getUserAnalytics: async (userId: number, timeRange = '30d') => {
    return get(`/analytics/users/${userId}?time_range=${timeRange}`);
  },
  getAdminOverview: async (timeRange = '30d') => {
    return get(`/analytics/admin/overview?time_range=${timeRange}`);
  },
  exportAnalytics: async (params: {
    time_range?: string;
    start_date?: string;
    end_date?: string;
    user_id?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.time_range) query.append('time_range', params.time_range);
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.user_id) query.append('user_id', params.user_id.toString());
    return get(`/analytics/admin/export?${query}`);
  },
};

// ============================================
// GUARDRAILS API
// ============================================

export const guardrailsAPI = {
  list: async (params?: { type?: string; is_active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.type) query.append('guardrail_type', params.type);
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
    const qs = query.toString();
    return get(`/admin/genai-guardrails/${qs ? '?' + qs : ''}`);
  },
  get: async (id: number) => {
    return get(`/admin/genai-guardrails/${id}`);
  },
  create: async (data: {
    name: string;
    description?: string;
    type: string;
    config: Record<string, any>;
    action?: string;
    max_retries?: number;
    is_active?: boolean;
  }) => {
    return post('/admin/genai-guardrails/', data);
  },
  update: async (id: number, data: {
    name?: string;
    description?: string;
    config?: Record<string, any>;
    action?: string;
    max_retries?: number;
    is_active?: boolean;
  }) => {
    return patch(`/admin/genai-guardrails/${id}`, data);
  },
  delete: async (id: number) => {
    return del(`/admin/genai-guardrails/${id}`);
  },
  getTypes: async () => {
    return get('/admin/genai-guardrails/types');
  },
  test: async (data: { guardrail_type: string; config: Record<string, any>; test_input: string }) => {
    return post('/admin/genai-guardrails/test', data);
  },
};

// ============================================
// SKILLS API
// ============================================

export const skillsAPI = {
  list: async () => {
    return get('/admin/genai-skills/');
  },
  get: async (id: string) => {
    return get(`/admin/genai-skills/${id}`);
  },
  create: async (data: {
    name: string;
    description?: string;
    persona?: string;
    instructions: string;
    is_active?: boolean;
  }) => {
    return post('/admin/genai-skills/', data);
  },
  update: async (id: string, data: {
    name?: string;
    description?: string;
    persona?: string;
    instructions?: string;
    is_active?: boolean;
  }) => {
    return patch(`/admin/genai-skills/${id}`, data);
  },
  delete: async (id: string) => {
    return del(`/admin/genai-skills/${id}`);
  },
};

// ============================================
// HEALTH & MISC API
// ============================================

export const miscAPI = {
  /**
   * Check API health
   */
  health: async () => {
    return get('/health');
  },

  /**
   * Get API version
   */
  getVersion: async () => {
    return get('/version');
  },
};
