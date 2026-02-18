'use client';

import React, { useState, useEffect } from 'react';
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
  Search,
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

export default function ArticleDetailDrawer({ articleId, onClose, onBookmarkToggle }: Props) {
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [showIntel, setShowIntel] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (articleId) {
      fetchArticleDetail(articleId);
    } else {
      setArticle(null);
    }
  }, [articleId]);

  const fetchArticleDetail = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = (await articlesAPI.getArticleDetail(id)) as any;
      const data = response.data || response;
      setArticle(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load article');
    } finally {
      setLoading(false);
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
      setError('Failed to generate summary. Is a GenAI provider configured?');
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
    try {
      const response = await get<any>(
        `/articles/reports/${article.id}/pdf`,
        { responseType: 'blob' }
      );
      const blob = new Blob([response as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `article-${article.id}-report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export PDF.');
    } finally {
      setExporting(false);
    }
  };

  if (!articleId) return null;

  const iocs = article?.extracted_intelligence?.filter((i) => i.intelligence_type === 'IOC') || [];
  const ttps = article?.extracted_intelligence?.filter((i) => i.intelligence_type === 'TTP' || i.intelligence_type === 'ATLAS') || [];

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
                  onClick={() => onBookmarkToggle(article.id)}
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
                {article.executive_summary ? 'Re-Summarize' : 'AI Summarize'}
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

            {/* GenAI Remarks */}
            {article.genai_analysis_remarks && (
              <p className="text-xs text-muted-foreground italic">
                {article.genai_analysis_remarks}
              </p>
            )}

            {/* Executive Summary - shown directly, no tabs */}
            {article.executive_summary && (
              <div className="border border-border rounded-lg p-4 bg-primary/5">
                <h4 className="text-xs font-semibold text-primary uppercase mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Executive Summary
                </h4>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {article.executive_summary}
                </div>
              </div>
            )}

            {/* Technical Summary - collapsible */}
            {article.technical_summary && (
              <div className="border border-border rounded-lg">
                <button
                  onClick={() => setShowTechnical(!showTechnical)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    Technical Summary
                  </span>
                  {showTechnical ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showTechnical && (
                  <div className="border-t border-border p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {article.technical_summary}
                  </div>
                )}
              </div>
            )}

            {/* Intelligence Section - color-coded */}
            {(iocs.length > 0 || ttps.length > 0) && (
              <div className="border border-border rounded-lg">
                <button
                  onClick={() => setShowIntel(!showIntel)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Extracted Intelligence
                    <span className="text-xs text-muted-foreground">
                      ({iocs.length} IOCs, {ttps.length} TTPs)
                    </span>
                  </span>
                  {showIntel ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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
    </>
  );
}
