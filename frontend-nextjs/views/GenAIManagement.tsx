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
  ScrollText,
  Clock,
  XCircle,
  CheckCircle2,
  Rss,
  Sparkles,
  Save,
  Shield,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { genaiAPI, connectorsAPI, adminAPI, guardrailsAPI, skillsAPI } from '@/api/client';
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

interface ExecutionLog {
  id: number;
  prompt_id?: number;
  function_name?: string;
  final_prompt?: string;
  final_prompt_full?: string;
  model_used?: string;
  temperature?: number;
  max_tokens?: number;
  response?: string;
  response_full?: string;
  tokens_used?: number;
  cost?: number;
  guardrails_passed: boolean;
  guardrail_failures?: any[];
  retry_count?: number;
  execution_time_ms?: number;
  timestamp?: string;
  user_id?: number;
}

interface SchedulerSettings {
  org_feed_poll_interval_minutes: number;
  custom_feed_poll_interval_minutes: number;
  custom_feed_enabled: boolean;
  genai_summarize_enabled: boolean;
  genai_summarize_interval_minutes: number;
  genai_extract_enabled: boolean;
  genai_extract_interval_minutes: number;
}

interface JobInfo {
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  last_status: string;
  last_message: string;
  run_count: number;
  interval_seconds: number;
  description: string;
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
  { function_name: 'article_summarization', display_name: 'Article Summarization', description: 'Generate executive and technical summaries of threat intelligence articles' },
  { function_name: 'intel_extraction', display_name: 'Intel Extraction', description: 'Extract IOCs, MITRE ATT&CK TTPs, threat actor names, and malware families from article content' },
  { function_name: 'hunt_query_generation', display_name: 'Hunt Query Generation', description: 'Generate platform-specific hunt queries (XQL, KQL, SPL, GraphQL)' },
  { function_name: 'hunt_title', display_name: 'Hunt Title Generation', description: 'Auto-generate concise, descriptive titles for hunt queries' },
  { function_name: 'threat_landscape', display_name: 'Threat Landscape Analysis', description: 'Generate AI threat landscape briefs covering current threat posture and top TTPs' },
  { function_name: 'campaign_brief', display_name: 'Campaign Brief', description: 'Generate threat campaign briefs from correlated articles and shared IOCs' },
  { function_name: 'correlation_analysis', display_name: 'Correlation Analysis', description: 'Find correlations across threat intelligence: shared IOCs, related indicators, cross-article TTPs' },
  { function_name: 'threat_actor_enrichment', display_name: 'Threat Actor Enrichment', description: 'Enrich threat actor profiles with GenAI-generated intelligence' },
  { function_name: 'ioc_context', display_name: 'IOC Context & Explanation', description: 'Provide contextual explanation for IOCs and suggested defensive actions' },
  { function_name: 'intel_ingestion', display_name: 'Intel Ingestion Analysis', description: 'Analyse uploaded documents and URLs, extract IOCs, map TTPs' },
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
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'functions' | 'ollama' | 'logs' | 'automation'>('providers');

  // Execution logs state
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState<'all' | 'failed'>('all');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Provider config states
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3:latest');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Function mapping states
  const [editingFunction, setEditingFunction] = useState<string | null>(null);
  const [functionEdits, setFunctionEdits] = useState<Record<string, { primary: string; secondary: string }>>({});
  const [guardrailCount, setGuardrailCount] = useState<{ active: number; total: number } | null>(null);
  const [skillCount, setSkillCount] = useState<{ active: number; total: number } | null>(null);
  const [promptPreview, setPromptPreview] = useState<{ function: string; system_prompt: string; total_length: number } | null>(null);
  const [promptPreviewLoading, setPromptPreviewLoading] = useState<string | null>(null);

  // Automation / scheduler states
  const [schedulerSettings, setSchedulerSettings] = useState<SchedulerSettings>({
    org_feed_poll_interval_minutes: 60,
    custom_feed_poll_interval_minutes: 30,
    custom_feed_enabled: true,
    genai_summarize_enabled: false,
    genai_summarize_interval_minutes: 60,
    genai_extract_enabled: false,
    genai_extract_interval_minutes: 120,
  });
  const [schedulerJobs, setSchedulerJobs] = useState<Record<string, JobInfo>>({});
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Load logs when the logs tab is selected
  useEffect(() => {
    if (activeTab === 'logs' && executionLogs.length === 0) {
      loadExecutionLogs();
    }
    if (activeTab === 'automation') {
      loadAutomationSettings();
    }
    if (activeTab === 'functions' && guardrailCount === null) {
      loadGuardrailsSkillsSummary();
    }
  }, [activeTab]);

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
        // Backend returns {providers: {openai:{...}, ollama:{...}}, ...}
        // Convert the provider dict to an array so .find()/.map() work
        const raw = data?.providers ?? data;
        if (Array.isArray(raw)) {
          setProviders(raw);
        } else if (raw && typeof raw === 'object') {
          setProviders(
            Object.entries(raw).map(([key, val]: [string, any]) => ({
              provider: key,
              status: val.status ?? 'unknown',
              models: val.available_models ?? [],
              ...val,
            }))
          );
        } else {
          setProviders([]);
        }
      }

      if (modelRes.status === 'fulfilled') {
        const data = (modelRes.value as any)?.data || modelRes.value;
        const rawModels: any[] = Array.isArray(data) ? data : (data?.models || []);
        // Normalize: backend returns is_enabled, frontend interface uses enabled
        setModels(rawModels.map((m: any) => ({
          ...m,
          id: String(m.id),
          name: m.name || m.display_name || m.model_name || m.model_identifier || 'Unknown',
          enabled: m.enabled !== undefined ? m.enabled : (m.is_enabled ?? false),
        })));
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
        // Pre-populate Ollama settings from saved config
        if (keys['ollama_base_url'] && keys['ollama_base_url'] !== '********') {
          setOllamaUrl(keys['ollama_base_url']);
        }
        if (keys['ollama_model'] && keys['ollama_model'] !== '********') {
          setOllamaModel(keys['ollama_model']);
        }
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

  const loadExecutionLogs = async (filterOverride?: 'all' | 'failed') => {
    try {
      setLogsLoading(true);
      const filter = filterOverride ?? logsFilter;
      const res = await genaiAPI.getExecutionLogs({
        guardrails_failed: filter === 'failed' ? true : undefined,
        limit: 50,
      }) as any;
      const data = res?.data || res;
      setExecutionLogs(data?.logs || []);
      setLogsTotal(data?.total || 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLogsLoading(false);
    }
  };

  const loadGuardrailsSkillsSummary = async () => {
    try {
      const [grRes, skRes] = await Promise.allSettled([
        guardrailsAPI.list(),
        skillsAPI.list(),
      ]);
      if (grRes.status === 'fulfilled') {
        const data = (grRes.value as any)?.data || grRes.value;
        const list: any[] = Array.isArray(data) ? data : data?.guardrails || data?.items || [];
        setGuardrailCount({ active: list.filter((g: any) => g.is_active).length, total: list.length });
      }
      if (skRes.status === 'fulfilled') {
        const data = (skRes.value as any)?.data || skRes.value;
        const list: any[] = Array.isArray(data) ? data : data?.skills || data?.items || [];
        setSkillCount({ active: list.filter((s: any) => s.is_active).length, total: list.length });
      }
    } catch { /* silently fail — counts are informational */ }
  };

  const handlePreviewPrompt = async (functionName: string) => {
    setPromptPreviewLoading(functionName);
    try {
      const res = (await adminAPI.previewPrompt(functionName)) as any;
      const data = res?.data || res;
      setPromptPreview({ function: functionName, system_prompt: data.system_prompt || '', total_length: data.total_length || 0 });
    } catch {
      setPromptPreview({ function: functionName, system_prompt: 'Could not load prompt preview. Ensure the function is registered.', total_length: 0 });
    } finally {
      setPromptPreviewLoading(null);
    }
  };

  const loadAutomationSettings = async () => {
    try {
      const res = (await adminAPI.getSchedulerSettings()) as any;
      const data = res?.data || res;
      if (data?.settings) {
        setSchedulerSettings((prev) => ({ ...prev, ...data.settings }));
      }
      if (data?.jobs) {
        setSchedulerJobs(data.jobs);
      }
    } catch {
      // Non-critical — keep defaults
    }
  };

  const handleSaveAutomation = async () => {
    try {
      setSavingAutomation(true);
      setError('');
      await adminAPI.updateSchedulerSettings(schedulerSettings);
      setSuccess('Automation settings saved and applied');
      await loadAutomationSettings();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleRunJob = async (jobId: string) => {
    try {
      setRunningJob(jobId);
      await adminAPI.runSchedulerJob(jobId);
      setSuccess(`Job "${jobId}" triggered`);
      setTimeout(loadAutomationSettings, 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRunningJob(null);
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
      const res = (await genaiAPI.toggleModel(modelId)) as any;
      const payload = res?.data || res;
      const newEnabled = payload?.is_enabled;
      setModels((prev) =>
        prev.map((m) =>
          m.id === modelId
            ? { ...m, enabled: newEnabled !== undefined ? newEnabled : !m.enabled }
            : m
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
        // Test & save Ollama connection
        const res = await genaiAPI.setupOllama({ url: ollamaUrl, model: ollamaModel, auto_detect: true, set_as_primary: true }) as any;
        const data = res?.data || res;
        // Update URL field if auto-corrected (e.g. localhost → host.docker.internal)
        if (data?.url && data.url !== ollamaUrl) {
          setOllamaUrl(data.url);
        }
        let msg = data?.message || `Ollama connected at ${data?.url || ollamaUrl}`;
        if (data?.pull_suggestion) {
          msg += ` — ${data.pull_suggestion}`;
        }
        setSuccess(msg);
        // Switch to library tab so admin can see/pull models
        setActiveTab('ollama');
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
      // Use the backend seed-defaults endpoint for a single idempotent call
      const res = (await genaiAPI.seedDefaultFunctions()) as any;
      const data = res?.data || res;
      const created = data?.created?.length ?? 0;
      const updated = data?.updated?.length ?? 0;
      setSuccess(`Default functions seeded: ${created} created, ${updated} updated`);
      await loadData();
    } catch (err: unknown) {
      // Fallback: create individually if seed endpoint doesn't exist
      try {
        for (const fn of DEFAULT_FUNCTIONS) {
          const exists = functions.find((f) => f.function_name === fn.function_name);
          if (!exists) {
            await genaiAPI.createFunctionConfig(fn);
          }
        }
        setSuccess('Default functions created');
        await loadData();
      } catch (innerErr: unknown) {
        setError(getErrorMessage(innerErr));
      }
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
    { key: 'automation' as const, label: 'Automation', icon: Settings },
    { key: 'ollama' as const, label: 'Ollama Library', icon: HardDrive },
    { key: 'logs' as const, label: 'Execution Logs', icon: ScrollText },
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
            const isConnected = status?.status === 'available' || status?.status === 'connected' || (provider.isLocal && ollamaConnected);
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
                    {(isConnected || hasKey || (provider.isLocal && ollamaConnected)) && (
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
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl(e.target.value)}
                          placeholder="http://localhost:11434"
                          className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <input
                          type="text"
                          value={ollamaModel}
                          onChange={(e) => setOllamaModel(e.target.value)}
                          placeholder="llama3:latest"
                          className="w-36 px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          onClick={() => handleSaveProviderKey(provider)}
                          disabled={isSaving}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm flex items-center gap-2 whitespace-nowrap"
                        >
                          <Link2 className="w-4 h-4" />
                          {isSaving ? 'Connecting...' : 'Test & Connect'}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Docker tip: Use <code className="bg-muted px-1 rounded">http://host.docker.internal:11434</code> to reach Ollama on your host machine.
                      </p>
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

      {/* ====== EXECUTION LOGS TAB ====== */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              View what prompts are sent to GenAI, responses received, guardrail results, and cost.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-lg p-0.5">
                {(['all', 'failed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setLogsFilter(f); loadExecutionLogs(f); }}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                      logsFilter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {f === 'failed' ? 'Guardrail Failures' : 'All Logs'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => loadExecutionLogs()}
                disabled={logsLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', logsLoading && 'animate-spin')} />
                Refresh
              </button>
            </div>
          </div>

          {logsLoading && executionLogs.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : executionLogs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <ScrollText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No execution logs yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Logs will appear here when GenAI functions are used (summarization, IOC extraction, etc.)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{logsTotal} total logs</p>
              {executionLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div key={log.id} className="bg-card border border-border rounded-lg overflow-hidden">
                    <div
                      className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      {log.guardrails_passed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {log.function_name || 'Unknown'}
                          </span>
                          {log.model_used && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-600">
                              {log.model_used}
                            </span>
                          )}
                          {log.tokens_used && (
                            <span className="text-[10px] text-muted-foreground">
                              {log.tokens_used} tokens
                            </span>
                          )}
                          {log.cost != null && log.cost > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              ${log.cost.toFixed(4)}
                            </span>
                          )}
                          {log.execution_time_ms && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {log.execution_time_ms}ms
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {log.final_prompt?.slice(0, 120) || 'No prompt recorded'}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border p-4 bg-muted/30 space-y-3">
                        {/* Final Prompt */}
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-1">Final Prompt Sent to Model:</p>
                          <pre className="text-xs text-muted-foreground bg-background border border-border rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {log.final_prompt_full || log.final_prompt || 'Not recorded'}
                          </pre>
                        </div>

                        {/* Response */}
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-1">Model Response:</p>
                          <pre className="text-xs text-muted-foreground bg-background border border-border rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {log.response_full || log.response || 'No response'}
                          </pre>
                        </div>

                        {/* Guardrail Results */}
                        {log.guardrail_failures && log.guardrail_failures.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-600 mb-1">Guardrail Failures:</p>
                            <div className="space-y-1">
                              {log.guardrail_failures.map((f: any, i: number) => (
                                <div key={i} className="text-xs bg-red-500/10 text-red-600 rounded p-2">
                                  {typeof f === 'string' ? f : JSON.stringify(f)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Metadata row */}
                        <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground border-t border-border pt-2">
                          <span>Model: {log.model_used || 'N/A'}</span>
                          <span>Temperature: {log.temperature ?? 'N/A'}</span>
                          <span>Max Tokens: {log.max_tokens ?? 'N/A'}</span>
                          <span>Tokens Used: {log.tokens_used ?? 'N/A'}</span>
                          <span>Cost: ${(log.cost ?? 0).toFixed(4)}</span>
                          <span>Retries: {log.retry_count ?? 0}</span>
                          <span>Duration: {log.execution_time_ms ?? 'N/A'}ms</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
                        <p>{fn.total_requests ?? 0} requests</p>
                        <p>${(fn.total_cost ?? 0).toFixed(4)} cost</p>
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

                      {/* Preview Final Prompt */}
                      <div className="border-t border-border pt-3">
                        <button
                          onClick={() => handlePreviewPrompt(fn.function_name)}
                          disabled={promptPreviewLoading === fn.function_name}
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
                        >
                          {promptPreviewLoading === fn.function_name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                          Preview assembled system prompt (with guardrails &amp; persona)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Guardrails & Skills Summary */}
          {functions.length > 0 && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Active Guardrails &amp; Skills</h4>
                <span className="text-[10px] text-muted-foreground ml-auto">Applied to all GenAI functions</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {guardrailCount ? `${guardrailCount.active} active` : '—'} guardrails
                    </p>
                    <p className="text-[10px] text-muted-foreground">{guardrailCount ? `${guardrailCount.total} total` : 'Loading...'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {skillCount ? `${skillCount.active} active` : '—'} skills
                    </p>
                    <p className="text-[10px] text-muted-foreground">{skillCount ? `${skillCount.total} total` : 'Loading...'}</p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                Guardrails protect against prompt injection, hallucination, PII leakage, and output formatting errors.
                Skills add domain-specific personas and instructions to guide model behavior.
              </p>
              <p className="text-[10px] text-primary font-medium">
                → Click the <strong>Guardrails &amp; Skills</strong> tab above to create, edit, import/export or seed the attack catalog
              </p>
              {(!guardrailCount || guardrailCount.total === 0) && (
                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-[10px] text-amber-700 font-medium">⚠ No guardrails seeded yet. Click Guardrails &amp; Skills → Seed Catalog to add 50+ pre-built security guardrails.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====== PROMPT PREVIEW MODAL ====== */}
      {promptPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPromptPreview(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> System Prompt Preview
                </h3>
                <p className="text-[10px] text-muted-foreground">Function: <strong>{promptPreview.function}</strong> · {promptPreview.total_length} chars</p>
              </div>
              <button onClick={() => setPromptPreview(null)} className="text-muted-foreground hover:text-foreground p-1">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-3">
                {promptPreview.system_prompt}
              </pre>
            </div>
            <div className="px-4 py-2 border-t border-border flex items-center gap-2 text-[10px] text-muted-foreground">
              <Shield className="w-3 h-3" /> This prompt includes active guardrails and skill personas injected at runtime.
            </div>
          </div>
        </div>
      )}

      {/* ====== AUTOMATION TAB ====== */}
      {activeTab === 'automation' && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Configure how frequently feeds are polled and enable automated GenAI processing.
            Changes are applied immediately to running jobs.
          </p>

          {/* ── Feed Polling ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Rss className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Feed Polling Intervals</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {/* Org Feeds */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Org Feeds — Poll Every
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={schedulerSettings.org_feed_poll_interval_minutes}
                    onChange={(e) => setSchedulerSettings((p) => ({ ...p, org_feed_poll_interval_minutes: parseInt(e.target.value) || 60 }))}
                    className="w-24 px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
                {schedulerJobs['feed_ingestion'] && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                    <div>Last run: {schedulerJobs['feed_ingestion'].last_run ? new Date(schedulerJobs['feed_ingestion'].last_run).toLocaleString() : '—'}</div>
                    <div>Status: <span className={schedulerJobs['feed_ingestion'].last_status === 'success' ? 'text-green-500' : 'text-red-500'}>{schedulerJobs['feed_ingestion'].last_status || '—'}</span></div>
                    <div>Runs: {schedulerJobs['feed_ingestion'].run_count}</div>
                  </div>
                )}
                <button
                  onClick={() => handleRunJob('feed_ingestion')}
                  disabled={runningJob === 'feed_ingestion'}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
                >
                  {runningJob === 'feed_ingestion' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run Now
                </button>
              </div>

              {/* Custom/Personal Feeds */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-foreground">
                    Personal Feeds — Poll Every
                  </label>
                  <button
                    onClick={() => setSchedulerSettings((p) => ({ ...p, custom_feed_enabled: !p.custom_feed_enabled }))}
                    className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none', schedulerSettings.custom_feed_enabled ? 'bg-green-500' : 'bg-muted')}
                    title={schedulerSettings.custom_feed_enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                  >
                    <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform', schedulerSettings.custom_feed_enabled ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={schedulerSettings.custom_feed_poll_interval_minutes}
                    onChange={(e) => setSchedulerSettings((p) => ({ ...p, custom_feed_poll_interval_minutes: parseInt(e.target.value) || 30 }))}
                    disabled={!schedulerSettings.custom_feed_enabled}
                    className="w-24 px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
                {schedulerJobs['user_feed_ingestion'] && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                    <div>Last run: {schedulerJobs['user_feed_ingestion'].last_run ? new Date(schedulerJobs['user_feed_ingestion'].last_run).toLocaleString() : '—'}</div>
                    <div>Status: <span className={schedulerJobs['user_feed_ingestion'].last_status === 'success' ? 'text-green-500' : 'text-red-500'}>{schedulerJobs['user_feed_ingestion'].last_status || '—'}</span></div>
                    <div>Runs: {schedulerJobs['user_feed_ingestion'].run_count}</div>
                  </div>
                )}
                <button
                  onClick={() => handleRunJob('user_feed_ingestion')}
                  disabled={runningJob === 'user_feed_ingestion' || !schedulerSettings.custom_feed_enabled}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
                >
                  {runningJob === 'user_feed_ingestion' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run Now
                </button>
              </div>
            </div>
          </div>

          {/* ── GenAI Automation ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">GenAI Automation</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Schedule automatic AI processing for articles that haven&apos;t been analyzed yet.
              Processes in small batches to avoid overloading.
            </p>

            <div className="space-y-4">
              {/* Auto Summarize */}
              <div className="flex items-start justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm">Auto-Summarize New Articles</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Generates executive &amp; technical summaries for articles ingested without one.
                    Processes up to 20 articles per run.
                  </p>
                  {schedulerJobs['genai_batch_summarize'] && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Last run: {schedulerJobs['genai_batch_summarize'].last_run ? new Date(schedulerJobs['genai_batch_summarize'].last_run).toLocaleString() : '—'}</div>
                      <div>Status: <span className={schedulerJobs['genai_batch_summarize'].last_status === 'success' ? 'text-green-500' : 'text-red-500'}>{schedulerJobs['genai_batch_summarize'].last_status || '—'}</span></div>
                      <div>Last result: {schedulerJobs['genai_batch_summarize'].last_message || '—'}</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <button
                    onClick={() => setSchedulerSettings((p) => ({ ...p, genai_summarize_enabled: !p.genai_summarize_enabled }))}
                    className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none', schedulerSettings.genai_summarize_enabled ? 'bg-green-500' : 'bg-muted')}
                    title={schedulerSettings.genai_summarize_enabled ? 'Enabled' : 'Disabled'}
                  >
                    <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform', schedulerSettings.genai_summarize_enabled ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="number"
                      min={15}
                      max={1440}
                      value={schedulerSettings.genai_summarize_interval_minutes}
                      onChange={(e) => setSchedulerSettings((p) => ({ ...p, genai_summarize_interval_minutes: parseInt(e.target.value) || 60 }))}
                      disabled={!schedulerSettings.genai_summarize_enabled}
                      className="w-20 px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none disabled:opacity-50"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                  <button
                    onClick={() => handleRunJob('genai_batch_summarize')}
                    disabled={runningJob === 'genai_batch_summarize'}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-secondary text-foreground rounded hover:bg-secondary/80 disabled:opacity-50"
                  >
                    {runningJob === 'genai_batch_summarize' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Run Now
                  </button>
                </div>
              </div>

              {/* Auto Extract */}
              <div className="flex items-start justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium text-sm">Auto-Extract IOCs &amp; TTPs</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Extracts IOCs and MITRE ATT&amp;CK TTPs from articles not yet analyzed.
                    Processes up to 10 articles per run.
                  </p>
                  {schedulerJobs['genai_batch_extract'] && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Last run: {schedulerJobs['genai_batch_extract'].last_run ? new Date(schedulerJobs['genai_batch_extract'].last_run).toLocaleString() : '—'}</div>
                      <div>Status: <span className={schedulerJobs['genai_batch_extract'].last_status === 'success' ? 'text-green-500' : 'text-red-500'}>{schedulerJobs['genai_batch_extract'].last_status || '—'}</span></div>
                      <div>Last result: {schedulerJobs['genai_batch_extract'].last_message || '—'}</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <button
                    onClick={() => setSchedulerSettings((p) => ({ ...p, genai_extract_enabled: !p.genai_extract_enabled }))}
                    className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none', schedulerSettings.genai_extract_enabled ? 'bg-green-500' : 'bg-muted')}
                    title={schedulerSettings.genai_extract_enabled ? 'Enabled' : 'Disabled'}
                  >
                    <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform', schedulerSettings.genai_extract_enabled ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="number"
                      min={15}
                      max={1440}
                      value={schedulerSettings.genai_extract_interval_minutes}
                      onChange={(e) => setSchedulerSettings((p) => ({ ...p, genai_extract_interval_minutes: parseInt(e.target.value) || 120 }))}
                      disabled={!schedulerSettings.genai_extract_enabled}
                      className="w-20 px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none disabled:opacity-50"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                  <button
                    onClick={() => handleRunJob('genai_batch_extract')}
                    disabled={runningJob === 'genai_batch_extract'}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-secondary text-foreground rounded hover:bg-secondary/80 disabled:opacity-50"
                  >
                    {runningJob === 'genai_batch_extract' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Run Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveAutomation}
              disabled={savingAutomation}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {savingAutomation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
