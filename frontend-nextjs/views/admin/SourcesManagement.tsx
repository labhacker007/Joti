'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, ExternalLink, CheckCircle, AlertCircle, Edit2, Rss, Activity, Clock, Settings } from 'lucide-react';
import { sourcesAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';
import { isSafeExternalUrl } from '@/utils/url';

interface Source {
  id: string;
  name: string;
  url: string;
  source_type: string;
  feed_type?: string;
  is_active: boolean;
  last_fetched?: string;
  article_count?: number;
  description?: string;
}

interface AddSourceForm {
  name: string;
  url: string;
  sourceType: 'rss' | 'atom' | 'html' | 'api' | 'custom';
  description: string;
}

const INTERVAL_PRESETS = [
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' },
];

export default function SourcesManagement() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [ingestingAll, setIngestingAll] = useState(false);
  const [form, setForm] = useState<AddSourceForm>({
    name: '',
    url: '',
    sourceType: 'rss',
    description: '',
  });

  // Polling settings state
  const [showPollingSettings, setShowPollingSettings] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(60);
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(true);
  const [minInterval, setMinInterval] = useState(5);
  const [maxInterval, setMaxInterval] = useState(1440);
  const [concurrentLimit, setConcurrentLimit] = useState(5);
  const [savingPolling, setSavingPolling] = useState(false);

  useEffect(() => {
    fetchSources();
    fetchPollingSettings();
  }, []);

  const fetchPollingSettings = async () => {
    try {
      const res = (await sourcesAPI.getSystemRefreshSettings()) as any;
      const data = res.data || res;
      if (data) {
        setPollingInterval(data.default_refresh_interval_minutes || 60);
        setAutoFetchEnabled(data.auto_fetch_enabled !== false);
        setMinInterval(data.min_refresh_interval_minutes || 5);
        setMaxInterval(data.max_refresh_interval_minutes || 1440);
        setConcurrentLimit(data.concurrent_fetch_limit || 5);
      }
    } catch {
      // Use defaults silently
    }
  };

  const savePollingSettings = async () => {
    setSavingPolling(true);
    try {
      await sourcesAPI.updateSystemRefreshSettings({
        default_refresh_interval_minutes: pollingInterval,
        auto_fetch_enabled: autoFetchEnabled,
        min_refresh_interval_minutes: minInterval,
        max_refresh_interval_minutes: maxInterval,
        concurrent_fetch_limit: concurrentLimit,
      });
      setSuccessMessage('Polling settings saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Failed to save polling settings');
    } finally {
      setSavingPolling(false);
    }
  };

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await sourcesAPI.getSources(1, 100) as any;
      setSources(response.data || response || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load sources');
      console.error('Sources error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) {
      setError('Name and URL are required');
      return;
    }

    try {
      const sourceData: any = {
        name: form.name,
        url: form.url,
        feed_type: form.sourceType,
        is_active: true,
      };
      if (form.description) {
        sourceData.description = form.description;
      }

      if (editingSourceId) {
        // Update existing source
        await sourcesAPI.updateSource(editingSourceId, sourceData);
        setSuccessMessage('Source updated successfully');
        setEditingSourceId(null);
      } else {
        // Create new source
        await sourcesAPI.createSource(sourceData);
        setSuccessMessage('Source added successfully');
      }

      setForm({ name: '', url: '', sourceType: 'rss', description: '' });
      setShowAddForm(false);
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchSources();
    } catch (err: any) {
      setError(err.message || 'Failed to add source');
    }
  };

  const handleEditSource = (source: Source) => {
    setForm({
      name: source.name,
      url: source.url,
      sourceType: ((source.feed_type || source.source_type) as any) || 'rss',
      description: source.description || '',
    });
    setEditingSourceId(source.id);
    setShowAddForm(true);
  };

  const handleToggleActive = async (source: Source) => {
    try {
      await sourcesAPI.updateSource(source.id, { is_active: !source.is_active });
      setSuccessMessage(`Source ${!source.is_active ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchSources();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle source status');
    }
  };

  const handleCancelEdit = () => {
    setForm({ name: '', url: '', sourceType: 'rss', description: '' });
    setEditingSourceId(null);
    setShowAddForm(false);
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;

    try {
      await sourcesAPI.deleteSource(sourceId);
      setSuccessMessage('Source deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchSources();
    } catch (err: any) {
      setError(err.message || 'Failed to delete source');
    }
  };

  const handleIngestSource = async (sourceId: string) => {
    try {
      setIngesting(sourceId);
      await sourcesAPI.triggerFetch(sourceId);
      setSuccessMessage('Source ingestion started');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchSources();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest source');
    } finally {
      setIngesting(null);
    }
  };

  const handleIngestAll = async () => {
    try {
      setIngestingAll(true);
      setError('');
      await sourcesAPI.ingestAll();
      setSuccessMessage('Ingestion started for all active sources');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchSources();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIngestingAll(false);
    }
  };

  const activeCount = sources.filter((s) => s.is_active).length;

  const sourceTypeLabels: Record<string, string> = {
    rss: 'RSS Feed',
    atom: 'Atom Feed',
    html: 'HTML Webpage',
    api: 'API Endpoint',
    custom: 'Custom Source',
  };

  const sourceTypeColors: Record<string, string> = {
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
          <p className="text-muted-foreground">Loading sources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Rss className="w-5 h-5" />
            Feed Sources Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Manage global feed sources for all users</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleIngestAll}
            disabled={ingestingAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', ingestingAll && 'animate-spin')} />
            {ingestingAll ? 'Ingesting...' : 'Ingest All'}
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (editingSourceId) handleCancelEdit();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Source
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Total Sources</p>
          <p className="text-lg font-bold text-foreground flex items-center gap-2">
            <Rss className="w-4 h-4 text-blue-600" />
            {sources.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Active Sources</p>
          <p className="text-lg font-bold text-green-600 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {activeCount}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Disabled</p>
          <p className="text-lg font-bold text-muted-foreground flex items-center gap-2">
            {sources.length - activeCount}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 text-red-700 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 text-green-700 rounded-md flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{successMessage}</div>
        </div>
      )}

      {showAddForm && (
        <div className="mb-6 p-6 border border-border rounded-lg bg-card">
          <h2 className="text-sm font-semibold mb-4">
            {editingSourceId ? 'Edit Source' : 'Add New Source'}
          </h2>
          <form onSubmit={handleAddSource} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Source Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., CISA Alerts, Threat Feed"
                className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Source URL *
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="e.g., https://example.com/feed.xml"
                className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Source Type
              </label>
              <select
                value={form.sourceType}
                onChange={(e) => setForm({ ...form, sourceType: e.target.value as any })}
                className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="rss">RSS Feed</option>
                <option value="atom">Atom Feed</option>
                <option value="html">HTML Webpage</option>
                <option value="api">API Endpoint</option>
                <option value="custom">Custom Source</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description (Optional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description of this source..."
                rows={3}
                className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                {editingSourceId ? 'Update Source' : 'Add Source'}
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
        {sources.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <div className="text-muted-foreground mb-2">No sources added yet</div>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-primary hover:underline"
            >
              Add your first source
            </button>
          </div>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="border border-border rounded-lg p-4 bg-card hover:bg-card/80 transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-foreground">{source.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        sourceTypeColors[(source.feed_type || source.source_type)] || 'bg-gray-500/10 text-gray-700'
                      }`}
                    >
                      {sourceTypeLabels[(source.feed_type || source.source_type)] || (source.feed_type || source.source_type)}
                    </span>
                    {source.is_active ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Disabled
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-1 break-all">{source.url}</p>

                  {source.description && (
                    <p className="text-sm text-muted-foreground mb-3">{source.description}</p>
                  )}

                  <div className="flex gap-6 text-sm text-muted-foreground">
                    {source.article_count !== undefined && (
                      <div>
                        <span className="font-medium">{source.article_count}</span> articles
                      </div>
                    )}
                    {source.last_fetched && (
                      <div>
                        Last fetched:{' '}
                        <span className="font-medium">
                          {new Date(source.last_fetched).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(source)}
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                    style={{ backgroundColor: source.is_active ? 'var(--color-primary, #3b82f6)' : '#d1d5db' }}
                    title={source.is_active ? 'Disable source' : 'Enable source'}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        source.is_active ? 'translate-x-[18px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => handleIngestSource(source.id)}
                    disabled={ingesting === source.id || !source.is_active}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary disabled:opacity-50"
                    title="Trigger manual ingestion"
                  >
                    <RefreshCw className={`w-4 h-4 ${ingesting === source.id ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => handleEditSource(source)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                    title="Edit source"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {isSafeExternalUrl(source.url) && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                      title="Open source in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDeleteSource(source.id)}
                    className="p-2 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-500/10"
                    title="Delete source"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Polling Settings */}
      <div className="mt-8 border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setShowPollingSettings(!showPollingSettings)}
          className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Feed Polling Settings</h3>
          </div>
          <Settings className={cn('w-4 h-4 text-muted-foreground transition-transform', showPollingSettings && 'rotate-90')} />
        </button>

        {showPollingSettings && (
          <div className="p-4 space-y-4 border-t border-border bg-card">
            {/* Auto-fetch toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Auto-fetch enabled</label>
                <p className="text-xs text-muted-foreground">Automatically poll feed sources on schedule</p>
              </div>
              <button
                onClick={() => setAutoFetchEnabled(!autoFetchEnabled)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  autoFetchEnabled ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  autoFetchEnabled ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>

            {/* Default interval */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Default polling interval</label>
              <div className="flex flex-wrap gap-2">
                {INTERVAL_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setPollingInterval(preset.value)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                      pollingInterval === preset.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Min/Max + Concurrent */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Min interval (min)</label>
                <input
                  type="number"
                  value={minInterval}
                  onChange={(e) => setMinInterval(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg"
                  min={1}
                  max={60}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Max interval (min)</label>
                <input
                  type="number"
                  value={maxInterval}
                  onChange={(e) => setMaxInterval(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg"
                  min={60}
                  max={10080}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Concurrent fetches</label>
                <input
                  type="number"
                  value={concurrentLimit}
                  onChange={(e) => setConcurrentLimit(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg"
                  min={1}
                  max={20}
                />
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <button
                onClick={savePollingSettings}
                disabled={savingPolling}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {savingPolling ? 'Saving...' : 'Save Polling Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-blue-500/10 text-blue-700 rounded-lg border border-blue-200">
        <h3 className="font-semibold mb-2">Supported Source Types</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>RSS Feeds:</strong> Standard RSS feeds from news sites, blogs, and threat intelligence platforms
          </li>
          <li>
            <strong>Atom Feeds:</strong> Atom format feeds for modern blogging platforms
          </li>
          <li>
            <strong>HTML Webpages:</strong> Articles and blog posts from any website
          </li>
          <li>
            <strong>API Endpoints:</strong> JSON APIs that return article data
          </li>
          <li>
            <strong>Custom Sources:</strong> SharePoint, internal wikis, or custom document repositories
          </li>
        </ul>
      </div>
    </div>
  );
}
