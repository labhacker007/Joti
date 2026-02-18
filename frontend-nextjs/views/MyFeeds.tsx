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
} from 'lucide-react';
import { userFeedsAPI } from '@/api/client';
import { cn } from '@/lib/utils';

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
      setSuccessMessage('Feed ingestion started');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchFeeds();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest feed');
    } finally {
      setIngesting(null);
    }
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
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (editingFeedId) handleCancelEdit();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add Feed
        </button>
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

                  <a
                    href={feed.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                    title="Open feed URL"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="p-2 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-500/10"
                    title="Delete feed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
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
