'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Users,
  Rss,
  BookOpen,
  Shield,
  Brain,
  AlertTriangle,
  Download,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Eye,
  Bookmark,
  Clock,
} from 'lucide-react';
import { analyticsAPI, usersAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';

interface AdminSummary {
  total_articles: number;
  total_sources: number;
  total_iocs: number;
  total_ttps: number;
  watchlist_matches: number;
  total_users: number;
}

interface UserStat {
  user_id: number;
  username: string;
  email: string;
  role: string;
  articles_read: number;
  bookmarks: number;
}

interface SourceBreakdown {
  name: string;
  count: number;
}

interface DailyCount {
  date: string;
  count: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
}

interface AdminOverviewData {
  summary: AdminSummary;
  user_stats: UserStat[];
  source_breakdown: SourceBreakdown[];
  daily_counts: DailyCount[];
  status_breakdown: StatusBreakdown[];
  time_range: string;
}

interface ExportRow {
  article_id: number;
  title: string;
  source: string;
  status: string;
  published_at: string | null;
  ingested_at: string | null;
  is_high_priority: boolean;
  watchlist_keywords: string;
  ioc_count: number;
  ttp_count: number;
  has_summary: boolean;
  is_read: boolean | null;
  url: string;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30d');

  // Export state
  const [showExport, setShowExport] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportUserId, setExportUserId] = useState<number | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportData, setExportData] = useState<ExportRow[] | null>(null);

  // User filter for main view
  const [userSearch, setUserSearch] = useState('');
  const [sortField, setSortField] = useState<'articles_read' | 'bookmarks' | 'username'>('articles_read');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Per-user detail view
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, [timeRange]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const response = (await analyticsAPI.getAdminOverview(timeRange)) as any;
      setData(response.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (userId: number) => {
    try {
      setUserDetailLoading(true);
      setSelectedUserId(userId);
      const response = (await analyticsAPI.getUserAnalytics(userId, timeRange)) as any;
      setUserDetail(response.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      setError('');
      const params: any = {};
      if (exportStartDate && exportEndDate) {
        params.start_date = exportStartDate;
        params.end_date = exportEndDate;
      } else {
        params.time_range = timeRange;
      }
      if (exportUserId) params.user_id = exportUserId;

      const response = (await analyticsAPI.exportAnalytics(params)) as any;
      setExportData(response.data?.rows || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setExportLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!exportData) return;
    const headers = [
      'Article ID', 'Title', 'Source', 'Status', 'Published', 'Ingested',
      'High Priority', 'Watchlist Keywords', 'IOC Count', 'TTP Count',
      'Has Summary', 'Is Read', 'URL',
    ];
    const rows = exportData.map((r) => [
      r.article_id,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.source || '').replace(/"/g, '""')}"`,
      r.status,
      r.published_at || '',
      r.ingested_at || '',
      r.is_high_priority ? 'Yes' : 'No',
      `"${r.watchlist_keywords}"`,
      r.ioc_count,
      r.ttp_count,
      r.has_summary ? 'Yes' : 'No',
      r.is_read === null ? '' : r.is_read ? 'Yes' : 'No',
      r.url || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `joti-analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredUsers = data?.user_stats
    ?.filter((u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    }) || [];

  const maxDailyCount = data?.daily_counts?.length
    ? Math.max(...data.daily_counts.map((d) => d.count), 1)
    : 1;

  const maxSourceCount = data?.source_breakdown?.length
    ? Math.max(...data.source_breakdown.map((s) => s.count), 1)
    : 1;

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Overview of platform usage, user engagement, and intelligence metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchOverview}
            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Export Panel */}
      {showExport && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Export Analytics Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Filter by User</label>
              <select
                value={exportUserId || ''}
                onChange={(e) => setExportUserId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Users</option>
                {data?.user_stats.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.username} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm disabled:opacity-50"
              >
                {exportLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Filter className="w-4 h-4" />
                )}
                Fetch Data
              </button>
              {exportData && (
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              )}
            </div>
          </div>
          {exportData && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">{exportData.length} rows fetched</p>
              <div className="overflow-x-auto max-h-64 border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-foreground">Title</th>
                      <th className="px-3 py-2 text-left font-medium text-foreground">Source</th>
                      <th className="px-3 py-2 text-left font-medium text-foreground">Status</th>
                      <th className="px-3 py-2 text-right font-medium text-foreground">IOCs</th>
                      <th className="px-3 py-2 text-right font-medium text-foreground">TTPs</th>
                      <th className="px-3 py-2 text-left font-medium text-foreground">Priority</th>
                      <th className="px-3 py-2 text-left font-medium text-foreground">Ingested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportData.slice(0, 50).map((row) => (
                      <tr key={row.article_id} className="border-t border-border hover:bg-muted/50">
                        <td className="px-3 py-2 text-foreground max-w-[200px] truncate">
                          {row.title}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.source}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-foreground">
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-foreground">{row.ioc_count}</td>
                        <td className="px-3 py-2 text-right text-foreground">{row.ttp_count}</td>
                        <td className="px-3 py-2">
                          {row.is_high_priority && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-600">
                              HIGH
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.ingested_at ? new Date(row.ingested_at).toLocaleDateString() : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {exportData.length > 50 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Showing first 50 of {exportData.length} rows. Download CSV for full data.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <SummaryCard icon={BookOpen} label="Total Articles" value={data.summary.total_articles} color="blue" />
            <SummaryCard icon={Rss} label="Active Sources" value={data.summary.total_sources} color="cyan" />
            <SummaryCard icon={Shield} label="IOCs Extracted" value={data.summary.total_iocs} color="green" />
            <SummaryCard icon={Brain} label="TTPs Mapped" value={data.summary.total_ttps} color="purple" />
            <SummaryCard icon={AlertTriangle} label="Watchlist Hits" value={data.summary.watchlist_matches} color="red" />
            <SummaryCard icon={Users} label="Active Users" value={data.summary.total_users} color="amber" />
          </div>

          {/* Pipeline Flow */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Intelligence Pipeline Overview</h2>
            <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
              <PipelineStep label="Sources" value={data.summary.total_sources} color="bg-cyan-500" />
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <PipelineStep label="Ingested" value={data.summary.total_articles} color="bg-blue-500" />
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <PipelineStep label="IOCs" value={data.summary.total_iocs} color="bg-green-500" />
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <PipelineStep label="TTPs" value={data.summary.total_ttps} color="bg-purple-500" />
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <PipelineStep label="Watchlist" value={data.summary.watchlist_matches} color="bg-red-500" />
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <PipelineStep label="Users" value={data.summary.total_users} color="bg-amber-500" />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Daily Ingestion */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Daily Article Ingestion</h2>
              {data.daily_counts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
              ) : (
                <div className="space-y-2">
                  {data.daily_counts.slice(-14).map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 text-right flex-shrink-0">
                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${Math.max((day.count / maxDailyCount) * 100, 8)}%` }}
                        >
                          <span className="text-[10px] font-bold text-primary-foreground">{day.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Articles by Source */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Articles by Source (Top 10)</h2>
              {data.source_breakdown.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
              ) : (
                <div className="space-y-3">
                  {data.source_breakdown.map((source, idx) => (
                    <div key={source.name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground truncate">{source.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{source.count}</span>
                        </div>
                        <div className="bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary/70 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(source.count / maxSourceCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Breakdown */}
          {data.status_breakdown.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Article Status Breakdown</h2>
              <div className="flex flex-wrap gap-4">
                {data.status_breakdown.map((s) => (
                  <div key={s.status} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      s.status === 'NEW' ? 'bg-blue-500' :
                      s.status === 'IN_ANALYSIS' ? 'bg-amber-500' :
                      s.status === 'REVIEWED' ? 'bg-green-500' :
                      s.status === 'ARCHIVED' ? 'bg-gray-500' :
                      'bg-purple-500'
                    )} />
                    <span className="text-sm text-foreground font-medium">{s.status}</span>
                    <span className="text-sm text-muted-foreground">({s.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Statistics Table */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-foreground">User Engagement</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th
                      className="text-left py-3 px-4 font-medium text-foreground cursor-pointer hover:text-primary"
                      onClick={() => toggleSort('username')}
                    >
                      <span className="flex items-center gap-1">
                        User
                        {sortField === 'username' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </span>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Role</th>
                    <th
                      className="text-right py-3 px-4 font-medium text-foreground cursor-pointer hover:text-primary"
                      onClick={() => toggleSort('articles_read')}
                    >
                      <span className="flex items-center gap-1 justify-end">
                        Articles Read
                        {sortField === 'articles_read' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </span>
                    </th>
                    <th
                      className="text-right py-3 px-4 font-medium text-foreground cursor-pointer hover:text-primary"
                      onClick={() => toggleSort('bookmarks')}
                    >
                      <span className="flex items-center gap-1 justify-end">
                        Bookmarks
                        {sortField === 'bookmarks' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </span>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <React.Fragment key={user.user_id}>
                      <tr className="border-b border-border hover:bg-muted/50 transition">
                        <td className="py-3 px-4 text-foreground font-medium">{user.username}</td>
                        <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            user.role === 'ADMIN' ? 'bg-red-500/10 text-red-600' :
                            user.role === 'ANALYST' ? 'bg-blue-500/10 text-blue-600' :
                            'bg-gray-500/10 text-gray-600'
                          )}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-foreground font-mono">{user.articles_read}</td>
                        <td className="py-3 px-4 text-right text-foreground font-mono">{user.bookmarks}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              if (selectedUserId === user.user_id) {
                                setSelectedUserId(null);
                                setUserDetail(null);
                              } else {
                                fetchUserDetail(user.user_id);
                              }
                            }}
                            className="px-3 py-1 text-xs bg-secondary text-foreground rounded hover:bg-accent transition"
                          >
                            {selectedUserId === user.user_id ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {selectedUserId === user.user_id && userDetail && (
                        <tr>
                          <td colSpan={6} className="p-4 bg-muted/30">
                            {userDetailLoading ? (
                              <div className="flex justify-center py-4">
                                <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
                              </div>
                            ) : (
                              <UserDetailPanel data={userDetail} username={user.username} />
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No users found matching your search
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UserDetailPanel({ data, username }: { data: any; username: string }) {
  const summary = data?.summary;
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{username}&apos;s Analytics</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MiniStat icon={BookOpen} label="Total Articles" value={summary.total_articles} />
        <MiniStat icon={Eye} label="Read" value={summary.articles_read} />
        <MiniStat icon={Clock} label="Unread" value={summary.unread} />
        <MiniStat icon={Bookmark} label="Bookmarked" value={summary.bookmarked} />
        <MiniStat icon={BarChart3} label="Read Rate" value={`${summary.read_percentage}%`} />
      </div>
      {data.top_sources?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Top Sources Read:</p>
          <div className="flex flex-wrap gap-2">
            {data.top_sources.slice(0, 5).map((s: any) => (
              <span key={s.name} className="text-xs px-2 py-1 bg-secondary rounded text-foreground">
                {s.name} ({s.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div>
        <p className="text-sm font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600',
    green: 'bg-green-500/10 text-green-600',
    amber: 'bg-amber-500/10 text-amber-600',
    purple: 'bg-purple-500/10 text-purple-600',
    red: 'bg-red-500/10 text-red-600',
    cyan: 'bg-cyan-500/10 text-cyan-600',
  };
  const colorClasses = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', colorClasses)}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PipelineStep({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm', color)}>
        {value > 999 ? `${Math.round(value / 1000)}k` : value}
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

