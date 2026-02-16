'use client';

import React, { useEffect, useState } from 'react';
import {
  Brain,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Zap,
  Server,
  ToggleRight,
  ToggleLeft,
  Settings,
  Activity,
} from 'lucide-react';
import { genaiAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';

interface ProviderInfo {
  provider: string;
  status: string;
  models?: string[];
  error?: string;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  model_type?: string;
}

interface GenAIConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  is_default?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export default function GenAIManagement() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [configs, setConfigs] = useState<GenAIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'models' | 'configs'>('status');

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

      const [providerRes, modelRes, configRes] = await Promise.allSettled([
        genaiAPI.getProviderStatus(),
        genaiAPI.getAdminModels(),
        genaiAPI.getConfigs(),
      ]);

      if (providerRes.status === 'fulfilled') {
        const data = (providerRes.value as any)?.data || providerRes.value;
        setProviders(Array.isArray(data) ? data : data?.providers || []);
      }

      if (modelRes.status === 'fulfilled') {
        const data = (modelRes.value as any)?.data || modelRes.value;
        setModels(Array.isArray(data) ? data : data?.models || []);
      }

      if (configRes.status === 'fulfilled') {
        const data = (configRes.value as any)?.data || configRes.value;
        setConfigs(Array.isArray(data) ? data : data?.configs || []);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSyncModels = async () => {
    try {
      setSyncing(true);
      setError('');
      await genaiAPI.syncModels();
      setSuccess('Models synced successfully');
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleModel = async (modelId: string) => {
    try {
      setError('');
      await genaiAPI.toggleModel(modelId);
      setModels((prev) =>
        prev.map((m) =>
          m.id === modelId ? { ...m, enabled: !m.enabled } : m
        )
      );
      setSuccess('Model toggled successfully');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleTestGenAI = async () => {
    try {
      setTesting(true);
      setError('');
      const result = await genaiAPI.testGenAI() as any;
      const data = result?.data || result;
      if (data?.status === 'ok' || data?.success) {
        setSuccess('GenAI connection test passed');
      } else {
        setSuccess(`Test result: ${data?.message || 'Completed'}`);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  const enabledModels = models.filter((m) => m.enabled).length;

  const tabs = [
    { key: 'status' as const, label: 'Provider Status', icon: Activity },
    { key: 'models' as const, label: 'Models', icon: Brain },
    { key: 'configs' as const, label: 'Configurations', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading GenAI configuration...</p>
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
            <Brain className="w-8 h-8" />
            GenAI Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure AI providers, models, and settings
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTestGenAI}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
          >
            <Zap className={cn('w-4 h-4', testing && 'animate-pulse')} />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleSyncModels}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            Sync Models
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Providers</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            {providers.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Available Models</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            {models.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Enabled Models</p>
          <p className="text-2xl font-bold text-green-600 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            {enabledModels}
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

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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

      {/* Tab Content: Provider Status */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          {providers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Server className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No AI providers configured</p>
              <p className="text-xs text-muted-foreground mt-1">
                Configure environment variables for OpenAI, Anthropic, or Ollama
              </p>
            </div>
          ) : (
            providers.map((provider, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-foreground capitalize">
                      {provider.provider}
                    </p>
                    {provider.models && (
                      <p className="text-xs text-muted-foreground">
                        {provider.models.length} models available
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    provider.status === 'available' || provider.status === 'connected'
                      ? 'bg-green-500/10 text-green-700'
                      : provider.status === 'error'
                        ? 'bg-red-500/10 text-red-700'
                        : 'bg-yellow-500/10 text-yellow-700'
                  )}
                >
                  {provider.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: Models */}
      {activeTab === 'models' && (
        <div className="space-y-2">
          {models.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No models available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click &quot;Sync Models&quot; to discover available models from configured providers
              </p>
            </div>
          ) : (
            models.map((model) => (
              <div
                key={model.id}
                className={cn(
                  'bg-card border rounded-lg p-4 flex items-center justify-between transition-all',
                  model.enabled
                    ? 'border-border hover:border-primary/50'
                    : 'border-border/50 opacity-60'
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Brain
                    className={cn(
                      'w-5 h-5',
                      model.enabled ? 'text-purple-500' : 'text-gray-400'
                    )}
                  />
                  <div>
                    <span className="text-foreground font-medium">{model.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 capitalize">
                        {model.provider}
                      </span>
                      {model.model_type && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-600">
                          {model.model_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {model.enabled ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-700">
                      Enabled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-600">
                      Disabled
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleModel(model.id)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      model.enabled ? 'bg-primary' : 'bg-gray-300'
                    )}
                    title={model.enabled ? 'Disable' : 'Enable'}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        model.enabled ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: Configurations */}
      {activeTab === 'configs' && (
        <div className="space-y-4">
          {configs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Settings className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No GenAI configurations</p>
              <p className="text-xs text-muted-foreground mt-1">
                Configurations will appear once models are synced and enabled
              </p>
            </div>
          ) : (
            configs.map((config) => (
              <div
                key={config.id}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{config.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {config.provider}
                      </span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <span className="text-xs text-muted-foreground">{config.model}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.is_default && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-700">
                        Default
                      </span>
                    )}
                    {config.max_tokens && (
                      <span className="text-xs text-muted-foreground">
                        {config.max_tokens} tokens
                      </span>
                    )}
                    {config.temperature !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        temp: {config.temperature}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
