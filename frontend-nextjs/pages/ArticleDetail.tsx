'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Loader,
  AlertCircle,
} from 'lucide-react';
import { articlesAPI } from '@/api/client';
import { formatDate, cn } from '@/lib/utils';

interface Article {
  id: string;
  title: string;
  content: string;
  source: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  published_at: string;
  url: string;
  is_bookmarked: boolean;
  is_read: boolean;
  status: string;
  technical_summary?: string;
  executive_summary?: string;
}

interface IOC {
  type: string;
  value: string;
  count: number;
}

interface TTP {
  tactic: string;
  technique: string;
  mitre_id: string;
}

export default function ArticleDetail() {
  const router = useRouter();
  const params = useParams();
  const articleId = params?.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [iocs, setIocs] = useState<IOC[]>([]);
  const [ttps, setTtps] = useState<TTP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedIoc, setCopiedIoc] = useState<string>('');
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  const loadArticle = async () => {
    try {
      setLoading(true);
      setError('');

      // Load article
      const articleRes = await articlesAPI.getArticle(articleId);
      setArticle(articleRes.data as Article);
      setIsBookmarked((articleRes.data as Article).is_bookmarked);

      // Mark as read
      await articlesAPI.markAsRead(articleId);

      // Load IOCs and TTPs (mock for now, would come from API)
      // In real implementation: await articlesAPI.getIocs(articleId)
      setIocs([
        { type: 'IP', value: '192.168.1.1', count: 3 },
        { type: 'Domain', value: 'malicious.com', count: 2 },
        { type: 'File Hash', value: 'a1b2c3d4e5f6...', count: 1 },
      ]);

      setTtps([
        { tactic: 'Initial Access', technique: 'Phishing', mitre_id: 'T1566' },
        { tactic: 'Execution', technique: 'PowerShell', mitre_id: 'T1059.001' },
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load article');
      console.error('Article load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookmarkToggle = async () => {
    try {
      await articlesAPI.toggleBookmark(articleId);
      setIsBookmarked(!isBookmarked);
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  const handleCopyIoc = (ioc: string) => {
    navigator.clipboard.writeText(ioc);
    setCopiedIoc(ioc);
    setTimeout(() => setCopiedIoc(''), 2000);
  };

  const handleExport = (format: 'pdf' | 'csv' | 'html') => {
    // In real implementation: articlesAPI.exportArticle(articleId, format)
    console.log(`Export as ${format.toUpperCase()}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </button>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-600">Error Loading Article</p>
            <p className="text-sm text-red-600/80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </button>
        <div className="text-center text-muted-foreground">Article not found</div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      CRITICAL: 'bg-red-500/10 text-red-600 border-red-500/30',
      HIGH: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
      MEDIUM: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      LOW: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      INFO: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
    };
    return colors[severity] || colors.INFO;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBookmarkToggle}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isBookmarked
                ? 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
            title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            <Bookmark className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Article Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-foreground leading-tight mb-4">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium border',
                  getSeverityColor(article.severity)
                )}
              >
                {article.severity}
              </span>
              <span className="text-sm text-muted-foreground">{article.source}</span>
              <span className="text-sm text-muted-foreground">
                {formatDate(article.published_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Article Meta */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
            <p className="text-sm font-medium text-foreground mt-1">{article.status}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Read Status</p>
            <p className="text-sm font-medium text-foreground mt-1 flex items-center gap-1">
              {article.is_read ? (
                <>
                  <Eye className="w-4 h-4" /> Read
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" /> Unread
                </>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Original</p>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1 mt-1"
            >
              View Source <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      {article.executive_summary && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Executive Summary</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">{article.executive_summary}</p>
        </div>
      )}

      {/* Technical Summary */}
      {article.technical_summary && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Technical Summary</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">{article.technical_summary}</p>
        </div>
      )}

      {/* Article Content */}
      <div className="prose prose-dark max-w-none">
        <div className="bg-card border border-border rounded-lg p-6 text-foreground text-sm leading-relaxed whitespace-pre-wrap">
          {article.content}
        </div>
      </div>

      {/* IOCs Table */}
      {iocs.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Indicators of Compromise (IOCs)</h2>
            <p className="text-sm text-muted-foreground mt-1">{iocs.length} indicators extracted</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Value</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">Count</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {iocs.map((ioc, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-600">
                        {ioc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-foreground break-all">{ioc.value}</td>
                    <td className="px-6 py-4 text-center text-sm text-muted-foreground">{ioc.count}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleCopyIoc(ioc.value)}
                        className={cn(
                          'p-1 rounded transition-colors',
                          copiedIoc === ioc.value
                            ? 'bg-green-500/10 text-green-600'
                            : 'hover:bg-muted text-muted-foreground'
                        )}
                        title="Copy to clipboard"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TTPs Table */}
      {ttps.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Tactics & Techniques (MITRE ATT&CK)</h2>
            <p className="text-sm text-muted-foreground mt-1">{ttps.length} techniques identified</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Tactic</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Technique</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">MITRE ID</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Reference</th>
                </tr>
              </thead>
              <tbody>
                {ttps.map((ttp, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{ttp.tactic}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{ttp.technique}</td>
                    <td className="px-6 py-4 text-center text-sm font-mono text-muted-foreground">
                      {ttp.mitre_id}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`https://attack.mitre.org/techniques/${ttp.mitre_id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        <ExternalLink className="w-4 h-4 inline" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Export Article</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export as PDF
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export as CSV
          </button>
          <button
            onClick={() => handleExport('html')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export as HTML
          </button>
        </div>
      </div>
    </div>
  );
}
