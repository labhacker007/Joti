'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Shield, Crosshair, Globe, Hash, Mail, AlertTriangle, FileText, RefreshCw,
  Search, ChevronDown, ChevronRight, ExternalLink, Eye, CheckCircle, XCircle,
  Copy, Target, Plus, Upload, Download, Sparkles, Link2, Users, Loader2,
  Trash2, Check, X, Database, Radar, Brain, BarChart3, Grid3X3,
  Info, ArrowRight, Zap, Settings, Activity, Clock, Bug, Server, Lock, Layers,
} from 'lucide-react';
import { articlesAPI, userFeedsAPI, sourcesAPI } from '@/api/client';
import FileUploadDropzone from '@/components/FileUploadDropzone';
import { cn, formatRelativeTime } from '@/lib/utils';
import ArticleDetailDrawer from '@/components/ArticleDetailDrawer';

// ======================== TYPES ========================

interface ArticleInfo {
  id: number;
  title: string;
  status: string;
  is_high_priority: boolean;
  source_name?: string;
  published_at?: string;
  created_at?: string;
  watchlist_matches?: string[];
}

interface IntelItem {
  id: number;
  intelligence_type: string;
  value: string;
  confidence: number;
  evidence?: string;
  ioc_type?: string;
  mitre_id?: string;
  mitre_name?: string;
  mitre_url?: string;
  mitre_framework?: string;
  meta?: Record<string, any>;
  is_reviewed?: boolean;
  is_false_positive?: boolean;
  notes?: string;
  created_at?: string;
  article?: ArticleInfo | null;
  hunt?: any;
}

interface IntelSummary {
  intelligence_by_type: Record<string, number>;
  top_mitre_techniques: { mitre_id: string; name?: string; count: number }[];
  articles_with_intel_by_status?: Record<string, number>;
  total_intelligence: number;
  active_watchlist_keywords?: string[];
}

interface MitreMatrixData {
  framework: string;
  tactics: Record<string, { mitre_id: string; count: number; article_count: number; url: string }[]>;
  total_techniques: number;
}

interface CorrelationData {
  shared_iocs: { value: string; ioc_type: string; article_count: number; article_titles: string[]; article_ids: number[] }[];
  clusters: { articles: { id: number; title: string }[]; shared_iocs: string[] }[];
  total_shared_iocs: number;
  total_clusters: number;
}

interface UploadResult {
  status: 'success' | 'error' | 'duplicate';
  filename: string;
  message: string;
  articleTitle?: string;
  executiveSummary?: string;
  iocCount?: number;
  ttpCount?: number;
}

type PanelType = 'command_center' | 'ioc_explorer' | 'mitre_matrix' | 'threat_actors' | 'correlation' | 'ai_analysis' | 'intel_ingestion';
type TimeRange = '24h' | '7d' | '30d' | '90d' | 'all';
type SourceCategory = 'all' | 'open_source' | 'external' | 'internal';

// ======================== CONSTANTS ========================

const IOC_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ip: Globe, domain: Globe, url: ExternalLink, hash_md5: Hash, hash_sha1: Hash,
  hash_sha256: Hash, email: Mail, cve: AlertTriangle, registry_key: FileText, file_path: FileText,
};

const IOC_TYPE_COLORS: Record<string, string> = {
  ip: 'bg-blue-500/10 text-blue-600', domain: 'bg-cyan-500/10 text-cyan-600',
  url: 'bg-purple-500/10 text-purple-600', hash_md5: 'bg-orange-500/10 text-orange-600',
  hash_sha1: 'bg-orange-500/10 text-orange-600', hash_sha256: 'bg-red-500/10 text-red-600',
  email: 'bg-pink-500/10 text-pink-600', cve: 'bg-red-600/10 text-red-700',
  registry_key: 'bg-amber-500/10 text-amber-600', file_path: 'bg-gray-500/10 text-gray-600',
};

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24h' }, { value: '7d', label: '7d' },
  { value: '30d', label: '30d' }, { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
];

const FOCUS_AREAS: { value: string | undefined; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: undefined,        label: 'Full Landscape',  desc: 'Overall threat activity overview',    icon: Brain },
  { value: 'ransomware',     label: 'Ransomware',      desc: 'Active groups, TTPs, targets',         icon: Lock },
  { value: 'apt',            label: 'APT / Nation-State', desc: 'State-sponsored threat actors',    icon: Target },
  { value: 'vulnerabilities',label: 'Vulnerabilities', desc: 'CVEs, patch status, exploits in wild', icon: Bug },
  { value: 'phishing',       label: 'Phishing / BEC',  desc: 'Email threats, credential harvesting', icon: Mail },
  { value: 'supply_chain',   label: 'Supply Chain',    desc: 'Software & vendor compromise risk',    icon: Layers },
  { value: 'cloud',          label: 'Cloud Security',  desc: 'AWS/Azure/GCP threats & misconfigs',   icon: Server },
  { value: 'malware',        label: 'Malware / Tooling', desc: 'Active malware families & TTPs',    icon: AlertTriangle },
];

const SOURCE_CATEGORIES: { value: SourceCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'All Sources', icon: Database },
  { value: 'open_source', label: 'Open Source', icon: Globe },
  { value: 'external', label: 'External TI', icon: Radar },
  { value: 'internal', label: 'Internal', icon: Shield },
];

const PANELS: { key: PanelType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'command_center', label: 'Command Center', icon: Target },
  { key: 'ioc_explorer', label: 'IOC Explorer', icon: Shield },
  { key: 'mitre_matrix', label: 'MITRE ATT&CK', icon: Grid3X3 },
  { key: 'threat_actors', label: 'Threat Actors', icon: Users },
  { key: 'correlation', label: 'Correlation', icon: Link2 },
  { key: 'ai_analysis', label: 'AI Analysis', icon: Brain },
  { key: 'intel_ingestion', label: 'Intel Ingestion', icon: Upload },
];

const MITRE_TACTIC_ORDER = [
  'Reconnaissance', 'Resource Development', 'Initial Access', 'Execution',
  'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access',
  'Discovery', 'Lateral Movement', 'Collection', 'Command and Control',
  'Exfiltration', 'Impact', 'Other',
];

const ATLAS_TACTIC_ORDER = [
  'Reconnaissance', 'Resource Development', 'ML Model Access', 'Initial Access',
  'Execution', 'Persistence', 'Defense Evasion', 'Discovery',
  'Collection', 'ML Attack Staging', 'Exfiltration', 'Impact', 'Other',
];

// ======================== HELPERS ========================

function getConfidenceColor(confidence: number) {
  if (confidence >= 80) return 'text-green-600 bg-green-500/10';
  if (confidence >= 60) return 'text-yellow-600 bg-yellow-500/10';
  return 'text-red-600 bg-red-500/10';
}

function getMitreHeatColor(count: number) {
  if (count === 0) return 'bg-muted/30 text-muted-foreground';
  if (count <= 2) return 'bg-blue-500/20 text-blue-700';
  if (count <= 5) return 'bg-yellow-500/20 text-yellow-700';
  if (count <= 10) return 'bg-orange-500/20 text-orange-700';
  return 'bg-red-500/20 text-red-700';
}

function getSourceCategory(item: IntelItem): string {
  return item.meta?.source_category || 'open_source';
}

// ======================== COMPONENT ========================

export default function ThreatIntelligence() {
  // View state
  const [activePanel, setActivePanel] = useState<PanelType>('command_center');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [sourceCategory, setSourceCategory] = useState<SourceCategory>('all');

  // Data
  const [summary, setSummary] = useState<IntelSummary | null>(null);
  const [items, setItems] = useState<IntelItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [mitreMatrix, setMitreMatrix] = useState<MitreMatrixData | null>(null);
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [landscapeSummary, setLandscapeSummary] = useState('');
  const [lastCorrelationRun, setLastCorrelationRun] = useState<Date | null>(null);
  const [lastAnalysisRun, setLastAnalysisRun] = useState<{ time: Date; focus: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [iocTypeFilter, setIocTypeFilter] = useState('');
  const [intelTypeFilter, setIntelTypeFilter] = useState('');

  // UI state
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Manual IOC form
  const [manualForm, setManualForm] = useState({ value: '', intelligence_type: 'IOC', ioc_type: 'ip', confidence: 70, evidence: '', notes: '' });
  const [importText, setImportText] = useState('');

  // Intel Ingestion state
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [ingestUrl, setIngestUrl] = useState('');
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestFeedType, setIngestFeedType] = useState('rss');
  const [ingesting, setIngesting] = useState(false);

  // Refs
  const mitreFramework = useRef<'attack' | 'atlas'>('attack');

  // ---- Data fetching ----

  const setLoadingKey = (key: string, val: boolean) => setLoading(prev => ({ ...prev, [key]: val }));

  const fetchSummary = useCallback(async () => {
    try {
      setLoadingKey('summary', true);
      const res = await articlesAPI.getIntelligenceSummary({
        time_range: timeRange,
        source_category: sourceCategory !== 'all' ? sourceCategory : undefined,
      }) as any;
      setSummary(res?.data || res);
    } catch { /* silent */ } finally {
      setLoadingKey('summary', false);
    }
  }, [timeRange, sourceCategory]);

  const fetchItems = useCallback(async (page?: number) => {
    try {
      setLoadingKey('items', true);
      setError('');
      const p = page ?? currentPage;
      const res = await articlesAPI.getAllIntelligence({
        page: p,
        page_size: 50,
        intel_type: intelTypeFilter || undefined,
        ioc_type: iocTypeFilter || undefined,
        source_category: sourceCategory !== 'all' ? sourceCategory : undefined,
      }) as any;
      const data = res?.data || res;
      setItems(data?.items || []);
      setTotalItems(data?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load intelligence');
    } finally {
      setLoadingKey('items', false);
    }
  }, [currentPage, intelTypeFilter, iocTypeFilter, sourceCategory]);

  const fetchMitreMatrix = useCallback(async () => {
    try {
      setLoadingKey('mitre', true);
      const res = await articlesAPI.getMitreMatrix(mitreFramework.current) as any;
      setMitreMatrix(res?.data || res);
    } catch { /* silent */ } finally {
      setLoadingKey('mitre', false);
    }
  }, []);

  const fetchCorrelation = useCallback(async () => {
    try {
      setLoadingKey('correlation', true);
      const res = await articlesAPI.getCorrelation({ time_range: timeRange }) as any;
      setCorrelationData(res?.data || res);
      setLastCorrelationRun(new Date());
    } catch { /* silent */ } finally {
      setLoadingKey('correlation', false);
    }
  }, [timeRange]);

  const fetchLandscape = useCallback(async (focus?: string) => {
    try {
      setLoadingKey('landscape', true);
      setError('');
      const res = await articlesAPI.getAILandscape({ time_range: timeRange, focus_area: focus }) as any;
      const data = res?.data || res;
      setLandscapeSummary(data?.summary || 'No summary generated.');
      setLastAnalysisRun({ time: new Date(), focus: focus || 'Full Landscape' });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to generate landscape summary. Make sure a GenAI provider is configured in Admin → AI Engine.';
      setError(detail);
    } finally {
      setLoadingKey('landscape', false);
    }
  }, [timeRange]);

  // ---- Effects ----

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    if (activePanel === 'ioc_explorer' || activePanel === 'threat_actors') {
      setCurrentPage(1);
      const type = activePanel === 'threat_actors' ? 'THREAT_ACTOR' : '';
      setIntelTypeFilter(type);
    }
  }, [activePanel]);

  useEffect(() => {
    if (activePanel === 'ioc_explorer' || activePanel === 'threat_actors') {
      fetchItems(1);
    }
  }, [intelTypeFilter, iocTypeFilter, sourceCategory]);

  useEffect(() => {
    if (activePanel === 'ioc_explorer' || activePanel === 'threat_actors') {
      fetchItems();
    }
  }, [currentPage]);

  useEffect(() => {
    if (activePanel === 'mitre_matrix') fetchMitreMatrix();
  }, [activePanel]);

  useEffect(() => {
    if (activePanel === 'correlation') fetchCorrelation();
  }, [activePanel, fetchCorrelation]);

  // ---- Actions ----

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredItems.map(i => i.id)));
  };

  const handleBulkReview = async (isFP: boolean) => {
    try {
      await articlesAPI.batchReviewIntelligence({
        intel_ids: Array.from(selectedIds),
        is_reviewed: !isFP,
        is_false_positive: isFP,
      });
      setSelectedIds(new Set());
      fetchItems();
    } catch { /* silent */ }
  };

  const handleSubmitManualIOC = async () => {
    if (!manualForm.value.trim()) return;
    try {
      setLoadingKey('submit', true);
      await articlesAPI.submitManualIOC({
        value: manualForm.value.trim(),
        intelligence_type: manualForm.intelligence_type,
        ioc_type: manualForm.ioc_type,
        confidence: manualForm.confidence,
        evidence: manualForm.evidence || undefined,
        notes: manualForm.notes || undefined,
        source_category: 'internal',
      });
      setShowAddModal(false);
      setManualForm({ value: '', intelligence_type: 'IOC', ioc_type: 'ip', confidence: 70, evidence: '', notes: '' });
      fetchItems();
      fetchSummary();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit indicator');
    } finally {
      setLoadingKey('submit', false);
    }
  };

  const handleBulkImport = async () => {
    if (!importText.trim()) return;
    try {
      setLoadingKey('import', true);
      const lines = importText.trim().split('\n').filter(Boolean);
      const importItems = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        return {
          value: parts[0],
          intelligence_type: 'IOC' as const,
          ioc_type: parts[1] || 'ip',
          confidence: parseInt(parts[2]) || 70,
        };
      });
      const res = await articlesAPI.bulkImportIOCs(importItems) as any;
      const data = res?.data || res;
      setError(`Imported: ${data?.imported || 0}, Skipped: ${data?.skipped || 0}`);
      setShowImportModal(false);
      setImportText('');
      fetchItems();
      fetchSummary();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Bulk import failed');
    } finally {
      setLoadingKey('import', false);
    }
  };

  // ---- Intel Ingestion handlers ----

  const handleFilesSelected = async (files: File[]) => {
    setUploading(true);
    const results: UploadResult[] = [];
    for (const file of files) {
      try {
        const response = (await userFeedsAPI.uploadDocument(file, { title: file.name })) as any;
        const data = response.data || response;
        results.push({
          status: data.status === 'duplicate' ? 'duplicate' : 'success',
          filename: file.name,
          message: data.message || 'Document ingested successfully',
          articleTitle: data.article_title,
          executiveSummary: data.executive_summary,
          iocCount: data.ioc_count || 0,
          ttpCount: data.ttp_count || 0,
        });
      } catch (err: any) {
        results.push({
          status: 'error',
          filename: file.name,
          message: err.response?.data?.detail || err.message || 'Failed to process document',
        });
      }
    }
    setUploadResults(prev => [...results, ...prev].slice(0, 50));
    setUploading(false);
    fetchSummary();
    fetchItems(1);
  };

  const handleIngestUrl = async () => {
    if (!ingestUrl.trim()) return;
    setIngesting(true);
    try {
      const response = (await sourcesAPI.createSource({
        name: ingestTitle || ingestUrl,
        url: ingestUrl,
        feed_type: ingestFeedType,
        auto_ingest: true,
      })) as any;
      const data = response.data || response;
      setUploadResults(prev => [{
        status: 'success',
        filename: ingestTitle || ingestUrl,
        message: `Feed added and ingestion triggered. Source ID: ${data.id || 'created'}`,
        iocCount: 0,
        ttpCount: 0,
      }, ...prev].slice(0, 50));
      setIngestUrl('');
      setIngestTitle('');
    } catch (err: any) {
      setUploadResults(prev => [{
        status: 'error',
        filename: ingestTitle || ingestUrl,
        message: err.response?.data?.detail || err.message || 'Failed to add feed',
      }, ...prev].slice(0, 50));
    } finally {
      setIngesting(false);
    }
  };

  const handleExportCSV = () => {
    const header = 'Type,Value,Confidence,MITRE_ID,Source,Created';
    const rows = filteredItems.map(i =>
      [i.ioc_type || i.intelligence_type, `"${i.value}"`, i.confidence, i.mitre_id || '', getSourceCategory(i), i.created_at || ''].join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `intelligence-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  // ---- Filtered items ----

  const filteredItems = searchQuery
    ? items.filter(i =>
        i.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.mitre_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.article?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  // ---- Render helpers ----

  const Spinner = () => (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const EmptyState = ({ message, sub }: { message: string; sub?: string }) => (
    <div className="text-center py-12 border border-dashed border-border rounded-lg">
      <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-muted-foreground">{message}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );

  // ======================== RENDER ========================

  return (
    <div className="space-y-4 pb-8">
      {/* ====== HEADER ====== */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-7 h-7" />
            Threat Intelligence Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Unified intelligence from open sources, external feeds, and internal submissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            {TIME_RANGES.map(tr => (
              <button key={tr.value} onClick={() => setTimeRange(tr.value)}
                className={cn('px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                  timeRange === tr.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}>{tr.label}</button>
            ))}
          </div>
          <button onClick={() => { fetchSummary(); fetchItems(); }}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ====== SOURCE SEGMENT FILTER ====== */}
      <div className="flex items-center gap-1">
        {SOURCE_CATEGORIES.map(sc => {
          const Icon = sc.icon;
          return (
            <button key={sc.value} onClick={() => setSourceCategory(sc.value)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors border',
                sourceCategory === sc.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40'
              )}>
              <Icon className="w-3.5 h-3.5" />
              {sc.label}
            </button>
          );
        })}
      </div>

      {/* ====== PANEL NAVIGATION ====== */}
      <div className="flex gap-1 border-b border-border pb-0">
        {PANELS.map(panel => {
          const Icon = panel.icon;
          return (
            <button key={panel.key}
              onClick={() => { setActivePanel(panel.key); setSearchQuery(''); setIocTypeFilter(''); setSelectedIds(new Set()); setExpandedItemId(null); }}
              className={cn('flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2',
                activePanel === panel.key
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              <Icon className="w-3.5 h-3.5" />
              {panel.label}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ============================================================ */}
      {/* PANEL 1: COMMAND CENTER                                       */}
      {/* ============================================================ */}
      {activePanel === 'command_center' && (
        <div className="space-y-5">
          {/* Stats Cards */}
          {summary ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <button onClick={() => { setActivePanel('ioc_explorer'); setIntelTypeFilter('IOC'); }}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all text-left group">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium">IOCs</p>
                    <Shield className="w-4 h-4 text-red-500 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.intelligence_by_type?.IOC || 0}</p>
                </button>
                <button onClick={() => { setActivePanel('ioc_explorer'); setIntelTypeFilter('TTP'); }}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all text-left group">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium">TTPs</p>
                    <Crosshair className="w-4 h-4 text-orange-500 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.intelligence_by_type?.TTP || 0}</p>
                </button>
                <button onClick={() => setActivePanel('threat_actors')}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all text-left group">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium">Threat Actors</p>
                    <Users className="w-4 h-4 text-yellow-500 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.intelligence_by_type?.THREAT_ACTOR || 0}</p>
                </button>
                <button onClick={() => setActivePanel('mitre_matrix')}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all text-left group">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium">MITRE Techniques</p>
                    <Grid3X3 className="w-4 h-4 text-blue-500 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.top_mitre_techniques?.length || 0}</p>
                </button>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium">Total Intelligence</p>
                    <Target className="w-4 h-4 text-primary opacity-60" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.total_intelligence || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top MITRE Techniques */}
                {summary.top_mitre_techniques && summary.top_mitre_techniques.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Top MITRE ATT&CK Techniques
                    </h3>
                    <div className="space-y-1.5">
                      {summary.top_mitre_techniques.slice(0, 10).map((t, i) => {
                        const maxCount = summary.top_mitre_techniques[0].count;
                        const barWidth = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-primary w-20 flex-shrink-0">{t.mitre_id}</span>
                            <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/25 rounded-full flex items-center px-2"
                                style={{ width: `${Math.max(barWidth, 8)}%` }}>
                                <span className="text-[9px] font-medium text-foreground whitespace-nowrap truncate">{t.name || t.mitre_id}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground w-6 text-right font-medium">{t.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Watchlist Keywords */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Active Watchlist Keywords
                  </h3>
                  {summary.active_watchlist_keywords && summary.active_watchlist_keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {summary.active_watchlist_keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No active watchlist keywords configured</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <Spinner />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* PANEL 2: IOC EXPLORER                                         */}
      {/* ============================================================ */}
      {activePanel === 'ioc_explorer' && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search indicators, MITRE IDs, articles..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>

            {/* Intel Type Filter */}
            <div className="flex bg-muted rounded-lg p-0.5">
              {[{ v: '', l: 'All' }, { v: 'IOC', l: 'IOCs' }, { v: 'TTP', l: 'TTPs' }, { v: 'THREAT_ACTOR', l: 'Actors' }].map(t => (
                <button key={t.v} onClick={() => { setIntelTypeFilter(t.v); setCurrentPage(1); }}
                  className={cn('px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                    intelTypeFilter === t.v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}>{t.l}</button>
              ))}
            </div>

            {/* IOC Type Filter (when viewing IOCs) */}
            {(!intelTypeFilter || intelTypeFilter === 'IOC') && (
              <div className="flex bg-muted rounded-lg p-0.5">
                {['', 'ip', 'domain', 'hash_sha256', 'cve', 'email', 'url'].map(t => (
                  <button key={t} onClick={() => { setIocTypeFilter(t); setCurrentPage(1); }}
                    className={cn('px-2 py-1.5 text-[10px] font-medium rounded-md transition-colors',
                      iocTypeFilter === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}>{t || 'All'}</button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /> Add IOC
              </button>
              <button onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-secondary text-foreground rounded-lg border border-border hover:bg-secondary/80">
                <Upload className="w-3.5 h-3.5" /> Import
              </button>
              <button onClick={handleExportCSV}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-secondary text-foreground rounded-lg border border-border hover:bg-secondary/80">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <span className="text-xs text-muted-foreground ml-2">{totalItems} total</span>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg p-2.5">
              <span className="text-xs font-medium text-foreground">{selectedIds.size} selected</span>
              <button onClick={() => handleBulkReview(false)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/10 text-green-600 rounded hover:bg-green-500/20">
                <CheckCircle className="w-3 h-3" /> Mark Reviewed
              </button>
              <button onClick={() => handleBulkReview(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500/10 text-red-600 rounded hover:bg-red-500/20">
                <XCircle className="w-3 h-3" /> Mark False Positive
              </button>
              <button onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
            </div>
          )}

          {/* Table */}
          {loading.items && items.length === 0 ? <Spinner /> : filteredItems.length === 0 ? (
            <EmptyState message="No intelligence found" sub="Extract intelligence from articles or submit indicators manually" />
          ) : (
            <>
              {/* Table Header */}
              <div className="flex items-center gap-3 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                <input type="checkbox" checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                  onChange={selectAll} className="rounded border-border" />
                <span className="w-16">Type</span>
                <span className="flex-1">Value</span>
                <span className="w-14 text-center">Conf.</span>
                <span className="w-16">Source</span>
                <span className="w-32">Article</span>
                <span className="w-16 text-right">Date</span>
              </div>

              {/* Rows */}
              <div className="space-y-0.5">
                {filteredItems.map(item => {
                  const isExpanded = expandedItemId === item.id;
                  const iocType = item.ioc_type || item.meta?.type || item.intelligence_type?.toLowerCase();
                  const TypeIcon = IOC_TYPE_ICONS[iocType] || Shield;
                  const typeColor = IOC_TYPE_COLORS[iocType] || 'bg-gray-500/10 text-gray-600';
                  const srcCat = getSourceCategory(item);

                  return (
                    <div key={item.id} className={cn('bg-card border rounded-lg overflow-hidden transition-colors',
                      item.is_false_positive ? 'border-red-500/30 opacity-50' : 'border-border hover:border-primary/30',
                      selectedIds.has(item.id) && 'ring-1 ring-primary/40'
                    )}>
                      <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                        <input type="checkbox" checked={selectedIds.has(item.id)}
                          onChange={e => { e.stopPropagation(); toggleSelection(item.id); }}
                          onClick={e => e.stopPropagation()} className="rounded border-border" />
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 w-16 justify-center flex-shrink-0', typeColor)}>
                          <TypeIcon className="w-3 h-3" />
                          {(iocType || '').toUpperCase().slice(0, 8)}
                        </span>
                        <span className="font-mono text-xs text-foreground truncate flex-1 flex items-center gap-1">
                          {item.mitre_id ? <span className="text-primary font-semibold">{item.mitre_id}</span> : null}
                          {item.mitre_id ? ' — ' : ''}{item.value}
                          {item.is_reviewed && <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />}
                          {item.is_false_positive && <XCircle className="w-3 h-3 text-red-600 flex-shrink-0" />}
                        </span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium w-14 text-center flex-shrink-0', getConfidenceColor(item.confidence))}>
                          {item.confidence}%
                        </span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded w-16 text-center flex-shrink-0',
                          srcCat === 'internal' ? 'bg-blue-500/10 text-blue-600' :
                          srcCat === 'external' ? 'bg-purple-500/10 text-purple-600' :
                          'bg-gray-500/10 text-gray-500'
                        )}>
                          {srcCat === 'open_source' ? 'OSINT' : srcCat.toUpperCase().slice(0, 8)}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate w-32 flex-shrink-0">
                          {item.article?.title || '—'}
                        </span>
                        <span className="text-[10px] text-muted-foreground w-16 text-right flex-shrink-0">
                          {item.created_at ? formatRelativeTime(item.created_at) : ''}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border p-4 bg-muted/30 space-y-3">
                          {item.evidence && (
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-1">Evidence</p>
                              <p className="text-xs text-muted-foreground bg-background border border-border rounded p-2">{item.evidence}</p>
                            </div>
                          )}
                          {item.article?.title && (
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-1">Source Article</p>
                              <button onClick={e => { e.stopPropagation(); setSelectedArticleId(String(item.article!.id)); }}
                                className="text-xs text-primary hover:underline flex items-center gap-1">
                                <FileText className="w-3 h-3" />{item.article.title}
                                {item.article.is_high_priority && <AlertTriangle className="w-3 h-3 text-red-500" />}
                              </button>
                            </div>
                          )}
                          {item.mitre_url && (
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-1">MITRE Reference</p>
                              <a href={item.mitre_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                {item.mitre_id}: {item.mitre_name || 'View on MITRE'}
                              </a>
                            </div>
                          )}
                          {item.notes && (
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-1">Notes</p>
                              <p className="text-xs text-muted-foreground">{item.notes}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-2 border-t border-border">
                            <button onClick={() => copyToClipboard(item.value)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary text-foreground rounded hover:bg-secondary/80">
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                            {item.article && (
                              <button onClick={e => { e.stopPropagation(); setSelectedArticleId(String(item.article!.id)); }}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary text-foreground rounded hover:bg-secondary/80">
                                <Eye className="w-3 h-3" /> View Article
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalItems > 50 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-accent disabled:opacity-50">Previous</button>
                  <span className="text-xs text-muted-foreground">Page {currentPage} of {Math.ceil(totalItems / 50)}</span>
                  <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage * 50 >= totalItems}
                    className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-accent disabled:opacity-50">Next</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* PANEL 3: MITRE ATT&CK MATRIX                                 */}
      {/* ============================================================ */}
      {activePanel === 'mitre_matrix' && (
        <div className="space-y-4">
          {/* Framework toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-0.5">
              {(['attack', 'atlas'] as const).map(fw => (
                <button key={fw} onClick={() => { mitreFramework.current = fw; fetchMitreMatrix(); }}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    mitreFramework.current === fw ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}>MITRE {fw === 'attack' ? 'ATT&CK' : 'ATLAS'}</button>
              ))}
            </div>
            {mitreMatrix && (
              <span className="text-xs text-muted-foreground">{mitreMatrix.total_techniques} unique techniques detected</span>
            )}
          </div>

          {loading.mitre ? <Spinner /> : !mitreMatrix || Object.keys(mitreMatrix.tactics).length === 0 ? (
            <EmptyState message="No MITRE techniques detected" sub="Extract intelligence from articles to populate the matrix" />
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-1 min-w-max pb-4">
                {(mitreFramework.current === 'atlas' ? ATLAS_TACTIC_ORDER : MITRE_TACTIC_ORDER)
                  .filter(t => mitreMatrix.tactics[t]?.length > 0).map(tactic => (
                  <div key={tactic} className="w-40 flex-shrink-0">
                    <div className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-2 rounded-t-lg text-center border border-border border-b-0">
                      {tactic}
                    </div>
                    <div className="border border-border rounded-b-lg bg-card overflow-hidden divide-y divide-border">
                      {(mitreMatrix.tactics[tactic] || []).map((tech: any) => (
                        <a key={tech.mitre_id} href={tech.url} target="_blank" rel="noopener noreferrer"
                          className={cn('block px-2 py-1.5 hover:brightness-110 transition-all', getMitreHeatColor(tech.count))}
                          title={tech.name || tech.mitre_id}>
                          <p className="text-[10px] font-mono font-semibold">{tech.mitre_id}</p>
                          {tech.name && <p className="text-[9px] text-foreground/70 truncate">{tech.name}</p>}
                          <p className="text-[9px] text-right font-medium">{tech.count} hits · {tech.article_count} art.</p>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>Heat scale:</span>
            <span className={cn('px-2 py-0.5 rounded', getMitreHeatColor(1))}>1-2</span>
            <span className={cn('px-2 py-0.5 rounded', getMitreHeatColor(3))}>3-5</span>
            <span className={cn('px-2 py-0.5 rounded', getMitreHeatColor(6))}>6-10</span>
            <span className={cn('px-2 py-0.5 rounded', getMitreHeatColor(11))}>10+</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PANEL 4: THREAT ACTORS                                        */}
      {/* ============================================================ */}
      {activePanel === 'threat_actors' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search threat actors..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <span className="text-xs text-muted-foreground ml-auto">{totalItems} references</span>
          </div>

          {loading.items && items.length === 0 ? <Spinner /> : filteredItems.length === 0 ? (
            <EmptyState message="No threat actors found" sub="Threat actors are extracted from article analysis" />
          ) : (
            <>
              {/* Group by actor name */}
              {(() => {
                const grouped = new Map<string, { items: IntelItem[]; totalConfidence: number }>();
                filteredItems.forEach(item => {
                  const key = item.value;
                  const existing = grouped.get(key) || { items: [], totalConfidence: 0 };
                  existing.items.push(item);
                  existing.totalConfidence += item.confidence;
                  grouped.set(key, existing);
                });

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from(grouped.entries())
                      .sort((a, b) => b[1].items.length - a[1].items.length)
                      .map(([actor, data]) => {
                        const avgConf = Math.round(data.totalConfidence / data.items.length);
                        const articles = new Set(data.items.map(i => i.article?.title).filter(Boolean));
                        const attribution = data.items[0]?.meta?.attribution || data.items[0]?.evidence?.split('.')[0] || '';

                        return (
                          <div key={actor} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-yellow-500" />
                                <h3 className="text-sm font-bold text-foreground">{actor}</h3>
                              </div>
                              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', getConfidenceColor(avgConf))}>
                                {avgConf}%
                              </span>
                            </div>
                            {attribution && <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{attribution}</p>}
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span>{data.items.length} references</span>
                              <span>{articles.size} articles</span>
                            </div>
                            {articles.size > 0 && (
                              <div className="mt-2 pt-2 border-t border-border">
                                {Array.from(articles).slice(0, 2).map((title, i) => (
                                  <p key={i} className="text-[10px] text-muted-foreground truncate">{title}</p>
                                ))}
                                {articles.size > 2 && (
                                  <p className="text-[10px] text-primary">+{articles.size - 2} more</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })()}

              {totalItems > 50 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-accent disabled:opacity-50">Previous</button>
                  <span className="text-xs text-muted-foreground">Page {currentPage} of {Math.ceil(totalItems / 50)}</span>
                  <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage * 50 >= totalItems}
                    className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-accent disabled:opacity-50">Next</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* PANEL 5: CORRELATION                                          */}
      {/* ============================================================ */}
      {activePanel === 'correlation' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" /> Cross-Source Correlation
              </h3>
              {lastCorrelationRun && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  Last run: {lastCorrelationRun.toLocaleTimeString()} · window: {timeRange}
                </p>
              )}
            </div>
            <button onClick={fetchCorrelation} disabled={loading.correlation}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
              {loading.correlation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {correlationData ? 'Re-analyze' : 'Analyze'}
            </button>
          </div>

          {/* How It Works Banner */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground mb-1">How Cross-Source Correlation Works</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Correlation scans all ingested articles within your selected time window and finds{' '}
                  <strong className="text-foreground">indicators that appear in multiple articles</strong> — IPs, domains, hashes, CVEs, and more.
                  When the same IOC shows up in 2+ articles, it becomes a <strong className="text-foreground">Shared IOC</strong>.
                  Articles sharing 3+ IOCs are grouped into <strong className="text-foreground">Clusters</strong>, which often
                  signal a coordinated campaign or related threat activity.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
                  <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-[9px] font-bold">1</span>
                    Set time window (top-right)
                  </span>
                  <ArrowRight className="w-3 h-3 text-blue-400 hidden sm:block" />
                  <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-[9px] font-bold">2</span>
                    Click Analyze
                  </span>
                  <ArrowRight className="w-3 h-3 text-blue-400 hidden sm:block" />
                  <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-[9px] font-bold">3</span>
                    Investigate clusters &amp; shared IOCs
                  </span>
                </div>
              </div>
            </div>
          </div>

          {loading.correlation ? <Spinner /> : !correlationData ? (
            <EmptyState message="No correlation data yet"
              sub="Click Analyze to scan your articles for shared indicators across sources" />
          ) : (
            <div className="space-y-5">
              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Shared IOCs</p>
                  <p className="text-2xl font-bold text-foreground">{correlationData.total_shared_iocs}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">indicators seen in 2+ articles</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Article Clusters</p>
                  <p className="text-2xl font-bold text-foreground">{correlationData.total_clusters}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">groups sharing 3+ indicators</p>
                </div>
              </div>

              {/* Shared IOCs */}
              {correlationData.shared_iocs.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-primary" />
                    Shared Indicators
                    <span className="ml-auto text-[10px] text-muted-foreground font-normal">
                      Showing {Math.min(correlationData.shared_iocs.length, 20)} of {correlationData.shared_iocs.length}
                    </span>
                  </h4>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    These IOCs appeared across multiple articles — high-frequency hits may indicate active infrastructure.
                  </p>
                  <div className="space-y-2">
                    {correlationData.shared_iocs.slice(0, 20).map((ioc, i) => (
                      <div key={i} className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0',
                          IOC_TYPE_COLORS[ioc.ioc_type] || 'bg-gray-500/10 text-gray-600')}>
                          {ioc.ioc_type.toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs text-foreground truncate">{ioc.value}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Seen in <strong>{ioc.article_count}</strong> articles:{' '}
                            {ioc.article_titles.slice(0, 2).join(' · ')}
                            {ioc.article_count > 2 && ` +${ioc.article_count - 2} more`}
                          </p>
                        </div>
                        <button onClick={() => copyToClipboard(ioc.value)}
                          title="Copy to clipboard"
                          className="text-muted-foreground hover:text-foreground flex-shrink-0">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Article Clusters */}
              {correlationData.clusters.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-primary" />
                    Article Clusters
                  </h4>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Each cluster is a group of articles sharing 3+ IOCs — likely describing the same threat campaign or actor.
                  </p>
                  <div className="space-y-3">
                    {correlationData.clusters.map((cluster, i) => (
                      <div key={i} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Cluster {i + 1}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {cluster.articles.length} articles · {cluster.shared_iocs.length} shared IOCs
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {cluster.shared_iocs.slice(0, 6).map((ioc, j) => (
                            <span key={j} className="font-mono text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{ioc}</span>
                          ))}
                          {cluster.shared_iocs.length > 6 && (
                            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">+{cluster.shared_iocs.length - 6} more</span>
                          )}
                        </div>
                        <div className="space-y-0.5 pl-1 border-l-2 border-primary/20">
                          {cluster.articles.map(a => (
                            <button key={a.id} onClick={() => setSelectedArticleId(String(a.id))}
                              className="block text-[10px] text-primary hover:underline truncate max-w-full text-left">
                              → {a.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {correlationData.shared_iocs.length === 0 && correlationData.clusters.length === 0 && (
                <EmptyState message="No correlations found"
                  sub={`No shared indicators detected across articles in the ${timeRange} window. Try a wider time range.`} />
              )}

              {/* Next Steps */}
              {(correlationData.shared_iocs.length > 0 || correlationData.clusters.length > 0) && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-green-500" /> Recommended Next Steps
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      'Copy high-frequency shared IOCs and add to your SIEM/firewall blocklist',
                      'Click article titles in clusters to review the full threat context',
                      'Switch to IOC Explorer and filter by these indicators for deeper investigation',
                      'Run AI Analysis to generate a threat landscape brief based on this data',
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* PANEL 6: AI ANALYSIS                                          */}
      {/* ============================================================ */}
      {activePanel === 'ai_analysis' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" /> AI Threat Landscape Analysis
              </h3>
              {lastAnalysisRun && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  Last: {lastAnalysisRun.time.toLocaleTimeString()} · {lastAnalysisRun.focus} · window: {timeRange}
                </p>
              )}
            </div>
            <button onClick={() => fetchLandscape()} disabled={loading.landscape}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
              {loading.landscape ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate
            </button>
          </div>

          {/* How It Works Banner */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground mb-1">How AI Analysis Works</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  AI Analysis uses your configured GenAI model (OpenAI, Claude, Gemini, or Ollama) to read all extracted
                  intelligence from your feeds and generate a <strong className="text-foreground">plain-language threat landscape brief</strong>{' '}
                  — current trends, dominant attack patterns, active threat actors, and recommended focus areas for your SOC team.
                </p>
                {/* Workflow steps */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
                  <span className="flex items-center gap-1 text-[10px] text-purple-600 font-medium">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-600 flex items-center justify-center text-[9px] font-bold">1</span>
                    Set time window (top-right)
                  </span>
                  <ArrowRight className="w-3 h-3 text-purple-400 hidden sm:block" />
                  <span className="flex items-center gap-1 text-[10px] text-purple-600 font-medium">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-600 flex items-center justify-center text-[9px] font-bold">2</span>
                    Select a focus area below
                  </span>
                  <ArrowRight className="w-3 h-3 text-purple-400 hidden sm:block" />
                  <span className="flex items-center gap-1 text-[10px] text-purple-600 font-medium">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-600 flex items-center justify-center text-[9px] font-bold">3</span>
                    Click Generate (or use a focus card)
                  </span>
                </div>
                {/* Admin note */}
                <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-amber-600">
                  <Settings className="w-3 h-3 flex-shrink-0" />
                  <span>
                    Requires a GenAI provider configured in{' '}
                    <strong>Admin → AI Engine → Provider Setup</strong>.
                    Supports OpenAI, Anthropic Claude, Google Gemini, and Ollama.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Focus Area Grid */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Select Focus Area &amp; Generate:</p>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_AREAS.map(f => {
                const FIcon = f.icon;
                return (
                  <button key={f.label}
                    onClick={() => fetchLandscape(f.value)}
                    disabled={loading.landscape}
                    className={cn(
                      'flex items-start gap-2.5 p-3 rounded-lg border text-left transition-colors',
                      'bg-card border-border hover:border-primary/50 hover:bg-primary/5',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}>
                    <FIcon className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground leading-none mb-0.5">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                    {loading.landscape ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground flex-shrink-0 ml-auto mt-0.5" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-muted-foreground flex-shrink-0 ml-auto mt-0.5 opacity-40" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Result */}
          {loading.landscape ? (
            <div className="space-y-2">
              <Spinner />
              <p className="text-[10px] text-center text-muted-foreground">Analyzing intelligence data — this may take 15–30 seconds...</p>
            </div>
          ) : landscapeSummary ? (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  <span>AI-generated · {lastAnalysisRun?.focus || 'Full Landscape'} · {timeRange} window</span>
                </p>
                <button onClick={() => setLandscapeSummary('')}
                  title="Clear analysis"
                  className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="prose prose-sm max-w-none text-sm text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: landscapeSummary
                    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-foreground mt-4 mb-1">$1</h4>')
                    .replace(/^## (.+)$/gm, '<h3 class="font-bold text-foreground mt-5 mb-2">$1</h3>')
                    .replace(/^# (.+)$/gm, '<h2 class="font-bold text-foreground text-lg mt-5 mb-2">$1</h2>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
                    .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
                    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
                    .replace(/\n\n/g, '<br/><br/>')
                    .replace(/\n/g, '<br/>')
                }} />
            </div>
          ) : (
            <EmptyState message="No analysis generated yet"
              sub="Choose a focus area above to generate a targeted AI threat brief, or click Generate for a full landscape overview" />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* PANEL 7: INTEL INGESTION                                     */}
      {/* ============================================================ */}
      {activePanel === 'intel_ingestion' && (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Intelligence Ingestion Hub
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload documents, add feeds, or paste URLs. GenAI extracts IOCs, TTPs, and threat actors automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Document Upload */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <FileText className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground">Upload Documents</h4>
                <span className="text-[10px] text-muted-foreground ml-auto">PDF, Word, Excel, CSV, HTML, TXT — 50MB max</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Upload threat reports, intel bulletins, IOC lists, or research documents.
                GenAI will read each file like a TI researcher — extracting all indicators,
                TTPs, and threat actor mentions into searchable intelligence.
              </p>
              <FileUploadDropzone
                onFilesSelected={handleFilesSelected}
                accept=".pdf,.docx,.doc,.xlsx,.csv,.html,.htm,.txt"
                maxSize={50 * 1024 * 1024}
                maxFiles={5}
                disabled={uploading}
              />
              {uploading && (
                <div className="p-3 bg-blue-500/10 text-blue-700 rounded-lg flex items-center gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing documents with GenAI — extracting IOCs, TTPs, threat actors...
                </div>
              )}
            </div>

            {/* RIGHT: Feed / URL Ingestion */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Globe className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground">Ingest Feed or URL</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Add an RSS/Atom feed or a webpage URL. Joti will fetch, parse, and extract intelligence continuously.
              </p>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'rss', label: 'RSS Feed' },
                    { value: 'atom', label: 'Atom Feed' },
                    { value: 'website', label: 'Webpage' },
                  ].map(ft => (
                    <button key={ft.value} onClick={() => setIngestFeedType(ft.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors text-center',
                        ingestFeedType === ft.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-foreground border-border hover:border-primary/50'
                      )}>
                      {ft.label}
                    </button>
                  ))}
                </div>
                <input type="url" value={ingestUrl} onChange={e => setIngestUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleIngestUrl()}
                  placeholder={ingestFeedType === 'website' ? 'https://example.com/threat-intel' : 'https://example.com/rss.xml'}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input type="text" value={ingestTitle} onChange={e => setIngestTitle(e.target.value)}
                  placeholder="Feed name (optional)"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <button onClick={handleIngestUrl} disabled={ingesting || !ingestUrl.trim()}
                  className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {ingesting ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><Plus className="w-4 h-4" /> Add &amp; Ingest</>}
                </button>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-foreground">Supported Sources</p>
                {[
                  'CISA, MITRE, US-CERT advisories',
                  'Vendor blogs (Microsoft, CrowdStrike, Mandiant)',
                  'IOC feeds (Abuse.ch, URLhaus, OTX)',
                  'Any RSS/Atom cybersecurity feed',
                ].map((tip, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {tip}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Ingestion History */}
          {uploadResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-primary" /> Ingestion History
                </h4>
                <button onClick={() => setUploadResults([])}
                  className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {uploadResults.map((result, i) => (
                  <div key={i} className={cn(
                    'p-3 rounded-lg border text-sm',
                    result.status === 'success' ? 'bg-green-500/5 border-green-500/30'
                      : result.status === 'duplicate' ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-red-500/5 border-red-500/30'
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground text-xs truncate max-w-xs">
                        {result.articleTitle || result.filename}
                      </span>
                      <div className="flex gap-2 flex-shrink-0">
                        {(result.iocCount ?? 0) > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-700 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> {result.iocCount} IOCs
                          </span>
                        )}
                        {(result.ttpCount ?? 0) > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-700 flex items-center gap-1">
                            <Crosshair className="w-3 h-3" /> {result.ttpCount} TTPs
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={cn('text-[10px] mt-0.5',
                      result.status === 'success' ? 'text-green-600'
                        : result.status === 'duplicate' ? 'text-amber-600' : 'text-red-600'
                    )}>{result.message}</p>
                    {result.executiveSummary && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic line-clamp-2">{result.executiveSummary}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info box when no history */}
          {uploadResults.length === 0 && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-blue-500" /> How GenAI Processes Your Documents
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                {[
                  { icon: FileText, label: 'Reads Full Content', desc: 'Parses PDF, Word, Excel, CSV, HTML and plain text completely' },
                  { icon: Brain, label: 'GenAI Extraction', desc: 'Extracts IOCs (12 types), MITRE TTPs, threat actors, CVEs, and infrastructure' },
                  { icon: Database, label: 'Searchable Intel', desc: 'Stored as intelligence articles — searchable by IOC, TTP, actor, or filename' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="text-center p-2">
                    <Icon className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
                    <p className="text-[11px] font-medium text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS                                                        */}
      {/* ============================================================ */}

      {/* Add IOC Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Intelligence Indicator
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Value *</label>
                <input type="text" value={manualForm.value}
                  onChange={e => setManualForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="e.g., 192.168.1.100, evil.com, CVE-2024-1234..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Type</label>
                  <select value={manualForm.intelligence_type}
                    onChange={e => setManualForm(f => ({ ...f, intelligence_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="IOC">IOC</option>
                    <option value="TTP">TTP</option>
                    <option value="THREAT_ACTOR">Threat Actor</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">IOC Type</label>
                  <select value={manualForm.ioc_type}
                    onChange={e => setManualForm(f => ({ ...f, ioc_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="ip">IP</option>
                    <option value="domain">Domain</option>
                    <option value="url">URL</option>
                    <option value="hash_md5">Hash (MD5)</option>
                    <option value="hash_sha1">Hash (SHA1)</option>
                    <option value="hash_sha256">Hash (SHA256)</option>
                    <option value="email">Email</option>
                    <option value="cve">CVE</option>
                    <option value="file_path">File Path</option>
                    <option value="registry_key">Registry Key</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Confidence ({manualForm.confidence}%)</label>
                <input type="range" min="0" max="100" value={manualForm.confidence}
                  onChange={e => setManualForm(f => ({ ...f, confidence: parseInt(e.target.value) }))}
                  className="w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Evidence / Context</label>
                <textarea value={manualForm.evidence}
                  onChange={e => setManualForm(f => ({ ...f, evidence: e.target.value }))}
                  placeholder="Describe where this indicator was found or why it's relevant..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Notes</label>
                <input type="text" value={manualForm.notes}
                  onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={handleSubmitManualIOC} disabled={!manualForm.value.trim() || loading.submit}
                className="flex items-center gap-1 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
                {loading.submit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImportModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4" /> Bulk Import IOCs
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Paste one indicator per line. Format: <code className="bg-muted px-1 rounded">value,type,confidence</code>
              <br />Example: <code className="bg-muted px-1 rounded">192.168.1.1,ip,80</code>
            </p>
            <textarea value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="192.168.1.100,ip,85&#10;evil-domain.com,domain,70&#10;abc123def456...,hash_sha256,90"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-48" />
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-muted-foreground">{importText.split('\n').filter(Boolean).length} lines</span>
              <div className="flex gap-2">
                <button onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                <button onClick={handleBulkImport} disabled={!importText.trim() || loading.import}
                  className="flex items-center gap-1 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
                  {loading.import ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Import
                </button>
              </div>
            </div>
          </div>
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
