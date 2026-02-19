'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  Crosshair,
  Globe,
  Hash,
  Mail,
  AlertTriangle,
  FileText,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  CheckCircle,
  XCircle,
  Copy,
  Target,
} from 'lucide-react';
import { articlesAPI } from '@/api/client';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import ArticleDetailDrawer from '@/components/ArticleDetailDrawer';

// ---- Types ----

interface IntelItem {
  id: number;
  article_id: number;
  intelligence_type: string;
  value: string;
  confidence: number;
  evidence?: string;
  mitre_id?: string;
  meta?: Record<string, any>;
  is_reviewed?: boolean;
  is_false_positive?: boolean;
  notes?: string;
  created_at?: string;
  article_title?: string;
  article_url?: string;
  article_published_at?: string;
  article_source_name?: string;
}

interface IntelSummary {
  intelligence_by_type: Record<string, number>;
  top_mitre_techniques: { mitre_id: string; name?: string; count: number }[];
  total_intelligence: number;
}

type TabType = 'overview' | 'iocs' | 'ttps' | 'threat_actors';
type TimeRange = '24h' | '7d' | '30d' | '90d' | 'all';

const IOC_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ip: Globe,
  domain: Globe,
  url: ExternalLink,
  hash_md5: Hash,
  hash_sha1: Hash,
  hash_sha256: Hash,
  email: Mail,
  cve: AlertTriangle,
  registry_key: FileText,
  file_path: FileText,
};

const IOC_TYPE_COLORS: Record<string, string> = {
  ip: 'bg-blue-500/10 text-blue-600',
  domain: 'bg-cyan-500/10 text-cyan-600',
  url: 'bg-purple-500/10 text-purple-600',
  hash_md5: 'bg-orange-500/10 text-orange-600',
  hash_sha1: 'bg-orange-500/10 text-orange-600',
  hash_sha256: 'bg-red-500/10 text-red-600',
  email: 'bg-pink-500/10 text-pink-600',
  cve: 'bg-red-600/10 text-red-700',
  registry_key: 'bg-amber-500/10 text-amber-600',
  file_path: 'bg-gray-500/10 text-gray-600',
};

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
];

// ---- Component ----

export default function ThreatIntelligence() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Summary data
  const [summary, setSummary] = useState<IntelSummary | null>(null);

  // Intelligence list
  const [items, setItems] = useState<IntelItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [iocTypeFilter, setIocTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await articlesAPI.getIntelligenceSummary({ time_range: timeRange }) as any;
      const data = res?.data || res;
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load intelligence summary:', err);
    }
  }, [timeRange]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const intelType = activeTab === 'iocs' ? 'IOC'
        : activeTab === 'ttps' ? 'TTP'
        : activeTab === 'threat_actors' ? 'THREAT_ACTOR'
        : undefined;

      const res = await articlesAPI.getAllIntelligence({
        page: currentPage,
        page_size: 50,
        intel_type: intelType,
        ioc_type: iocTypeFilter || undefined,
      }) as any;

      const data = res?.data || res;
      setItems(data?.items || []);
      setTotalItems(data?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load intelligence');
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, iocTypeFilter, timeRange]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab !== 'overview') {
      setCurrentPage(1);
      fetchItems();
    }
  }, [activeTab, iocTypeFilter, timeRange]);

  useEffect(() => {
    if (activeTab !== 'overview') {
      fetchItems();
    }
  }, [currentPage]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-500/10';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-500/10';
    return 'text-red-600 bg-red-500/10';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredItems = searchQuery
    ? items.filter((i) =>
        i.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.mitre_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.article_title || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: Target },
    { key: 'iocs' as const, label: `IOCs${summary ? ` (${summary.intelligence_by_type?.IOC || 0})` : ''}`, icon: Shield },
    { key: 'ttps' as const, label: `TTPs${summary ? ` (${summary.intelligence_by_type?.TTP || 0})` : ''}`, icon: Crosshair },
    { key: 'threat_actors' as const, label: `Threat Actors${summary ? ` (${summary.intelligence_by_type?.THREAT_ACTOR || 0})` : ''}`, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-7 h-7" />
            Threat Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Extracted IOCs, TTPs, and Threat Actor intelligence from all articles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Time Range */}
          <div className="flex bg-muted rounded-lg p-0.5">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.value}
                onClick={() => setTimeRange(tr.value)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                  timeRange === tr.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tr.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { fetchSummary(); if (activeTab !== 'overview') fetchItems(); }}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setIocTypeFilter(''); setSearchQuery(''); }}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ====== OVERVIEW TAB ====== */}
      {activeTab === 'overview' && summary && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('iocs')}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors text-left"
            >
              <p className="text-sm text-muted-foreground">IOCs</p>
              <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                {summary.intelligence_by_type?.IOC || 0}
              </p>
            </button>
            <button
              onClick={() => setActiveTab('ttps')}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors text-left"
            >
              <p className="text-sm text-muted-foreground">TTPs</p>
              <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-orange-600" />
                {summary.intelligence_by_type?.TTP || 0}
              </p>
            </button>
            <button
              onClick={() => setActiveTab('threat_actors')}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors text-left"
            >
              <p className="text-sm text-muted-foreground">Threat Actors</p>
              <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                {summary.intelligence_by_type?.THREAT_ACTOR || 0}
              </p>
            </button>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Intelligence</p>
              <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {summary.total_intelligence || 0}
              </p>
            </div>
          </div>

          {/* Top MITRE Techniques */}
          {summary.top_mitre_techniques && summary.top_mitre_techniques.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Top MITRE ATT&CK Techniques</h3>
              <div className="space-y-2">
                {summary.top_mitre_techniques.slice(0, 10).map((t, i) => {
                  const maxCount = summary.top_mitre_techniques[0].count;
                  const barWidth = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-primary w-24 flex-shrink-0">{t.mitre_id}</span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/30 rounded-full flex items-center px-2"
                          style={{ width: `${Math.max(barWidth, 5)}%` }}
                        >
                          <span className="text-[10px] font-medium text-foreground whitespace-nowrap">{t.name || t.mitre_id}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{t.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'overview' && !summary && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* ====== IOCs / TTPs / THREAT ACTORS TABS ====== */}
      {activeTab !== 'overview' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search indicators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* IOC Type Filter (only for IOCs tab) */}
            {activeTab === 'iocs' && (
              <div className="flex bg-muted rounded-lg p-0.5">
                {['', 'ip', 'domain', 'hash_sha256', 'cve', 'email', 'url'].map((t) => (
                  <button
                    key={t}
                    onClick={() => { setIocTypeFilter(t); setCurrentPage(1); }}
                    className={cn(
                      'px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                      iocTypeFilter === t
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t || 'All'}
                  </button>
                ))}
              </div>
            )}

            <span className="text-xs text-muted-foreground ml-auto">
              {totalItems} total
            </span>
          </div>

          {/* List */}
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No intelligence found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Extract intelligence from articles to populate this view
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredItems.map((item) => {
                const isExpanded = expandedItemId === item.id;
                const iocType = item.meta?.type || item.intelligence_type?.toLowerCase();
                const TypeIcon = IOC_TYPE_ICONS[iocType] || Shield;
                const typeColor = IOC_TYPE_COLORS[iocType] || 'bg-gray-500/10 text-gray-600';

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'bg-card border rounded-lg overflow-hidden transition-colors',
                      item.is_false_positive ? 'border-red-500/30 opacity-60' : 'border-border hover:border-primary/30'
                    )}
                  >
                    {/* Main Row */}
                    <div
                      className="p-3 flex items-center gap-3 cursor-pointer"
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}

                      {/* Icon + Value */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1', typeColor)}>
                          <TypeIcon className="w-3 h-3" />
                          {iocType?.toUpperCase()}
                        </span>
                        <span className="font-mono text-sm text-foreground truncate">
                          {item.mitre_id ? `${item.mitre_id} — ` : ''}{item.value}
                        </span>
                        {item.is_reviewed && (
                          <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        )}
                        {item.is_false_positive && (
                          <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                        )}
                      </div>

                      {/* Confidence + Article */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', getConfidenceColor(item.confidence))}>
                          {item.confidence}%
                        </span>
                        {item.article_source_name && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {item.article_source_name}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {item.created_at ? formatRelativeTime(item.created_at) : ''}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t border-border p-4 bg-muted/30 space-y-3">
                        {/* Evidence */}
                        {item.evidence && (
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">Evidence</p>
                            <p className="text-xs text-muted-foreground bg-background border border-border rounded p-2">
                              {item.evidence}
                            </p>
                          </div>
                        )}

                        {/* Linked Article */}
                        {item.article_title && (
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">Source Article</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedArticleId(String(item.article_id)); }}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              {item.article_title}
                            </button>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <button
                            onClick={() => copyToClipboard(item.value)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary text-foreground rounded hover:bg-secondary/80"
                          >
                            <Copy className="w-3 h-3" />
                            Copy Value
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedArticleId(String(item.article_id)); }}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary text-foreground rounded hover:bg-secondary/80"
                          >
                            <Eye className="w-3 h-3" />
                            View Article
                          </button>
                          {item.meta?.type && (
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              Meta: {JSON.stringify(item.meta)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalItems > 50 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-accent disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {Math.ceil(totalItems / 50)}
              </span>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage * 50 >= totalItems}
                className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-accent disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Article Detail Drawer */}
      <ArticleDetailDrawer
        articleId={selectedArticleId}
        onClose={() => setSelectedArticleId(null)}
        onBookmarkToggle={async () => {}}
      />
    </div>
  );
}
