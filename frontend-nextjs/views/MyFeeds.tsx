'use client';

import React, { useEffect, useState } from 'react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import {
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Edit2,
  Rss,
  Zap,
  Bell,
  ChevronDown,
  ChevronUp,
  Shield,
  Brain,
  Upload,
  Loader,
} from 'lucide-react';
import FileUploadDropzone from '@/components/FileUploadDropzone';
import { userFeedsAPI } from '@/api/client';
import { cn } from '@/lib/utils';
import { isSafeExternalUrl } from '@/utils/url';

interface UserFeed {
  id: string;
  name: string;
  url: string;
  feed_type: string;
  enabled: boolean;
  auto_ingest: boolean;
  notify_on_new: boolean;
  article_count?: number;
  last_ingested_at?: string;
  description?: string;
}

interface FeedArticle {
  id: number;
  title: string;
  url: string;
  summary?: string;
  executive_summary?: string;
  technical_summary?: string;
  ioc_count: number;
  ttp_count: number;
  status: string;
  published_at?: string;
  created_at?: string;
}

interface UploadResult {
  status: 'success' | 'error' | 'duplicate';
  filename: string;
  message: string;
  articleTitle?: string;
  executiveSummary?: string;
  iocCount?: number;
  ttpCount?: number;
  extractionMethod?: string;
}

interface AddFeedForm {
  name: string;
  url: string;
  feedType: string;
  autoIngest: boolean;
  notifyOnNew: boolean;
  description: string;
}

export default function MyFeeds() {
  const [feeds, setFeeds] = useState<UserFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [expandedFeedId, setExpandedFeedId] = useState<string | null>(null);
  const [feedArticles, setFeedArticles] = useState<Record<string, FeedArticle[]>>({});
  const [loadingArticles, setLoadingArticles] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [form, setForm] = useState<AddFeedForm>({
    name: '',
    url: '',
    feedType: 'rss',
    autoIngest: true,
    notifyOnNew: true,
    description: '',
  });

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      setLoading(true);
      const response = await userFeedsAPI.getMyFeeds() as any;
      setFeeds(response.data || response || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load your feeds');
      console.error('Feeds error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateUrl = async () => {
    if (!form.url.trim()) {
      setError('Please enter a feed URL');
      return;
    }

    try {
      setValidating(true);
      setValidationMessage('');
      const response = await userFeedsAPI.validateFeedUrl(form.url) as any;
      const feedInfo = response.data;
      setValidationMessage(`✓ Valid ${feedInfo.feed_type || 'feed'} - ${feedInfo.article_count || 0} articles found`);
      if (feedInfo.feed_type && form.feedType === 'auto') {
        setForm({ ...form, feedType: feedInfo.feed_type });
      }
    } catch (err: any) {
      setError(err.message || 'Invalid feed URL or unable to parse');
    } finally {
      setValidating(false);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) {
      setError('Name and URL are required');
      return;
    }

    try {
      const feedData: any = {
        name: form.name,
        url: form.url,
        feed_type: form.feedType || 'rss',
        auto_ingest: form.autoIngest,
        notify_on_new: form.notifyOnNew,
      };
      if (form.description) {
        feedData.description = form.description;
      }

      if (editingFeedId) {
        // Update existing feed
        await userFeedsAPI.updateFeed(editingFeedId, feedData);
        setSuccessMessage('Feed updated successfully');
        setEditingFeedId(null);
      } else {
        // Create new feed
        await userFeedsAPI.createFeed(feedData);
        setSuccessMessage('Feed added successfully');
      }

      setForm({
        name: '',
        url: '',
        feedType: 'rss',
        autoIngest: true,
        notifyOnNew: true,
        description: '',
      });
      setShowAddForm(false);
      setValidationMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchFeeds();
    } catch (err: any) {
      setError(err.message || 'Failed to add feed');
    }
  };

  const handleEditFeed = (feed: UserFeed) => {
    setForm({
      name: feed.name,
      url: feed.url,
      feedType: feed.feed_type || 'rss',
      autoIngest: feed.auto_ingest ?? true,
      notifyOnNew: feed.notify_on_new ?? true,
      description: feed.description || '',
    });
    setEditingFeedId(feed.id);
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setForm({
      name: '',
      url: '',
      feedType: 'rss',
      autoIngest: true,
      notifyOnNew: true,
      description: '',
    });
    setEditingFeedId(null);
    setShowAddForm(false);
    setValidationMessage('');
  };

  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm('Are you sure you want to delete this feed?')) return;

    try {
      await userFeedsAPI.deleteFeed(feedId);
      setSuccessMessage('Feed deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchFeeds();
    } catch (err: any) {
      setError(err.message || 'Failed to delete feed');
    }
  };

  const handleIngestFeed = async (feedId: string) => {
    try {
      setIngesting(feedId);
      await userFeedsAPI.triggerIngest(feedId);
      setSuccessMessage('Feed ingested successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      // Clear cached articles so next expand re-fetches with extraction data
      setFeedArticles((prev) => {
        const updated = { ...prev };
        delete updated[feedId];
        return updated;
      });
      await fetchFeeds();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest feed');
    } finally {
      setIngesting(null);
    }
  };

  const handleToggleArticles = async (feedId: string) => {
    if (expandedFeedId === feedId) {
      setExpandedFeedId(null);
      return;
    }
    setExpandedFeedId(feedId);
    if (feedArticles[feedId]) return;
    try {
      setLoadingArticles(feedId);
      const response = (await userFeedsAPI.getFeedArticles(feedId, 1, 10)) as any;
      const data = response.data || response;
      setFeedArticles((prev) => ({
        ...prev,
        [feedId]: data.articles || [],
      }));
    } catch (err: any) {
      console.error('Failed to load articles:', err);
    } finally {
      setLoadingArticles(null);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    setUploading(true);
    const results: UploadResult[] = [];
    for (const file of files) {
      try {
        const response = (await userFeedsAPI.uploadDocument(file, {
          title: file.name,
        })) as any;
        const data = response.data || response;
        results.push({
          status: data.status === 'duplicate' ? 'duplicate' : 'success',
          filename: file.name,
          message: data.message || 'Document ingested successfully',
          articleTitle: data.article_title,
          executiveSummary: data.executive_summary,
          iocCount: data.ioc_count || 0,
          ttpCount: data.ttp_count || 0,
          extractionMethod: data.extraction_method,
        });
      } catch (err: any) {
        const detail =
          err.response?.data?.detail || err.message || 'Failed to process document';
        results.push({ status: 'error', filename: file.name, message: detail });
      }
    }
    setUploadResults((prev) => [...results, ...prev]);
    setUploading(false);
  };

  const feedTypeLabels: Record<string, string> = {
    rss: 'RSS Feed',
    atom: 'Atom Feed',
    html: 'HTML Webpage',
    api: 'API Endpoint',
    custom: 'Custom Source',
  };

  const feedTypeColors: Record<string, string> = {
    rss: 'bg-blue-500/10 text-blue-700',
    atom: 'bg-cyan-500/10 text-cyan-700',
    html: 'bg-purple-500/10 text-purple-700',
    api: 'bg-orange-500/10 text-orange-700',
    custom: 'bg-gray-500/10 text-gray-700',
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your feeds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6 pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Rss className="w-8 h-8" />
            My Custom Feeds
          </h1>
          <p className="text-muted-foreground mt-1">Add and manage your personal feed sources</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowUpload(!showUpload);
              if (showAddForm) setShowAddForm(false);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (showUpload) setShowUpload(false);
              if (editingFeedId) handleCancelEdit();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Feed
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Feeds</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Rss className="w-5 h-5 text-blue-600" />
            {feeds.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Auto-Ingest</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-600" />
            {feeds.filter((f) => f.auto_ingest).length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Notifications</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            {feeds.filter((f) => f.notify_on_new).length}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-700 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-500/10 text-green-700 rounded-md flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{successMessage}</div>
        </div>
      )}

      {showUpload && (
        <div className="p-6 border border-border rounded-lg bg-card space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Upload Document</h2>
          <p className="text-sm text-muted-foreground">
            Upload PDFs, Word docs, Excel sheets, or text files. GenAI will extract IOCs, TTPs, and generate summaries.
          </p>
          <FileUploadDropzone
            onFilesSelected={handleFilesSelected}
            accept=".pdf,.docx,.doc,.xlsx,.csv,.html,.htm,.txt"
            maxSize={50 * 1024 * 1024}
            maxFiles={5}
            disabled={uploading}
          />
          {uploading && (
            <div className="p-3 bg-blue-500/10 text-blue-700 rounded-md flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing documents...</span>
            </div>
          )}
          {uploadResults.length > 0 && (
            <div className="space-y-2">
              {uploadResults.map((result, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 rounded-md border text-sm',
                    result.status === 'success'
                      ? 'bg-green-500/5 border-green-500/30'
                      : result.status === 'duplicate'
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-red-500/5 border-red-500/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {result.articleTitle || result.filename}
                    </span>
                    <div className="flex gap-2">
                      {(result.iocCount ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-700">
                          {result.iocCount} IOCs
                        </span>
                      )}
                      {(result.ttpCount ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/10 text-orange-700">
                          {result.ttpCount} TTPs
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs mt-1 ${
                    result.status === 'success' ? 'text-green-600' : result.status === 'duplicate' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {result.message}
                  </p>
                  {result.executiveSummary && (
                    <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">{result.executiveSummary}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddForm && (
        <div className="p-6 border border-border rounded-lg bg-card space-y-4">
          <h2 className="text-xl font-semibold">
            {editingFeedId ? 'Edit Feed' : 'Add New Feed'}
          </h2>
          <form onSubmit={handleAddFeed} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Feed Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Security News, Tech Blog"
                  className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Feed Type
                </label>
                <select
                  value={form.feedType}
                  onChange={(e) => setForm({ ...form, feedType: e.target.value })}
                  className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="rss">RSS Feed</option>
                  <option value="atom">Atom Feed</option>
                  <option value="html">HTML Webpage</option>
                  <option value="api">API Endpoint</option>
                  <option value="custom">Custom Source</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Feed URL *
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => {
                    setForm({ ...form, url: e.target.value });
                    setValidationMessage('');
                  }}
                  placeholder="e.g., https://example.com/feed.xml"
                  className="flex-1 px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleValidateUrl}
                  disabled={validating}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50"
                >
                  {validating ? 'Validating...' : 'Validate'}
                </button>
              </div>
              {validationMessage && (
                <p className="mt-2 text-sm text-green-600">{validationMessage}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description (Optional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description of this feed..."
                rows={2}
                className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoIngest}
                  onChange={(e) => setForm({ ...form, autoIngest: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-foreground">Auto-ingest new articles</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.notifyOnNew}
                  onChange={(e) => setForm({ ...form, notifyOnNew: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-foreground">Notify me of new articles</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                {editingFeedId ? 'Update Feed' : 'Add Feed'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {feeds.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <div className="text-muted-foreground mb-2">No custom feeds added yet</div>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-primary hover:underline"
            >
              Add your first feed
            </button>
          </div>
        ) : (
          feeds.map((feed) => (
            <div
              key={feed.id}
              className="border border-border rounded-lg p-4 bg-card hover:bg-card/80 transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{feed.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        feedTypeColors[feed.feed_type] || 'bg-gray-500/10 text-gray-700'
                      }`}
                    >
                      {feedTypeLabels[feed.feed_type] || feed.feed_type}
                    </span>
                    {feed.enabled ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-2 break-all">{feed.url}</p>

                  {feed.description && (
                    <p className="text-sm text-muted-foreground mb-2">{feed.description}</p>
                  )}

                  <div className="flex gap-6 text-sm text-muted-foreground mb-3">
                    {feed.article_count !== undefined && (
                      <div>
                        <span className="font-medium">{feed.article_count}</span> articles
                      </div>
                    )}
                    {feed.last_ingested_at && (
                      <div>
                        Last ingested:{' '}
                        <span className="font-medium">
                          {new Date(feed.last_ingested_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <ToggleSwitch
                      checked={feed.auto_ingest}
                      onChange={() => {}}
                      size="sm"
                      label="Auto-ingest"
                      disabled
                    />
                    <ToggleSwitch
                      checked={feed.notify_on_new}
                      onChange={() => {}}
                      size="sm"
                      label="Notifications"
                      disabled
                    />
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleToggleArticles(feed.id)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                    title={expandedFeedId === feed.id ? 'Hide articles' : 'View articles'}
                  >
                    {expandedFeedId === feed.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => handleIngestFeed(feed.id)}
                    disabled={ingesting === feed.id}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary disabled:opacity-50"
                    title="Trigger ingestion"
                  >
                    <RefreshCw className={`w-4 h-4 ${ingesting === feed.id ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => handleEditFeed(feed)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                    title="Edit feed"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {isSafeExternalUrl(feed.url) && (
                    <a
                      href={feed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                      title="Open feed URL"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="p-2 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-500/10"
                    title="Delete feed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expandable Articles Section */}
              {expandedFeedId === feed.id && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Articles & Findings</h4>
                  {loadingArticles === feed.id ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader className="w-4 h-4 animate-spin" />
                      Loading articles...
                    </div>
                  ) : !feedArticles[feed.id]?.length ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No articles yet. Click the refresh icon to ingest articles.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {feedArticles[feed.id].map((article) => (
                        <div key={article.id} className="p-3 rounded-md bg-secondary/50 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            {isSafeExternalUrl(article.url) ? (
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-foreground hover:text-primary"
                              >
                                {article.title}
                              </a>
                            ) : (
                              <span className="text-sm font-medium text-foreground">
                                {article.title}
                              </span>
                            )}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {article.ioc_count > 0 && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-700 flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  {article.ioc_count} IOCs
                                </span>
                              )}
                              {article.ttp_count > 0 && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/10 text-orange-700 flex items-center gap-1">
                                  <Brain className="w-3 h-3" />
                                  {article.ttp_count} TTPs
                                </span>
                              )}
                            </div>
                          </div>
                          {article.executive_summary && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {article.executive_summary}
                            </p>
                          )}
                          {article.published_at && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(article.published_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-blue-500/10 text-blue-700 rounded-lg border border-blue-200">
        <h3 className="font-semibold mb-2">How to Add Custom Feeds</h3>
        <ul className="space-y-1 text-sm">
          <li>• Paste the feed URL (RSS, Atom, or HTML webpage URL)</li>
          <li>• Click "Validate" to verify the feed is accessible</li>
          <li>• Configure auto-ingest and notification preferences</li>
          <li>• Click "Add Feed" to start receiving articles</li>
        </ul>
      </div>
    </div>
  );
}
