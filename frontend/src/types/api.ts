/**
 * API Type Definitions
 * All API request/response types for the Joti backend
 */

// ============================================
// USER & AUTHENTICATION TYPES
// ============================================

export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER' | 'CONTRIBUTOR';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  additional_roles: UserRole[];
  custom_permissions?: {
    grant: string[];
    deny: string[];
  };
  is_active: boolean;
  is_saml_user?: boolean;
  oauth_provider?: 'google' | 'microsoft' | null;
  oauth_email?: string;
  otp_enabled?: boolean;
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserCreateRequest {
  email: string;
  username: string;
  password: string;
  full_name: string;
  role: UserRole;
  is_active?: boolean;
}

export interface UserUpdateRequest {
  email?: string;
  username?: string;
  full_name?: string;
  role?: UserRole;
  additional_roles?: UserRole[];
  is_active?: boolean;
  password?: string; // Optional password reset
}

export interface UserResponse extends User {}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// ============================================
// ARTICLE TYPES
// ============================================

export type ArticleStatus = 'NEW' | 'READ' | 'STARRED' | 'IN_ANALYSIS' | 'ARCHIVED';
export type ArticlePriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Article {
  id: string;
  title: string;
  raw_content?: string;
  normalized_content?: string;
  summary?: string;
  url: string;
  image_url?: string;
  published_at: string;
  ingested_at?: string;
  created_at: string;
  updated_at?: string;

  source_id: string;
  source_name?: string;

  status: ArticleStatus;
  is_high_priority: boolean;
  is_bookmarked?: boolean;
  is_read?: boolean;

  assigned_analyst_id?: string;
  reviewed_by_id?: string;
  reviewed_at?: string;
  analyzed_by_id?: string;
  analyzed_at?: string;

  executive_summary?: string;
  technical_summary?: string;
  genai_analysis_remarks?: string;

  watchlist_match_keywords?: string[];
  hunt_generated_count?: number;
  hunt_launched_count?: number;
  last_hunt_generated_at?: string;
  last_hunt_launched_at?: string;

  iocs?: IOC[];
  ttps?: TTP[];
}

export interface IOC {
  type: string;
  value: string;
  confidence?: number;
}

export interface TTP {
  technique_id: string;
  technique_name: string;
  tactic?: string;
}

export interface PaginatedArticles {
  articles?: Article[];
  items?: Article[];
  total: number;
  page: number;
  page_size: number;
}

export interface ArticleSummaryResponse {
  executive_summary?: string;
  technical_summary?: string;
  model_used?: string;
  iocs?: IOC[];
  ttps?: TTP[];
}

// ============================================
// SOURCE TYPES
// ============================================

export type SourceType = 'rss' | 'atom' | 'api';

export interface Source {
  id: string;
  name: string;
  description?: string;
  url: string;
  feed_type: SourceType;
  is_active: boolean;
  high_fidelity?: boolean;

  headers?: Record<string, string>;
  last_fetched?: string;
  next_fetch?: string;
  fetch_error?: string;

  refresh_interval_minutes?: number;
  auto_fetch_enabled?: boolean;

  created_at: string;
  updated_at?: string;

  article_count?: number;
}

export interface SourceStats {
  total_sources: number;
  active_sources: number;
  inactive_sources: number;
  total_articles: number;
  articles_by_source: Record<string, number>;
  recent_ingests: Array<{
    source_id: string;
    source_name: string;
    timestamp: string;
    article_count: number;
    success: boolean;
  }>;
}

export interface SourceCreateRequest {
  name: string;
  url: string;
  feed_type: SourceType;
  description?: string;
  is_active?: boolean;
  refresh_interval_minutes?: number;
}

export interface SourceUpdateRequest extends Partial<SourceCreateRequest> {}

// ============================================
// WATCHLIST TYPES
// ============================================

export type WatchlistSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface WatchlistKeyword {
  id: string;
  keyword: string;
  severity?: WatchlistSeverity;
  is_active: boolean;
  match_count?: number;
  created_at: string;
  updated_at?: string;
  created_by_id?: string;
  is_global?: boolean;
}

export interface WatchlistCreateRequest {
  keyword: string;
  severity?: WatchlistSeverity;
  is_active?: boolean;
}

// ============================================
// CUSTOM FEEDS TYPES
// ============================================

export interface CustomFeed {
  id: string;
  user_id: string;
  name: string;
  url: string;
  category_id?: string;
  category_name?: string;
  refresh_interval?: number;
  is_active: boolean;
  last_fetched?: string;
  fetch_error?: string;
  article_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface CustomFeedCreateRequest {
  name: string;
  url: string;
  category_id?: string;
  refresh_interval?: number;
  is_active?: boolean;
}

export interface Category {
  id: string;
  name: string;
  user_id: string;
  order?: number;
  created_at: string;
}

// ============================================
// RBAC & PERMISSIONS TYPES
// ============================================

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface PageAccess {
  key: string;
  name: string;
  path: string;
  permissions: string[];
  has_access: boolean;
}

export interface UserPermissions {
  effective_role: string;
  is_impersonating: boolean;
  accessible_pages: PageAccess[];
  all_permissions: string[];
}

export interface RBACMatrix {
  roles: Role[];
  permissions: Permission[];
  role_permissions: Record<string, string[]>;
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export interface AuditLog {
  id: string;
  user_id: string;
  username?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  status?: 'SUCCESS' | 'FAILURE';
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================
// ADMIN / SYSTEM TYPES
// ============================================

export interface SystemSettings {
  genai_provider?: string;
  ollama_base_url?: string;
  ollama_model?: string;
  enable_automation_scheduler?: boolean;
  feed_check_interval_minutes?: number;
  feed_timeout_seconds?: number;
  [key: string]: any;
}

export interface SystemStats {
  total_users: number;
  active_users: number;
  total_sources: number;
  active_sources: number;
  total_articles: number;
  articles_today: number;
  articles_this_week: number;
}

export interface GenAIModel {
  id: string;
  name: string;
  provider: string;
  is_available: boolean;
  is_primary?: boolean;
}

export interface GenAIStatus {
  provider: string;
  is_configured: boolean;
  is_available: boolean;
  models: GenAIModel[];
  error?: string;
}

// ============================================
// GENERIC API RESPONSE WRAPPER
// ============================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

export interface ApiError {
  detail: string | Record<string, string[]> | string[];
  msg?: string;
  message?: string;
  status?: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface TimeRangeParams {
  start_date?: string;
  end_date?: string;
}

// ============================================
// ADMIN & CONFIGURATION TYPES
// ============================================

export type ConfigValueType = 'str' | 'int' | 'bool' | 'secret';
export type ConfigCategory = 'genai' | 'hunt_connectors' | 'notifications' | 'authentication' | 'automation' | 'data_retention';

export interface ConfigurationItem {
  key: string;
  value: string;
  value_type: ConfigValueType;
  category: ConfigCategory;
  is_sensitive: boolean;
  description?: string;
  is_configured: boolean;
}

export interface ConfigurationsByCategory {
  [category: string]: ConfigurationItem[];
}

export interface ConfigurationSaveRequest {
  configurations: Array<{
    category: string;
    key: string;
    value: string;
    value_type: ConfigValueType;
    is_sensitive: boolean;
  }>;
}

export interface ConfigurationSaveResponse {
  saved_count: number;
  message: string;
}

export interface ConfigTestResult {
  name: string;
  status: 'success' | 'failed';
  error?: string;
  details?: string;
}

export interface ConfigTestResponse {
  category: string;
  tests: ConfigTestResult[];
}

export interface SystemStats {
  total_articles: number;
  active_sources: number;
  total_users: number;
  recent_activity?: any[];
}
