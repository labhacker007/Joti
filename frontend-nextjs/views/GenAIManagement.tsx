'use client';

import React, { useEffect, useState } from 'react';
import {
  Brain,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Zap,
  Server,
  Settings,
  Activity,
  Key,
  Link2,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  Cpu,
  Eye,
  EyeOff,
  Play,
  TestTube,
  Download,
  Trash2,
  HardDrive,
  Loader2,
} from 'lucide-react';
import { genaiAPI, connectorsAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';

// ---------- Types ----------

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
  display_name?: string;
  model_identifier?: string;
  is_local?: boolean;
  is_free?: boolean;
}

interface FunctionConfig {
  id: number;
  function_name: string;
  display_name: string;
  description?: string;
  primary_model_id?: string;
  secondary_model_id?: string;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  active_prompt_name?: string;
}

interface ProviderConfig {
  provider: string;
  label: string;
  keyField: string;
  urlField?: string;
  description: string;
  isLocal?: boolean;
}

interface OllamaLibraryModel {
  name: string;
  size: string;
  description: string;
  category: string;
  installed: boolean;
  installed_size?: string;
}

// Provider definitions
const PROVIDER_DEFS: ProviderConfig[] = [
  {
    provider: 'openai',
    label: 'OpenAI',
    keyField: 'OPENAI_API_KEY',
    description: 'GPT-4o, GPT-4o-mini, GPT-4 Turbo',
  },
  {
    provider: 'anthropic',
    label: 'Anthropic',
    keyField: 'ANTHROPIC_API_KEY',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus',
  },
  {
    provider: 'gemini',
    label: 'Google Gemini',
    keyField: 'GEMINI_API_KEY',
    description: 'Gemini 1.5 Pro, Gemini 1.5 Flash',
  },
  {
    provider: 'ollama',
    label: 'Ollama (Local)',
    keyField: '',
    urlField: 'OLLAMA_BASE_URL',
    description: 'Llama 3.1, Mistral, CodeLlama (runs locally)',
    isLocal: true,
  },
];

// Default GenAI functions
const DEFAULT_FUNCTIONS = [
  { function_name: 'summarization', display_name: 'Summarization', description: 'Generate executive and technical summaries of articles' },
  { function_name: 'ioc_extraction', display_name: 'IOC Extraction', description: 'Extract indicators of compromise from content' },
  { function_name: 'ttp_mapping', display_name: 'TTP Mapping', description: 'Map extracted intelligence to MITRE ATT&CK TTPs' },
  { function_name: 'hunt_query', display_name: 'Hunt Query Generation', description: 'Generate hunt queries for XQL, KQL, SPL platforms' },
];

export default function GenAIManagement() {
  // Data states
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [functions, setFunctions] = useState<FunctionConfig[]>([]);
  const [savedKeys, setSavedKeys] = useState<Record<string, string>>({});

  // Ollama library
  const [ollamaLibrary, setOllamaLibrary] = useState<OllamaLibraryModel[]>([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [pullingModels, setPullingModels] = useState<Set<string>>(new Set());
  const [deletingModels, setDeletingModels] = useState<Set<string>>(new Set());
  const [ollamaFilter, setOllamaFilter] = useState<'all' | 'installed' | 'available'>('all');

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'functions' | 'ollama'>('providers');

  // Provider config states
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Function mapping states
  const [editingFunction, setEditingFunction] = useState<string | null>(null);
  const [functionEdits, setFunctionEdits] = useState<Record<string, { primary: string; secondary: string }>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [providerRes, modelRes, funcRes, configRes, ollamaRes] = await Promise.allSettled([
        genaiAPI.getProviderStatus(),
        genaiAPI.getAdminModels(),
        genaiAPI.getFunctionConfigs(),
        connectorsAPI.getConfigurations('genai'),
        genaiAPI.getOllamaLibrary(),
      ]);

      if (providerRes.status === 'fulfilled') {
        const data = (providerRes.value as any)?.data || providerRes.value;
        setProviders(Array.isArray(data) ? data : data?.providers || []);
      }

      if (modelRes.status === 'fulfilled') {
        const data = (modelRes.value as any)?.data || modelRes.value;
        setModels(Array.isArray(data) ? data : data?.models || []);
      }

      if (funcRes.status === 'fulfilled') {
        const data = (funcRes.value as any)?.data || funcRes.value;
        setFunctions(Array.isArray(data) ? data : []);
      }

      if (configRes.status === 'fulfilled') {
        const data = (configRes.value as any)?.data || configRes.value;
        const configs = Array.isArray(data) ? data : data?.configs || [];
        const keys: Record<string, string> = {};
        configs.forEach((c: any) => {
          if (c.key && c.value) {
            keys[c.key] = c.is_encrypted ? '********' : c.value;
          }
        });
        setSavedKeys(keys);
      }

      if (ollamaRes.status === 'fulfilled') {
        const data = (ollamaRes.value as any)?.data || ollamaRes.value;
        setOllamaLibrary(data?.models || []);
        setOllamaConnected(data?.connected ?? false);
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
      const res = await genaiAPI.syncModels() as any;
      const data = res?.data || res;
      setSuccess(`Models synced: ${data?.added || 0} added, ${data?.updated || 0} updated`);
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
      setSuccess('Model toggled');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleSaveProviderKey = async (provider: ProviderConfig) => {
    try {
      setSavingProvider(provider.provider);
      setError('');

      if (provider.isLocal) {
        // Save Ollama URL
        await genaiAPI.setupOllama({ url: ollamaUrl, auto_detect: true });
        setSuccess(`Ollama configured at ${ollamaUrl}`);
      } else {
        const key = apiKeys[provider.provider];
        if (!key?.trim()) {
          setError('Please enter an API key');
          return;
        }
        await connectorsAPI.saveConfiguration({
          category: 'genai',
          key: provider.keyField,
          value: key.trim(),
          is_secret: true,
        });
        setSavedKeys((prev) => ({ ...prev, [provider.keyField]: '********' }));
        setApiKeys((prev) => ({ ...prev, [provider.provider]: '' }));
        setSuccess(`${provider.label} API key saved`);
      }
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSavingProvider(null);
    }
  };

  const handleTestProvider = async (providerName: string) => {
    try {
      setTestingProvider(providerName);
      setError('');
      const res = await genaiAPI.testProvider(providerName) as any;
      const data = res?.data || res;
      if (data?.output || data?.success) {
        setSuccess(`${providerName} test passed`);
      } else {
        setSuccess(`${providerName} test: ${data?.message || 'completed'}`);
      }
    } catch (err: unknown) {
      setError(`${providerName} test failed: ${getErrorMessage(err)}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleUpdateFunction = async (funcName: string) => {
    try {
      setError('');
      const edits = functionEdits[funcName];
      if (!edits) return;

      await genaiAPI.updateFunctionConfig(funcName, {
        primary_model_id: edits.primary || null,
        secondary_model_id: edits.secondary || null,
      });
      setSuccess(`${funcName} model mapping updated`);
      setEditingFunction(null);
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleCreateDefaultFunctions = async () => {
    try {
      setError('');
      for (const fn of DEFAULT_FUNCTIONS) {
        const exists = functions.find((f) => f.function_name === fn.function_name);
        if (!exists) {
          await genaiAPI.createFunctionConfig(fn);
        }
      }
      setSuccess('Default functions created');
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handlePullModel = async (modelName: string) => {
    try {
      setError('');
      setPullingModels((prev) => new Set(prev).add(modelName));
      await genaiAPI.pullOllamaModel(modelName);
      setSuccess(`Pulling "${modelName}" in background. This may take several minutes. Refresh to check status.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setPullingModels((prev) => {
        const next = new Set(prev);
        next.delete(modelName);
        return next;
      });
    }
  };

  const handleDeleteOllamaModel = async (modelName: string) => {
    if (!confirm(`Delete "${modelName}" from Ollama? This frees disk space but the model must be re-downloaded to use again.`)) return;
    try {
      setError('');
      setDeletingModels((prev) => new Set(prev).add(modelName));
      await genaiAPI.deleteOllamaModel(modelName);
      setSuccess(`Model "${modelName}" deleted`);
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingModels((prev) => {
        const next = new Set(prev);
        next.delete(modelName);
        return next;
      });
    }
  };

  const getProviderStatus = (providerName: string) => {
    return providers.find(
      (p) => p.provider?.toLowerCase() === providerName.toLowerCase()
    );
  };

  const enabledModels = models.filter((m) => m.enabled);
  const modelOptions = enabledModels.map((m) => ({
    value: m.model_identifier || m.name || m.id,
    label: m.display_name || m.name || m.id,
    provider: m.provider,
  }));

  // Merge installed Ollama models into the dropdown (if not already present via sync)
  const existingModelIds = new Set(modelOptions.map((m) => m.value));
  ollamaLibrary
    .filter((m) => m.installed)
    .forEach((m) => {
      if (!existingModelIds.has(m.name)) {
        modelOptions.push({
          value: m.name,
          label: m.name,
          provider: 'ollama',
        });
      }
    });

  const tabs = [
    { key: 'providers' as const, label: 'Providers', icon: Key },
    { key: 'models' as const, label: 'Models', icon: Brain },
    { key: 'functions' as const, label: 'Function Mapping', icon: ArrowRightLeft },
    { key: 'ollama' as const, label: 'Ollama Library', icon: HardDrive },
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
            Configure AI providers, manage models, and assign functions
          </p>
        </div>
        <button
          onClick={handleSyncModels}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
          Sync Models
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Providers</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            {providers.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Models</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            {models.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Enabled</p>
          <p className="text-2xl font-bold text-green-600 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            {enabledModels.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Functions</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-orange-600" />
            {functions.length}
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

      {/* ====== PROVIDERS TAB ====== */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          {PROVIDER_DEFS.map((provider) => {
            const status = getProviderStatus(provider.provider);
            const isConnected = status?.status === 'available' || status?.status === 'connected';
            const hasKey = !!savedKeys[provider.keyField];
            const isSaving = savingProvider === provider.provider;
            const isTesting = testingProvider === provider.provider;

            return (
              <div
                key={provider.provider}
                className="bg-card border border-border rounded-lg overflow-hidden"
              >
                {/* Provider Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {provider.isLocal ? (
                      <Cpu className="w-6 h-6 text-green-600" />
                    ) : (
                      <Server className="w-6 h-6 text-blue-600" />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{provider.label}</p>
                      <p className="text-xs text-muted-foreground">{provider.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isConnected ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-700">
                        Connected
                      </span>
                    ) : hasKey ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-700">
                        Key Saved
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-600">
                        Not Configured
                      </span>
                    )}
                    {(isConnected || hasKey) && (
                      <button
                        onClick={() => handleTestProvider(provider.provider)}
                        disabled={isTesting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
                      >
                        <TestTube className={cn('w-3.5 h-3.5', isTesting && 'animate-pulse')} />
                        {isTesting ? 'Testing...' : 'Test'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Provider Config */}
                <div className="border-t border-border p-4 bg-muted/30">
                  {provider.isLocal ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                        placeholder="http://localhost:11434"
                        className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        onClick={() => handleSaveProviderKey(provider)}
                        disabled={isSaving}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm flex items-center gap-2"
                      >
                        <Link2 className="w-4 h-4" />
                        {isSaving ? 'Connecting...' : 'Connect'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKeys[provider.provider] ? 'text' : 'password'}
                          value={apiKeys[provider.provider] || ''}
                          onChange={(e) =>
                            setApiKeys((prev) => ({
                              ...prev,
                              [provider.provider]: e.target.value,
                            }))
                          }
                          placeholder={hasKey ? 'Key saved (enter new to replace)' : `Enter ${provider.label} API key`}
                          className="w-full px-3 py-2 pr-10 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowKeys((prev) => ({
                              ...prev,
                              [provider.provider]: !prev[provider.provider],
                            }))
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showKeys[provider.provider] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => handleSaveProviderKey(provider)}
                        disabled={isSaving || !apiKeys[provider.provider]?.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm flex items-center gap-2"
                      >
                        <Key className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Key'}
                      </button>
                    </div>
                  )}

                  {/* Provider model count */}
                  {status?.models && status.models.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {status.models.length} models discovered
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== MODELS TAB ====== */}
      {activeTab === 'models' && (
        <div className="space-y-2">
          {models.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No models available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Configure a provider above, then click &quot;Sync Models&quot;
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
                    <span className="text-foreground font-medium">
                      {model.display_name || model.name}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 capitalize">
                        {model.provider}
                      </span>
                      {model.is_local && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-600">
                          Local
                        </span>
                      )}
                      {model.is_free && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600">
                          Free
                        </span>
                      )}
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

      {/* ====== OLLAMA LIBRARY TAB ====== */}
      {activeTab === 'ollama' && (
        <div className="space-y-4">
          {/* Connection status */}
          <div className={cn(
            'p-3 rounded-lg flex items-center gap-3 text-sm',
            ollamaConnected
              ? 'bg-green-500/10 text-green-700'
              : 'bg-yellow-500/10 text-yellow-700'
          )}>
            {ollamaConnected ? (
              <><CheckCircle className="w-4 h-4" /> Ollama is connected. {ollamaLibrary.filter(m => m.installed).length} model(s) downloaded.</>
            ) : (
              <><AlertCircle className="w-4 h-4" /> Ollama not reachable. Configure the URL in the Providers tab and ensure Ollama is running.</>
            )}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            {(['all', 'installed', 'available'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setOllamaFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                  ollamaFilter === f
                    ? 'bg-slate-700 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {f} {f === 'installed' && `(${ollamaLibrary.filter(m => m.installed).length})`}
                {f === 'all' && `(${ollamaLibrary.length})`}
              </button>
            ))}
            <button
              onClick={loadData}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary text-foreground rounded-md hover:bg-secondary/80"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Model list */}
          <div className="space-y-1.5">
            {ollamaLibrary
              .filter((m) => {
                if (ollamaFilter === 'installed') return m.installed;
                if (ollamaFilter === 'available') return !m.installed;
                return true;
              })
              .map((model) => {
                const isPulling = pullingModels.has(model.name);
                const isDeleting = deletingModels.has(model.name);
                return (
                  <div
                    key={model.name}
                    className={cn(
                      'bg-card border rounded-lg p-3 flex items-center justify-between',
                      model.installed ? 'border-green-500/30' : 'border-border'
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <HardDrive className={cn('w-5 h-5 flex-shrink-0', model.installed ? 'text-green-500' : 'text-muted-foreground')} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground text-sm">{model.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                            {model.category}
                          </span>
                          {model.installed && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-600">
                              Downloaded
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {model.description} &middot; {(model as any).actual_size || model.size}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {model.installed ? (
                        <button
                          onClick={() => handleDeleteOllamaModel(model.name)}
                          disabled={isDeleting}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePullModel(model.name)}
                          disabled={isPulling || !ollamaConnected}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {isPulling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          {isPulling ? 'Pulling...' : 'Download'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

            {ollamaLibrary.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <HardDrive className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No models in library</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Connect to Ollama in the Providers tab first
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== FUNCTION MAPPING TAB ====== */}
      {activeTab === 'functions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              Assign which AI model handles each function. Each function has a primary model
              and an optional fallback.
            </p>
            {functions.length === 0 && (
              <button
                onClick={handleCreateDefaultFunctions}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Initialize Default Functions
              </button>
            )}
          </div>

          {functions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <ArrowRightLeft className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No function configurations</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click &quot;Initialize Default Functions&quot; to set up summarization, IOC extraction, TTP mapping, and hunt queries
              </p>
            </div>
          ) : (
            functions.map((fn) => {
              const isEditing = editingFunction === fn.function_name;
              const edits = functionEdits[fn.function_name] || {
                primary: fn.primary_model_id || '',
                secondary: fn.secondary_model_id || '',
              };

              return (
                <div
                  key={fn.function_name}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  {/* Function Header */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => {
                      if (isEditing) {
                        setEditingFunction(null);
                      } else {
                        setEditingFunction(fn.function_name);
                        setFunctionEdits((prev) => ({
                          ...prev,
                          [fn.function_name]: {
                            primary: fn.primary_model_id || '',
                            secondary: fn.secondary_model_id || '',
                          },
                        }));
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{fn.display_name}</p>
                        {fn.description && (
                          <p className="text-xs text-muted-foreground">{fn.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Primary: <span className="text-foreground font-medium">{fn.primary_model_id || 'Not set'}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fallback: <span className="text-foreground">{fn.secondary_model_id || 'None'}</span>
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{fn.total_requests} requests</p>
                        <p>${fn.total_cost.toFixed(4)} cost</p>
                      </div>
                    </div>
                  </div>

                  {/* Edit Panel */}
                  {isEditing && (
                    <div className="border-t border-border p-4 bg-muted/30 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Primary Model
                          </label>
                          <select
                            value={edits.primary}
                            onChange={(e) =>
                              setFunctionEdits((prev) => ({
                                ...prev,
                                [fn.function_name]: { ...edits, primary: e.target.value },
                              }))
                            }
                            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select model...</option>
                            {modelOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label} ({opt.provider})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Fallback Model
                          </label>
                          <select
                            value={edits.secondary}
                            onChange={(e) =>
                              setFunctionEdits((prev) => ({
                                ...prev,
                                [fn.function_name]: { ...edits, secondary: e.target.value },
                              }))
                            }
                            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">None</option>
                            {modelOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label} ({opt.provider})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {fn.active_prompt_name && (
                        <p className="text-xs text-muted-foreground">
                          Active prompt: <span className="font-medium">{fn.active_prompt_name}</span>
                        </p>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingFunction(null)}
                          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateFunction(fn.function_name)}
                          className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                          Save Mapping
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
