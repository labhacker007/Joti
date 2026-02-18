'use client';

import React, { useEffect, useState } from 'react';
import {
  Plug,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Zap,
  RefreshCw,
  Settings,
  Shield,
  Cloud,
  Server,
} from 'lucide-react';
import { connectorsAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';

interface ConfigItem {
  key: string;
  value: string;
  category: string;
  description?: string;
  is_secret?: boolean;
}

interface ConnectorSummary {
  total: number;
  active: number;
  types: string[];
}

const CATEGORIES = [
  { key: 'siem', label: 'SIEM', icon: Shield, color: 'text-blue-600' },
  { key: 'edr', label: 'EDR', icon: Shield, color: 'text-green-600' },
  { key: 'cloud', label: 'Cloud Security', icon: Cloud, color: 'text-cyan-600' },
  { key: 'enrichment', label: 'Enrichment', icon: Zap, color: 'text-purple-600' },
  { key: 'notification', label: 'Notification', icon: Settings, color: 'text-orange-600' },
  { key: 'ticketing', label: 'Ticketing', icon: Server, color: 'text-pink-600' },
];

export default function ConnectorManagement() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [summary, setSummary] = useState<ConnectorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [formData, setFormData] = useState({
    key: '',
    value: '',
    category: 'siem',
    description: '',
    is_secret: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [connRes, configRes] = await Promise.allSettled([
        connectorsAPI.getConnectors(),
        connectorsAPI.getConfigurations(),
      ]);

      if (connRes.status === 'fulfilled') {
        const data = (connRes.value as any)?.data || connRes.value;
        setSummary(data);
      }

      if (configRes.status === 'fulfilled') {
        const data = (configRes.value as any)?.data || configRes.value;
        setConfigs(Array.isArray(data) ? data : data?.configurations || []);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = async () => {
    if (!formData.key.trim() || !formData.value.trim()) {
      setError('Key and value are required');
      return;
    }

    try {
      setError('');
      await connectorsAPI.saveConfiguration({
        key: formData.key.trim(),
        value: formData.value.trim(),
        category: formData.category,
        description: formData.description || undefined,
        is_secret: formData.is_secret,
      });

      setSuccess('Configuration saved successfully');
      setShowAddForm(false);
      setFormData({ key: '', value: '', category: 'siem', description: '', is_secret: false });
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteConfig = async (category: string, key: string) => {
    if (!confirm(`Delete configuration "${key}"?`)) return;

    try {
      setError('');
      await connectorsAPI.deleteConfiguration(category, key);
      setSuccess('Configuration deleted');
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleTestConfig = async (category: string) => {
    try {
      setTesting(category);
      setError('');
      const result = await connectorsAPI.testConfiguration(category) as any;
      const data = result?.data || result;
      if (data?.success || data?.status === 'ok') {
        setSuccess(`${category} connection test passed`);
      } else {
        setSuccess(`Test result: ${data?.message || 'Completed'}`);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(null);
    }
  };

  const filteredConfigs = activeCategory === 'all'
    ? configs
    : configs.filter((c) => c.category === activeCategory);

  const categoryGroups = CATEGORIES.map((cat) => ({
    ...cat,
    count: configs.filter((c) => c.category === cat.key).length,
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading connectors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Plug className="w-8 h-8" />
            Connectors
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage integration configurations and external connections
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add Configuration
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Configurations</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            {configs.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plug className="w-5 h-5 text-purple-600" />
            {categoryGroups.filter((c) => c.count > 0).length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active Connectors</p>
          <p className="text-2xl font-bold text-green-600 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            {summary?.active || 0}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 text-red-700 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-500/10 text-green-700 rounded-md flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-6 p-6 border border-border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Add Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Key *</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="e.g., api_key, base_url, username"
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Value *</label>
              <input
                type={formData.is_secret ? 'password' : 'text'}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Configuration value"
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_secret}
                onChange={(e) => setFormData({ ...formData, is_secret: e.target.checked })}
                className="rounded border-border"
              />
              Secret value (will be masked)
            </label>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddConfig}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Save Configuration
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({ key: '', value: '', category: 'siem', description: '', is_secret: false });
              }}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
        >
          All ({configs.length})
        </button>
        {categoryGroups.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeCategory === cat.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label} ({cat.count})
            </button>
          );
        })}
      </div>

      {/* Configurations List */}
      {filteredConfigs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Plug className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No configurations found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add connector configurations to integrate with external platforms
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConfigs.map((config, idx) => {
            const catInfo = CATEGORIES.find((c) => c.key === config.category);
            const CatIcon = catInfo?.icon || Settings;
            return (
              <div
                key={`${config.category}-${config.key}-${idx}`}
                className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <CatIcon className={cn('w-5 h-5', catInfo?.color || 'text-gray-600')} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{config.key}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 capitalize">
                        {config.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {config.is_secret ? '••••••••••••' : config.value}
                    </p>
                    {config.description && (
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestConfig(config.category)}
                    disabled={testing === config.category}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary disabled:opacity-50"
                    title="Test connection"
                  >
                    <Zap className={cn('w-4 h-4', testing === config.category && 'animate-pulse')} />
                  </button>
                  <button
                    onClick={() => handleDeleteConfig(config.category, config.key)}
                    className="p-2 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
