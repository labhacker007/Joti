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

  // Request interceptor - attach auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            // No refresh token - redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(error);
          }

          // Attempt to refresh token
          const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const newAccessToken = refreshResponse.data.access_token;
          localStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          // Retry original request with new token
          return client(originalRequest);
        } catch (refreshError) {
          // Refresh failed - redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
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
    return post('/users', userData);
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
      ...(filters && { filter: JSON.stringify(filters) }),
    });
    return get(`/articles?${params}`);
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
   * Generate article summary
   */
  generateSummary: async (id: string) => {
    return post(`/articles/${id}/generate-summary`, {});
  },

  /**
   * Bulk update articles
   */
  bulkUpdate: async (articleIds: string[], updates: any) => {
    return post('/articles/bulk-update', { ids: articleIds, updates });
  },
};

// ============================================
// SOURCES API
// ============================================

export const sourcesAPI = {
  /**
   * Get all sources
   */
  getSources: async (page = 1, pageSize = 10) => {
    return get(`/sources?page=${page}&page_size=${pageSize}`);
  },

  /**
   * Get source by ID
   */
  getSource: async (id: string) => {
    return get(`/sources/${id}`);
  },

  /**
   * Create new source
   */
  createSource: async (data: any) => {
    return post('/sources', data);
  },

  /**
   * Update source
   */
  updateSource: async (id: string, data: any) => {
    return put(`/sources/${id}`, data);
  },

  /**
   * Delete source
   */
  deleteSource: async (id: string) => {
    return del(`/sources/${id}`);
  },

  /**
   * Get source statistics
   */
  getStats: async () => {
    return get('/sources/stats');
  },

  /**
   * Trigger source fetch
   */
  triggerFetch: async (id: string) => {
    return post(`/sources/${id}/fetch`, {});
  },
};

// ============================================
// WATCHLIST API
// ============================================

export const watchlistAPI = {
  /**
   * Get all watchlist keywords
   */
  getKeywords: async (page = 1, pageSize = 10) => {
    return get(`/watchlist?page=${page}&page_size=${pageSize}`);
  },

  /**
   * Add keyword to watchlist
   */
  addKeyword: async (data: any) => {
    return post('/watchlist', data);
  },

  /**
   * Update watchlist keyword
   */
  updateKeyword: async (id: string, data: any) => {
    return put(`/watchlist/${id}`, data);
  },

  /**
   * Delete watchlist keyword
   */
  deleteKeyword: async (id: string) => {
    return del(`/watchlist/${id}`);
  },

  /**
   * Get watchlist matches for article
   */
  getMatches: async (articleId: string) => {
    return get(`/articles/${articleId}/watchlist-matches`);
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
    return get(`/audit/logs?${params}`);
  },

  /**
   * Get single audit log
   */
  getLog: async (id: string) => {
    return get(`/audit/logs/${id}`);
  },
};

// ============================================
// ADMIN API
// ============================================

export const adminAPI = {
  /**
   * Get system statistics
   */
  getSystemStats: async () => {
    return get('/admin/stats');
  },

  /**
   * Get system settings
   */
  getSettings: async () => {
    return get('/admin/settings');
  },

  /**
   * Update system settings
   */
  updateSettings: async (settings: any) => {
    return put('/admin/settings', settings);
  },

  /**
   * Get RBAC matrix
   */
  getRBACMatrix: async () => {
    return get('/admin/rbac/matrix');
  },

  /**
   * Update role permissions
   */
  updateRolePermissions: async (roleId: string, permissions: string[]) => {
    return put(`/admin/rbac/roles/${roleId}/permissions`, { permissions });
  },

  /**
   * Get guardrails
   */
  getGuardrails: async () => {
    return get('/admin/guardrails');
  },

  /**
   * Create guardrail
   */
  createGuardrail: async (data: any) => {
    return post('/admin/guardrails', data);
  },

  /**
   * Update guardrail
   */
  updateGuardrail: async (id: string, data: any) => {
    return put(`/admin/guardrails/${id}`, data);
  },

  /**
   * Delete guardrail
   */
  deleteGuardrail: async (id: string) => {
    return del(`/admin/guardrails/${id}`);
  },

  /**
   * Test guardrail
   */
  testGuardrail: async (id: string, input: string) => {
    return post(`/admin/guardrails/${id}/test`, { input_text: input });
  },

  /**
   * Get connectors
   */
  getConnectors: async () => {
    return get('/admin/connectors');
  },

  /**
   * Create connector
   */
  createConnector: async (data: any) => {
    return post('/admin/connectors', data);
  },

  /**
   * Update connector
   */
  updateConnector: async (id: string, data: any) => {
    return put(`/admin/connectors/${id}`, data);
  },

  /**
   * Delete connector
   */
  deleteConnector: async (id: string) => {
    return del(`/admin/connectors/${id}`);
  },

  /**
   * Test connector connection
   */
  testConnector: async (id: string) => {
    return post(`/admin/connectors/${id}/test`, {});
  },

  /**
   * Get GenAI status
   */
  getGenAIStatus: async () => {
    return get('/admin/genai/status');
  },

  /**
   * Test GenAI configuration
   */
  testGenAI: async () => {
    return post('/admin/genai/test', {});
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
