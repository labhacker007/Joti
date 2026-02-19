'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  AlertCircle,
  Calendar,
  User,
  Activity,
  Shield,
  Bot,
  FileText,
  Eye,
  LogIn,
  Settings,
  Plug,
  Rss,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { auditAPI } from '@/api/client';
import { formatRelativeTime, cn } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';

interface AuditLogEntry {
  id: number;
  user_id: number | null;
  user_email: string | null;
  event_type: string;
  resource_type: string | null;
  resource_id: number | null;
  action: string;
  details: Record<string, any>;
  correlation_id: string | null;
  ip_address: string | null;
  created_at: string;
}

// Event type categories for filter UI
const EVENT_CATEGORIES: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; types: string[]; color: string }> = {
  auth: {
    label: 'Authentication',
    icon: LogIn,
    types: ['LOGIN', 'LOGOUT', 'REGISTRATION', 'PASSWORD_CHANGE'],
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  },
  articles: {
    label: 'Articles',
    icon: FileText,
    types: ['ARTICLE_LIFECYCLE', 'BOOKMARK', 'SEARCH'],
    color: 'bg-green-500/10 text-green-600 border-green-500/30',
  },
  intelligence: {
    label: 'Intelligence',
    icon: Eye,
    types: ['EXTRACTION', 'HUNT_TRIGGER'],
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  },
  genai: {
    label: 'GenAI',
    icon: Bot,
    types: ['GENAI_SUMMARIZATION'],
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    types: ['ADMIN_ACTION', 'RBAC_CHANGE', 'SYSTEM_CONFIG', 'CONNECTOR_CONFIG'],
    color: 'bg-red-500/10 text-red-600 border-red-500/30',
  },
  content: {
    label: 'Content',
    icon: Rss,
    types: ['FEED_MANAGEMENT', 'WATCHLIST_CHANGE', 'KNOWLEDGE_BASE', 'REPORT_GENERATION', 'NOTIFICATION', 'SCHEDULED_TASK'],
    color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  },
};

// Map individual event types to their category for badge styling
const EVENT_TYPE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {};
for (const [, cat] of Object.entries(EVENT_CATEGORIES)) {
  for (const t of cat.types) {
    EVENT_TYPE_META[t] = { icon: cat.icon, color: cat.color, label: t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) };
  }
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageSize = 30;
  const totalPages = Math.ceil(totalCount / pageSize);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const filters: any = {};
      if (selectedEventType) {
        filters.event_type = selectedEventType;
      } else if (selectedCategory !== 'ALL') {
        // When a category is selected but no specific type, use the first type in the category
        // The backend filters by a single event_type, so we pass nothing and filter client-side
        // Actually, we'll iterate — but the backend only supports single event_type filter
        // So we'll just not filter on backend when category is selected (let all through)
      }
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      const response = await auditAPI.getLogs(
        currentPage,
        pageSize,
        Object.keys(filters).length > 0 ? filters : undefined
      ) as any;

      const data = response.data || response;
      const fetchedLogs: AuditLogEntry[] = data.logs || [];
      setLogs(fetchedLogs);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to fetch audit logs');
      console.error('Audit logs error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedEventType, selectedCategory]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 400);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedEventType('');
    setCurrentPage(1);
  };

  const handleEventTypeChange = (type: string) => {
    setSelectedEventType(type === selectedEventType ? '' : type);
    setCurrentPage(1);
  };

  // Client-side filter by category (since backend only supports single event_type)
  const filteredLogs = selectedCategory !== 'ALL' && !selectedEventType
    ? logs.filter(l => EVENT_CATEGORIES[selectedCategory]?.types.includes(l.event_type))
    : logs;

  const getEventBadge = (eventType: string) => {
    const meta = EVENT_TYPE_META[eventType];
    if (!meta) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
          <Activity className="w-3 h-3" />
          {eventType}
        </span>
      );
    }
    const Icon = meta.icon;
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border', meta.color)}>
        <Icon className="w-3 h-3" />
        {meta.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System activity and security audit trail
            {totalCount > 0 && <span className="ml-2 text-xs">({totalCount.toLocaleString()} total events)</span>}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm text-red-600">Error Loading Logs</p>
            <p className="text-xs text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user, action, or email..."
            defaultValue={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={() => handleCategoryChange('ALL')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
              selectedCategory === 'ALL'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-transparent hover:bg-accent hover:text-foreground'
            )}
          >
            All Events
          </button>
          {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => {
            const Icon = cat.icon;
            return (
              <button
                key={key}
                onClick={() => handleCategoryChange(key)}
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                  selectedCategory === key
                    ? cat.color + ' border-current'
                    : 'bg-muted text-muted-foreground border-transparent hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Sub-type filters when category is selected */}
        {selectedCategory !== 'ALL' && EVENT_CATEGORIES[selectedCategory] && (
          <div className="flex flex-wrap items-center gap-1.5 pl-6">
            <span className="text-xs text-muted-foreground mr-1">Type:</span>
            {EVENT_CATEGORIES[selectedCategory].types.map((type) => (
              <button
                key={type}
                onClick={() => handleEventTypeChange(type)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-medium transition-colors border',
                  selectedEventType === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                )}
              >
                {type.replace(/_/g, ' ')}
              </button>
            ))}
            {selectedEventType && (
              <button
                onClick={() => { setSelectedEventType(''); setCurrentPage(1); }}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground"
                title="Clear type filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Logs List */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Activity className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No audit logs found</p>
            <p className="text-xs mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="hover:bg-muted/30 transition-colors">
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3"
              >
                {/* Expand icon */}
                <div className="flex-shrink-0">
                  {expandedId === log.id ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Event type badge */}
                <div className="flex-shrink-0 w-36">
                  {getEventBadge(log.event_type)}
                </div>

                {/* Action text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{log.action}</p>
                </div>

                {/* User */}
                <div className="flex-shrink-0 w-40 hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span className="truncate">{log.user_email || 'System'}</span>
                </div>

                {/* Time */}
                <div className="flex-shrink-0 w-28 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(log.created_at)}</span>
                </div>
              </button>

              {/* Expanded details */}
              {expandedId === log.id && (
                <div className="px-4 pb-3 pl-11 space-y-2">
                  <div className="bg-background border border-border rounded-lg p-3 text-xs space-y-1.5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <span className="text-muted-foreground">Event ID:</span>
                        <span className="ml-1 text-foreground font-mono">{log.id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">User:</span>
                        <span className="ml-1 text-foreground">{log.user_email || 'System'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IP:</span>
                        <span className="ml-1 text-foreground font-mono">{log.ip_address || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span>
                        <span className="ml-1 text-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {log.resource_type && (
                      <div>
                        <span className="text-muted-foreground">Resource:</span>
                        <span className="ml-1 text-foreground">
                          {log.resource_type}{log.resource_id ? ` #${log.resource_id}` : ''}
                        </span>
                      </div>
                    )}
                    {log.correlation_id && (
                      <div>
                        <span className="text-muted-foreground">Correlation ID:</span>
                        <span className="ml-1 text-foreground font-mono text-[11px]">{log.correlation_id}</span>
                      </div>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div>
                        <span className="text-muted-foreground block mb-1">Details:</span>
                        <pre className="bg-muted/50 rounded p-2 text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      )}
    </div>
  );
}
