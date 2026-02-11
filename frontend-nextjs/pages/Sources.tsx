'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { sourcesAPI } from '@/api/client';

interface Source {
  id: string;
  name: string;
  url: string;
  source_type: string;
  enabled: boolean;
  last_ingested_at?: string;
  article_count?: number;
}

interface AddSourceForm {
  name: string;
  url: string;
  sourceType: 'rss' | 'html' | 'api' | 'custom';
}

export default function Sources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [form, setForm] = useState<AddSourceForm>({
    name: '',
    url: '',
    sourceType: 'rss',
  });

  useEffect(() => {
    fetchSources();
  }, []);

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
      await sourcesAPI.createSource({
        name: form.name,
        url: form.url,
        source_type: form.sourceType,
        enabled: true,
      }) as any;

      setForm({ name: '', url: '', sourceType: 'rss' });
      setShowAddForm(false);
      await fetchSources();
    } catch (err: any) {
      setError(err.message || 'Failed to add source');
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;

    try {
      await sourcesAPI.deleteSource(sourceId);
      await fetchSources();
    } catch (err: any) {
      setError(err.message || 'Failed to delete source');
    }
  };

  const handleIngestSource = async (sourceId: string) => {
    try {
      setIngesting(sourceId);
      await sourcesAPI.triggerFetch(sourceId);
      await fetchSources();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest source');
    } finally {
      setIngesting(null);
    }
  };

  const sourceTypeLabels: Record<string, string> = {
    rss: 'RSS Feed',
    html: 'HTML Webpage',
    api: 'API Endpoint',
    custom: 'Custom Source',
  };

  const sourceTypeColors: Record<string, string> = {
    rss: 'bg-blue-500/10 text-blue-700',
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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">News Feed Sources</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add Source
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 text-red-700 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {showAddForm && (
        <div className="mb-6 p-6 border border-border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Add New Source</h2>
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
                <option value="html">HTML Webpage</option>
                <option value="api">API Endpoint</option>
                <option value="custom">Custom Source</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add Source
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
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
                    <h3 className="text-lg font-semibold text-foreground">{source.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        sourceTypeColors[source.source_type] || 'bg-gray-500/10 text-gray-700'
                      }`}
                    >
                      {sourceTypeLabels[source.source_type] || source.source_type}
                    </span>
                    {source.enabled ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-3 break-all">{source.url}</p>

                  <div className="flex gap-6 text-sm text-muted-foreground">
                    {source.article_count !== undefined && (
                      <div>
                        <span className="font-medium">{source.article_count}</span> articles
                      </div>
                    )}
                    {source.last_ingested_at && (
                      <div>
                        Last ingested:{' '}
                        <span className="font-medium">
                          {new Date(source.last_ingested_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleIngestSource(source.id)}
                    disabled={ingesting === source.id}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary disabled:opacity-50"
                    title="Refresh source"
                  >
                    <RefreshCw className={`w-4 h-4 ${ingesting === source.id ? 'animate-spin' : ''}`} />
                  </button>

                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                    title="Open source in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

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

      <div className="mt-8 p-4 bg-blue-500/10 text-blue-700 rounded-lg border border-blue-200">
        <h3 className="font-semibold mb-2">Supported Source Types</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>RSS Feeds:</strong> Standard RSS/Atom feeds from news sites, blogs, and threat intelligence platforms
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
