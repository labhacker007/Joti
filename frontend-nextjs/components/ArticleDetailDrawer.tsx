'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Bookmark,
  BookmarkCheck,
  Globe,
  Calendar,
  Star,
  Sparkles,
  Shield,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileDown,
  FileText,
  FileCode,
  Search,
  Users,
  Link2,
  Download,
  Maximize2,
  Table,
} from 'lucide-react';
import { articlesAPI, get } from '@/api/client';
import { formatRelativeTime, cn } from '@/lib/utils';
import { isSafeExternalUrl } from '@/utils/url';

interface Intelligence {
  id: number;
  intelligence_type: string;
  value: string;
  confidence: number;
  mitre_id?: string;
  mitre_name?: string;
  mitre_url?: string;
  ioc_type?: string;
  source?: string;
}

interface ArticleDetail {
  id: string;
  title: string;
  summary?: string;
  executive_summary?: string;
  technical_summary?: string;
  raw_content?: string;
  normalized_content?: string;
  url?: string;
  source_name?: string;
  source_url?: string;
  published_at?: string;
  threat_category?: string;
  is_bookmarked?: boolean;
  is_read?: boolean;
  is_high_priority?: boolean;
  watchlist_match_keywords?: string[];
  extracted_intelligence?: Intelligence[];
  genai_analysis_remarks?: string;
  ioc_count?: number;
  ttp_count?: number;
}

interface Props {
  articleId: string | null;
  onClose: () => void;
  onBookmarkToggle: (id: string) => void;
}

const IOC_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  IP: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
  IPv4: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
  IPv6: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
  DOMAIN: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/30' },
  URL: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  HASH: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
  MD5: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
  SHA1: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
  SHA256: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
  CVE: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/30' },
  EMAIL: { bg: 'bg-teal-500/10', text: 'text-teal-600', border: 'border-teal-500/30' },
  FILE_PATH: { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/30' },
  REGISTRY: { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/30' },
  MUTEX: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/30' },
};

function getIocColor(type?: string) {
  if (!type) return { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' };
  const upper = type.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return IOC_TYPE_COLORS[upper] || { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' };
}

/** Convert markdown-like GenAI output to safe HTML */
function markdownToHtml(text: string): string {
  if (!text) return '';
  // Escape HTML entities first for safety
  let s = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Headers
  s = s.replace(/^### (.+)$/gm, '<h5 style="font-weight:600;font-size:0.875rem;margin:0.75rem 0 0.25rem;">$1</h5>');
  s = s.replace(/^## (.+)$/gm, '<h4 style="font-weight:600;font-size:1rem;margin:1rem 0 0.375rem;">$1</h4>');
  s = s.replace(/^# (.+)$/gm, '<h3 style="font-weight:700;font-size:1.125rem;margin:1rem 0 0.5rem;">$1</h3>');
  // Bold + italic
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.06);padding:1px 4px;border-radius:3px;font-size:0.8em;font-family:monospace;">$1</code>');
  // Bullet lists
  s = s.replace(/^[\-\*\u2022] (.+)$/gm, '<li style="margin-left:1.25rem;list-style:disc;">$1</li>');
  // Numbered lists
  s = s.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left:1.25rem;list-style:decimal;">$1</li>');
  // Wrap consecutive <li> in <ul>
  s = s.replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul style="margin:0.5rem 0;">$1</ul>');
  // Paragraphs: double newlines
  s = s.replace(/\n\n+/g, '</p><p style="margin-bottom:0.5rem;">');
  // Single newlines inside paragraphs
  s = s.replace(/\n/g, '<br/>');
  return `<p style="margin-bottom:0.5rem;">${s}</p>`;
}

/** Build a styled HTML document for export / new-tab preview */
function buildSummaryHtml(article: ArticleDetail, type: 'executive' | 'technical' | 'both'): string {
  const content = type === 'executive'
    ? article.executive_summary || ''
    : type === 'technical'
      ? article.technical_summary || ''
      : [article.executive_summary, article.technical_summary].filter(Boolean).join('\n\n---\n\n');
  const title = type === 'executive' ? 'Executive Summary' : type === 'technical' ? 'Technical Summary' : 'Intelligence Report';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${article.title} - ${title}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:2rem;color:#1a1a2e;line-height:1.7;background:#fafafa}
.header{border-bottom:3px solid #2563eb;padding-bottom:1rem;margin-bottom:1.5rem}
.header h1{font-size:1.5rem;color:#1a1a2e;margin-bottom:0.25rem}
.header .meta{font-size:0.8rem;color:#6b7280}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:600;margin-right:4px}
.badge-cat{background:#dbeafe;color:#2563eb}
.badge-priority{background:#fee2e2;color:#dc2626}
.section-title{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#2563eb;font-weight:700;margin:1.5rem 0 0.75rem;display:flex;align-items:center;gap:0.5rem}
.section-title::before{content:'';width:4px;height:1rem;background:#2563eb;border-radius:2px}
.content{font-size:0.9rem;line-height:1.8}
.content h3,.content h4,.content h5{color:#1a1a2e}
.content strong{color:#1a1a2e}
.content code{background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:0.85em}
.content li{margin-left:1.5rem;margin-bottom:0.25rem}
.footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e7eb;font-size:0.7rem;color:#9ca3af;text-align:center}
@media print{body{padding:1rem;background:#fff}}
</style></head><body>
<div class="header">
<h1>${article.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
<div class="meta">${article.source_name || ''} ${article.published_at ? '&middot; ' + new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</div>
<div style="margin-top:0.5rem">
${article.threat_category ? `<span class="badge badge-cat">${article.threat_category}</span>` : ''}
${article.is_high_priority ? '<span class="badge badge-priority">HIGH PRIORITY</span>' : ''}
</div>
</div>
${article.executive_summary && (type === 'executive' || type === 'both') ? `<div class="section-title">Executive Summary</div><div class="content">${markdownToHtml(article.executive_summary)}</div>` : ''}
${article.technical_summary && (type === 'technical' || type === 'both') ? `<div class="section-title">Technical Summary</div><div class="content">${markdownToHtml(article.technical_summary)}</div>` : ''}
${article.genai_analysis_remarks ? `<div class="footer">${article.genai_analysis_remarks} &middot; Generated by J.O.T.I</div>` : '<div class="footer">Generated by J.O.T.I</div>'}
</body></html>`;
}

/** Export IOCs as CSV */
function exportIocsCsv(iocs: Intelligence[], articleTitle: string) {
  const header = 'Type,Value,Confidence,MITRE ID,MITRE Name,Source';
  const rows = iocs.map((ioc) =>
    [
      ioc.ioc_type || ioc.intelligence_type || '',
      `"${(ioc.value || '').replace(/"/g, '""')}"`,
      ioc.confidence ?? '',
      ioc.mitre_id || '',
      `"${(ioc.mitre_name || '').replace(/"/g, '""')}"`,
      `"${(ioc.source || '').replace(/"/g, '""')}"`,
    ].join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `iocs-${articleTitle.slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Download HTML blob */
function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Open HTML in new tab */
function openInNewTab(html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Revoke after short delay so browser has time to open
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

interface SimilarArticle {
  id: number;
  title: string;
  summary?: string;
  published_at?: string;
  source_name?: string;
  url?: string;
  is_high_priority?: boolean;
  match_score: number;
  match_reasons: string[];
}

export default function ArticleDetailDrawer({ articleId, onClose, onBookmarkToggle }: Props) {
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [showTechnical, setShowTechnical] = useState(true);
  const [showIntel, setShowIntel] = useState(true);
  const [showRelated, setShowRelated] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [similarArticles, setSimilarArticles] = useState<SimilarArticle[]>([]);
  const [previewType, setPreviewType] = useState<'executive' | 'technical' | null>(null);
  const autoSummarizedRef = useRef<string | null>(null);

  useEffect(() => {
    if (articleId) {
      fetchArticleDetail(articleId);
    } else {
      setArticle(null);
      autoSummarizedRef.current = null;
    }
  }, [articleId]);

  const fetchArticleDetail = async (id: string) => {
    setLoading(true);
    setError('');
    setSimilarArticles([]);
    try {
      const response = (await articlesAPI.getArticleDetail(id)) as any;
      const data = response.data || response;
      if (!data || !data.id) {
        throw new Error('Article data is invalid or missing');
      }
      setArticle(data);
      // Auto-summarize if no summary exists and hasn't been attempted for this article
      if (!data.executive_summary && !data.technical_summary && autoSummarizedRef.current !== String(data.id)) {
        autoSummarizedRef.current = String(data.id);
        triggerAutoSummarize(data);
      }
      // Fetch similar articles in background
      articlesAPI.getSimilarArticles(id).then((res: any) => {
        const similar = (res?.similar || res?.data?.similar || []) as SimilarArticle[];
        setSimilarArticles(similar);
      }).catch(() => {/* silently ignore */});
    } catch (err: any) {
      console.error('Failed to load article:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load article';
      setError(errorMessage);
      setArticle(null);
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoSummarize = async (data: ArticleDetail) => {
    setSummarizing(true);
    try {
      const response = (await articlesAPI.summarizeArticle(data.id)) as any;
      const result = response.data || response;
      setArticle((prev) =>
        prev
          ? {
              ...prev,
              executive_summary: result.executive_summary,
              technical_summary: result.technical_summary,
              genai_analysis_remarks: `Summarized using ${result.model_used}`,
            }
          : null
      );
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail) {
        setError(detail);
      }
    } finally {
      setSummarizing(false);
    }
  };

  const handleSummarize = async () => {
    if (!article) return;
    setSummarizing(true);
    try {
      const response = (await articlesAPI.summarizeArticle(article.id)) as any;
      const data = response.data || response;
      setArticle((prev) =>
        prev
          ? {
              ...prev,
              executive_summary: data.executive_summary,
              technical_summary: data.technical_summary,
              genai_analysis_remarks: `Summarized using ${data.model_used}`,
            }
          : null
      );
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to generate summary. Is a GenAI provider configured?';
      setError(detail);
    } finally {
      setSummarizing(false);
    }
  };

  const handleExtract = async () => {
    if (!article) return;
    setExtracting(true);
    try {
      await articlesAPI.extractIntelligence(article.id);
      await fetchArticleDetail(article.id);
    } catch (err: any) {
      setError('Failed to extract intelligence.');
    } finally {
      setExtracting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!article) return;
    setExporting(true);
    setError('');
    try {
      const axios = (await import('axios')).default;
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await axios.get(
        `${API_BASE_URL}/articles/${article.id}/export/pdf`,
        {
          responseType: 'blob',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `article-${article.id}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  if (!articleId) return null;

  const iocs = article?.extracted_intelligence?.filter((i) => i.intelligence_type === 'IOC') || [];
  const ttps = article?.extracted_intelligence?.filter((i) => i.intelligence_type === 'TTP' || i.intelligence_type === 'ATLAS') || [];
  const threatActors = article?.extracted_intelligence?.filter((i) => i.intelligence_type === 'THREAT_ACTOR') || [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card border-l border-border z-50 overflow-y-auto shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-start justify-between gap-4 z-10">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
            ) : (
              <h2 className="text-lg font-semibold text-foreground line-clamp-2">
                {article?.title}
              </h2>
            )}
            {article && (
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{article.source_name}</span>
                {article.published_at && (
                  <>
                    <span>&middot;</span>
                    <span>{formatRelativeTime(article.published_at)}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {article && (
              <>
                <button
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Export as PDF"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <FileDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={async () => {
                    try {
                      await onBookmarkToggle(article.id);
                      setArticle((prev) => prev ? { ...prev, is_bookmarked: !prev.is_bookmarked } : null);
                    } catch (err) {
                      console.error('Bookmark toggle failed:', err);
                      setError('Failed to toggle bookmark');
                    }
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title={article.is_bookmarked ? 'Remove bookmark' : 'Save for later'}
                >
                  {article.is_bookmarked ? (
                    <BookmarkCheck className="w-5 h-5 text-primary" />
                  ) : (
                    <Bookmark className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error && !article ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => articleId && fetchArticleDetail(articleId)}
              className="px-4 py-2 text-xs font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : article ? (
          <div className="p-4 space-y-5">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {article.threat_category && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-500/30">
                  {article.threat_category}
                </span>
              )}
              {article.is_high_priority && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/30">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  HIGH PRIORITY
                </span>
              )}
              {article.watchlist_match_keywords?.map((kw) => (
                <span
                  key={kw}
                  className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-600 border border-yellow-500/30 flex items-center gap-1"
                >
                  <Star className="w-3 h-3" />
                  {kw}
                </span>
              ))}
            </div>

            {/* GenAI Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSummarize}
                disabled={summarizing}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  article.executive_summary
                    ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {summarizing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {summarizing ? 'Generating...' : article.executive_summary ? 'Re-Summarize' : 'AI Summarize'}
              </button>
              <button
                onClick={handleExtract}
                disabled={extracting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                {extracting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Extract IOCs/TTPs
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Auto-summarizing indicator */}
            {summarizing && !article.executive_summary && (
              <div className="p-4 border border-primary/30 rounded-lg bg-primary/5 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Generating AI Summary...</p>
                  <p className="text-xs text-muted-foreground">Analyzing article with GenAI for executive and technical summaries</p>
                </div>
              </div>
            )}

            {/* GenAI Remarks */}
            {article.genai_analysis_remarks && (
              <p className="text-xs text-muted-foreground italic">
                {article.genai_analysis_remarks}
              </p>
            )}

            {/* Executive Summary — rendered as HTML */}
            {article.executive_summary && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-primary/5 border-b border-border">
                  <h4 className="text-xs font-semibold text-primary uppercase flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Executive Summary
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewType('executive')}
                      className="p-1.5 hover:bg-primary/10 rounded text-primary/60 hover:text-primary transition-colors"
                      title="Preview in overlay"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openInNewTab(buildSummaryHtml(article, 'executive'))}
                      className="p-1.5 hover:bg-primary/10 rounded text-primary/60 hover:text-primary transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => downloadHtml(buildSummaryHtml(article, 'executive'), `executive-summary-${article.id}.html`)}
                      className="p-1.5 hover:bg-primary/10 rounded text-primary/60 hover:text-primary transition-colors"
                      title="Export as HTML"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div
                  className="p-4 text-sm text-foreground leading-relaxed summary-content"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(article.executive_summary) }}
                />
              </div>
            )}

            {/* Technical Summary — rendered as HTML, expanded by default */}
            {article.technical_summary && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <button
                    onClick={() => setShowTechnical(!showTechnical)}
                    className="flex items-center gap-2"
                  >
                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      Technical Summary
                    </span>
                    {showTechnical ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewType('technical')}
                      className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Preview in overlay"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openInNewTab(buildSummaryHtml(article, 'technical'))}
                      className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => downloadHtml(buildSummaryHtml(article, 'technical'), `technical-summary-${article.id}.html`)}
                      className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Export as HTML"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {showTechnical && (
                  <div
                    className="p-4 text-sm text-foreground leading-relaxed summary-content"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(article.technical_summary) }}
                  />
                )}
              </div>
            )}

            {/* Intelligence Section - color-coded */}
            {(iocs.length > 0 || ttps.length > 0 || threatActors.length > 0) && (
              <div className="border border-border rounded-lg">
                <button
                  onClick={() => setShowIntel(!showIntel)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Extracted Intelligence
                    <span className="text-xs text-muted-foreground">
                      ({iocs.length} IOCs · {ttps.length} TTPs{threatActors.length > 0 ? ` · ${threatActors.length} Actors` : ''})
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {iocs.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportIocsCsv(iocs, article.title);
                        }}
                        className="px-2 py-1 text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-500/30 rounded hover:bg-green-500/20 transition-colors flex items-center gap-1"
                        title="Export IOCs as CSV"
                      >
                        <Table className="w-3 h-3" />
                        CSV
                      </button>
                    )}
                    {showIntel ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                {showIntel && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* IOCs - color coded by type */}
                    {iocs.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                          Indicators of Compromise
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {iocs.map((ioc) => {
                            const colors = getIocColor(ioc.ioc_type);
                            return (
                              <span
                                key={ioc.id}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border',
                                  colors.bg, colors.text, colors.border
                                )}
                                title={`${ioc.ioc_type || 'IOC'} - Confidence: ${ioc.confidence}%`}
                              >
                                <span className="font-semibold text-[10px] uppercase opacity-70">
                                  {ioc.ioc_type || 'IOC'}
                                </span>
                                <span className="font-mono text-[11px]">{ioc.value}</span>
                                <span className="opacity-50 text-[10px]">{ioc.confidence}%</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* TTPs - as clickable MITRE links */}
                    {ttps.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                          MITRE ATT&CK TTPs
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {ttps.map((ttp) => {
                            const mitreUrl = (ttp.mitre_url && isSafeExternalUrl(ttp.mitre_url))
                              ? ttp.mitre_url
                              : (ttp.mitre_id ? `https://attack.mitre.org/techniques/${ttp.mitre_id.replace('.', '/')}/` : null);
                            const Tag = mitreUrl ? 'a' : 'span';
                            return (
                              <Tag
                                key={ttp.id}
                                {...(mitreUrl ? {
                                  href: mitreUrl,
                                  target: '_blank',
                                  rel: 'noopener noreferrer',
                                } : {})}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border',
                                  'bg-red-500/10 text-red-600 border-red-500/30',
                                  mitreUrl && 'hover:bg-red-500/20 cursor-pointer'
                                )}
                                title={`Confidence: ${ttp.confidence}%`}
                              >
                                {ttp.mitre_id && (
                                  <span className="font-mono font-semibold text-[10px]">
                                    {ttp.mitre_id}
                                  </span>
                                )}
                                <span className="text-[11px]">
                                  {ttp.mitre_name || ttp.value}
                                </span>
                                {mitreUrl && <ExternalLink className="w-2.5 h-2.5 opacity-50" />}
                              </Tag>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Threat Actors */}
                    {threatActors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Threat Actors
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {threatActors.map((actor) => (
                            <span
                              key={actor.id}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border bg-purple-500/10 text-purple-600 border-purple-500/30"
                              title={`Confidence: ${actor.confidence}%`}
                            >
                              <Users className="w-3 h-3 opacity-70" />
                              <span className="text-[11px] font-medium">{actor.value}</span>
                              <span className="opacity-50 text-[10px]">{actor.confidence}%</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Related Articles */}
            {similarArticles.length > 0 && (
              <div className="border border-border rounded-lg">
                <button
                  onClick={() => setShowRelated(!showRelated)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    Related Articles
                    <span className="text-xs text-muted-foreground">({similarArticles.length})</span>
                  </span>
                  {showRelated ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showRelated && (
                  <div className="border-t border-border divide-y divide-border">
                    {similarArticles.map((sim) => (
                      <div key={sim.id} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            className="text-sm font-medium text-left text-foreground hover:text-primary line-clamp-2 transition-colors"
                            onClick={() => {
                              setArticle(null);
                              fetchArticleDetail(String(sim.id));
                            }}
                          >
                            {sim.title}
                          </button>
                          {sim.is_high_priority && (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        {sim.source_name && (
                          <p className="text-xs text-muted-foreground mt-1">{sim.source_name}</p>
                        )}
                        {sim.match_reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {sim.match_reasons.map((reason, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* External Link */}
            {article.url && isSafeExternalUrl(article.url) && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Read Full Article
              </a>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Article not found
          </div>
        )}
      </div>

      {/* Summary Preview Overlay */}
      {previewType && article && (
        <>
          <div className="fixed inset-0 bg-black/70 z-[60]" onClick={() => setPreviewType(null)} />
          <div className="fixed inset-4 md:inset-12 bg-white rounded-xl z-[60] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">
                {previewType === 'executive' ? 'Executive Summary' : 'Technical Summary'} Preview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openInNewTab(buildSummaryHtml(article, previewType))}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  New Tab
                </button>
                <button
                  onClick={() => downloadHtml(buildSummaryHtml(article, previewType), `${previewType}-summary-${article.id}.html`)}
                  className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  HTML
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  PDF
                </button>
                <button
                  onClick={() => setPreviewType(null)}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <iframe
              srcDoc={buildSummaryHtml(article, previewType)}
              className="flex-1 w-full border-0"
              title="Summary Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </>
      )}
    </>
  );
}
