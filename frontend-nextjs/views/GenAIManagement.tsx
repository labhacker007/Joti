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
  X,
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
  modelField?: string;
  knownModels?: string[];
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
// keyField and modelField MUST match backend CONFIGURATION_TEMPLATES["genai"] keys (lowercase)
const PROVIDER_DEFS: ProviderConfig[] = [
  {
    provider: 'openai',
    label: 'OpenAI',
    keyField: 'openai_api_key',
    modelField: 'openai_model',
    knownModels: [
      'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo',
      'o1-preview', 'o1-mini', 'o3-mini',
    ],
    description: 'GPT-4o, GPT-4o-mini, GPT-4 Turbo',
  },
  {
    provider: 'anthropic',
    label: 'Anthropic',
    keyField: 'anthropic_api_key',
    modelField: 'anthropic_model',
    knownModels: [
      'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001',
      'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229',
    ],
    description: 'Claude 3.5 Sonnet, Claude 3 Opus',
  },
  {
    provider: 'gemini',
    label: 'Google Gemini',
    keyField: 'gemini_api_key',
    modelField: 'gemini_model',
    knownModels: [
      'gemini-2.0-flash', 'gemini-2.0-flash-thinking-exp',
      'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro',
    ],
    description: 'Gemini 2.0 Flash, Gemini 1.5 Pro',
  },
  {
    provider: 'kimi',
    label: 'Kimi (Moonshot AI)',
    keyField: 'kimi_api_key',
    modelField: 'kimi_model',
    knownModels: [
      'kimi-k2-0711-preview', 'moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k',
    ],
    description: 'Kimi K2 / 2.5 — kimi-k2-0711-preview, moonshot-v1-128k',
  },
  {
    provider: 'ollama',
    label: 'Ollama (Local)',
    keyField: '',
    urlField: 'ollama_base_url',
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

  // Provider test dialog
  const [testDialog, setTestDialog] = useState<{ provider: string; prompt: string } | null>(null);
  const [testDialogResult, setTestDialogResult] = useState<{
    status: 'success' | 'failed';
    provider: string;
    prompt_sent?: string;
    response?: string;
    model?: string;
    error?: string;
    suggestion?: string;
    test_type?: string;
  } | null>(null);
  const [testDialogLoading, setTestDialogLoading] = useState(false);

  // Model selection per provider
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [customModelInputs, setCustomModelInputs] = useState<Record<string, string>>({});
  const [savingModel, setSavingModel] = useState<string | null>(null);
  const [modelErrors, setModelErrors] = useState<Record<string, string>>({});

  // Function mapping states
  const [editingFunction, setEditingFunction] = useState<string | null>(null);
  const [functionEdits, setFunctionEdits] = useState<Record<string, { primary: string; secondary: string }>>({});
  const [guardrailCount, setGuardrailCount] = useState<{ active: number; total: number } | null>(null);
  const [skillCount, setSkillCount] = useState<{ active: number; total: number } | null>(null);
  const [promptPreview, setPromptPreview] = useState<{
    function: string;
    summary_type?: string;
    system_prompt: string;
    user_prompt?: string;
    total_length: number;
    skill_count?: number;
    guardrail_count?: number;
    skills_applied?: { name: string; category: string; description: string }[];
    guardrails_applied?: { name: string; type: string; action: string }[];
    error?: string;
  } | null>(null);
  const [promptPreviewTab, setPromptPreviewTab] = useState<'system' | 'user' | 'skills' | 'guardrails'>('system');
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
  const [jobRunResults, setJobRunResults] = useState<Record<string, { status: 'success' | 'error'; message: string; ts: string }>>({});

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

      let resolvedModels: ModelInfo[] = [];
      if (modelRes.status === 'fulfilled') {
        const data = (modelRes.value as any)?.data || modelRes.value;
        const rawModels: any[] = Array.isArray(data) ? data : (data?.models || []);
        // Normalize: backend returns is_enabled, frontend interface uses enabled
        resolvedModels = rawModels.map((m: any) => ({
          ...m,
          id: String(m.id),
          name: m.name || m.display_name || m.model_name || m.model_identifier || 'Unknown',
          enabled: m.enabled !== undefined ? m.enabled : (m.is_enabled ?? false),
        }));
        setModels(resolvedModels);
      }

      if (funcRes.status === 'fulfilled') {
        const data = (funcRes.value as any)?.data || funcRes.value;
        let fns: FunctionConfig[] = Array.isArray(data) ? data : [];

        // Auto-assign the first enabled model to any function that has no primary model set
        const firstEnabled = resolvedModels.find((m) => m.enabled);
        if (firstEnabled) {
          const defaultModelId = (firstEnabled as any).model_identifier || firstEnabled.name || firstEnabled.id;
          const needsDefault = fns.filter((fn) => !fn.primary_model_id);
          if (needsDefault.length > 0) {
            fns = fns.map((fn) => ({
              ...fn,
              primary_model_id: fn.primary_model_id || defaultModelId,
            }));
            // Persist the defaults to the backend (fire-and-forget)
            needsDefault.forEach((fn) => {
              genaiAPI.updateFunctionConfig(fn.function_name, { primary_model_id: defaultModelId }).catch(() => {});
            });
          }
        }

        setFunctions(fns);
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
        // Pre-populate model selections for API providers
        const initModels: Record<string, string> = {};
        PROVIDER_DEFS.forEach((p) => {
          if (p.modelField) {
            const saved = keys[p.modelField];
            if (saved && saved !== '********') {
              // If saved model is not in knownModels list, treat as custom
              const known = p.knownModels ?? [];
              initModels[p.provider] = known.includes(saved) ? saved : '__custom__';
              if (!known.includes(saved)) {
                setCustomModelInputs((prev) => ({ ...prev, [p.provider]: saved }));
              }
            }
          }
        });
        setSelectedModels((prev) => ({ ...prev, ...initModels }));
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
    setPromptPreviewTab('system');
    try {
      const res = (await adminAPI.previewPrompt(functionName)) as any;
      const data = res?.data || res;
      if (data?.error && !data?.system_prompt) {
        setPromptPreview({ function: functionName, system_prompt: `Error: ${data.error}`, total_length: 0, error: data.error });
      } else {
        setPromptPreview({
          function: functionName,
          summary_type: data.summary_type,
          system_prompt: data.system_prompt || '',
          user_prompt: data.user_prompt || '',
          total_length: data.total_length || 0,
          skill_count: data.skill_count ?? data.skills_applied?.length,
          guardrail_count: data.guardrail_count ?? data.guardrails_applied?.length,
          skills_applied: data.skills_applied || [],
          guardrails_applied: data.guardrails_applied || [],
          error: data.error,
        });
      }
    } catch (err: unknown) {
      const axiosErr = err as any;
      const detail = axiosErr?.response?.data?.detail || axiosErr?.response?.data?.error || '';
      const httpStatus = axiosErr?.response?.status;
      const base = getErrorMessage(err);
      const msg = detail ? (httpStatus ? `HTTP ${httpStatus}: ${detail}` : detail) : base;
      setPromptPreview({ function: functionName, system_prompt: `Failed to load preview: ${msg}`, total_length: 0, error: msg });
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
      // Clear previous result for this job
      setJobRunResults((prev) => { const n = { ...prev }; delete n[jobId]; return n; });

      // Snapshot the last_run before triggering so we can detect when the job finishes
      const prevLastRun = schedulerJobs[jobId]?.last_run ?? null;

      // Trigger the job — this only queues it in a background thread
      const triggerRes = await adminAPI.runSchedulerJob(jobId) as any;
      const triggerData = triggerRes?.data || triggerRes;
      if (!triggerData?.success) {
        throw new Error(triggerData?.message || `Failed to trigger job "${jobId}"`);
      }

      // Poll every 1.5s for up to 60s until last_run changes (job completed)
      const maxWait = 60000;
      const pollInterval = 1500;
      const started = Date.now();
      let completed = false;

      while (Date.now() - started < maxWait) {
        await new Promise((r) => setTimeout(r, pollInterval));
        const settingsRes = (await adminAPI.getSchedulerSettings()) as any;
        const settingsData = settingsRes?.data || settingsRes;
        const jobs: Record<string, JobInfo> = settingsData?.jobs || {};
        setSchedulerJobs(jobs);
        if (settingsData?.settings) {
          setSchedulerSettings((prev) => ({ ...prev, ...settingsData.settings }));
        }

        const updatedJob = jobs[jobId];
        if (updatedJob && updatedJob.last_run !== prevLastRun) {
          // Job has run — capture result
          setJobRunResults((prev) => ({
            ...prev,
            [jobId]: {
              status: updatedJob.last_status === 'success' ? 'success' : 'error',
              message: updatedJob.last_message || (updatedJob.last_status === 'success' ? 'Completed successfully' : 'Job failed — check logs'),
              ts: updatedJob.last_run || new Date().toISOString(),
            },
          }));
          completed = true;
          break;
        }
      }

      if (!completed) {
        setJobRunResults((prev) => ({
          ...prev,
          [jobId]: {
            status: 'error',
            message: 'Job timed out — it may still be running. Check status again in a moment.',
            ts: new Date().toISOString(),
          },
        }));
      }
    } catch (err: unknown) {
      const axiosErr = err as any;
      const detail = axiosErr?.response?.data?.detail || axiosErr?.response?.data?.error || '';
      const httpStatus = axiosErr?.response?.status;
      const base = getErrorMessage(err);
      const msg = detail ? (httpStatus ? `HTTP ${httpStatus}: ${detail}` : detail) : base;
      setJobRunResults((prev) => ({
        ...prev,
        [jobId]: { status: 'error', message: msg, ts: new Date().toISOString() },
      }));
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
          is_sensitive: true,
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

  const handleSaveModel = async (provider: ProviderConfig) => {
    if (!provider.modelField) return;
    const raw = selectedModels[provider.provider];
    const model = raw === '__custom__'
      ? customModelInputs[provider.provider]?.trim()
      : raw;

    if (!model) {
      setModelErrors((prev) => ({ ...prev, [provider.provider]: 'Please select or enter a model name.' }));
      return;
    }

    try {
      setSavingModel(provider.provider);
      setModelErrors((prev) => ({ ...prev, [provider.provider]: '' }));

      await connectorsAPI.saveConfiguration({
        category: 'genai',
        key: provider.modelField,
        value: model,
        is_sensitive: false,
      });

      // If it was a custom entry, collapse it to the saved value in state
      if (raw === '__custom__') {
        setSelectedModels((prev) => ({ ...prev, [provider.provider]: model }));
        setCustomModelInputs((prev) => ({ ...prev, [provider.provider]: '' }));
        // Add to knownModels list isn't possible (const), so leave as-is
      }

      setSuccess(`${provider.label} model set to "${model}". Run Test to verify it exists.`);
    } catch (err: unknown) {
      setModelErrors((prev) => ({ ...prev, [provider.provider]: getErrorMessage(err) }));
    } finally {
      setSavingModel(null);
    }
  };

  const handleTestProvider = (providerName: string) => {
    setTestDialogResult(null);
    setTestDialog({
      provider: providerName,
      prompt: 'Summarize this threat in 2 sentences: A new ransomware campaign targeting healthcare organizations uses spear-phishing emails with malicious Excel attachments. The malware establishes persistence via scheduled tasks, communicates with C2 at malicious-domain[.]com, and encrypts files using AES-256.',
    });
  };

  const handleRunTestDialog = async () => {
    if (!testDialog) return;
    try {
      setTestDialogLoading(true);
      setTestDialogResult(null);
      const res = await genaiAPI.testProvider(testDialog.provider, 'summary') as any;
      const data = res?.data || res;
      const isFailed = data?.status === 'failed' || (!data?.generated_summary && !data?.generated_query && !data?.analysis && data?.error);
      setTestDialogResult({
        status: isFailed ? 'failed' : 'success',
        provider: data?.provider || testDialog.provider,
        prompt_sent: testDialog.prompt,
        response: data?.generated_summary || data?.generated_query || data?.analysis || data?.output || data?.message,
        model: data?.model,
        error: data?.error,
        suggestion: data?.suggestion,
        test_type: data?.test_type || 'executive_summary',
      });
    } catch (err: unknown) {
      // HTTP error — extract the detail message from the response body if available
      const axiosErr = err as any;
      const detail = axiosErr?.response?.data?.detail || axiosErr?.response?.data?.error || '';
      const httpStatus = axiosErr?.response?.status;
      const baseMsg = getErrorMessage(err);
      const errorMsg = detail || baseMsg;
      setTestDialogResult({
        status: 'failed',
        provider: testDialog.provider,
        prompt_sent: testDialog.prompt,
        error: httpStatus ? `HTTP ${httpStatus}: ${errorMsg}` : errorMsg,
        suggestion: axiosErr?.response?.data?.suggestion,
      });
    } finally {
      setTestDialogLoading(false);
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
    <>
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
                    <button
                      onClick={() => handleTestProvider(provider.provider)}
                      disabled={isTesting || (!hasKey && !apiKeys[provider.provider]?.trim() && !provider.isLocal)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
                    >
                      <TestTube className={cn('w-3.5 h-3.5', isTesting && 'animate-pulse')} />
                      {isTesting ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                </div>

                {/* Provider Config */}
                <div className="border-t border-border p-4 bg-muted/30 space-y-3">
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
                    <>
                      {/* API Key row */}
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

                      {/* Model selector row */}
                      {provider.modelField && (
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-muted-foreground">
                            Model
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={selectedModels[provider.provider] || ''}
                              onChange={(e) => {
                                setSelectedModels((prev) => ({ ...prev, [provider.provider]: e.target.value }));
                                setModelErrors((prev) => ({ ...prev, [provider.provider]: '' }));
                                if (e.target.value !== '__custom__') {
                                  setCustomModelInputs((prev) => ({ ...prev, [provider.provider]: '' }));
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">— use default —</option>
                              {provider.knownModels?.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                              <option value="__custom__">Other / Custom model ID...</option>
                            </select>
                            {selectedModels[provider.provider] && selectedModels[provider.provider] !== '__custom__' && (
                              <button
                                onClick={() => handleSaveModel(provider)}
                                disabled={savingModel === provider.provider}
                                className="px-3 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 text-sm flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {savingModel === provider.provider ? 'Saving...' : 'Save'}
                              </button>
                            )}
                          </div>

                          {/* Custom model input */}
                          {selectedModels[provider.provider] === '__custom__' && (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={customModelInputs[provider.provider] || ''}
                                onChange={(e) => {
                                  setCustomModelInputs((prev) => ({ ...prev, [provider.provider]: e.target.value }));
                                  setModelErrors((prev) => ({ ...prev, [provider.provider]: '' }));
                                }}
                                placeholder={`e.g. ${provider.knownModels?.[0] ?? 'model-id'}`}
                                className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                              <button
                                onClick={() => handleSaveModel(provider)}
                                disabled={savingModel === provider.provider || !customModelInputs[provider.provider]?.trim()}
                                className="px-3 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 text-sm flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {savingModel === provider.provider ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          )}

                          {/* Model error */}
                          {modelErrors[provider.provider] && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              {modelErrors[provider.provider]}
                            </p>
                          )}

                          {/* Active model hint */}
                          <p className="text-xs text-muted-foreground">
                            Active:{' '}
                            <span className="font-medium text-foreground">
                              {savedKeys[provider.modelField] && savedKeys[provider.modelField] !== '********'
                                ? savedKeys[provider.modelField]
                                : (status as any)?.model || 'provider default'}
                            </span>
                            {' '}— use <strong>Test</strong> above to verify the model exists.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Provider model count (Ollama) */}
                  {status?.models && status.models.length > 0 && provider.isLocal && (
                    <p className="text-xs text-muted-foreground">
                      {status.models.length} models installed
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
          <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Final Prompt Preview
                </h3>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">Function: <span className="font-mono text-foreground">{promptPreview.function}</span></span>
                  {promptPreview.summary_type && <span className="text-xs text-muted-foreground">· {promptPreview.summary_type}</span>}
                  <span className="text-xs text-muted-foreground">· {promptPreview.total_length} chars</span>
                  {promptPreview.skill_count !== undefined && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded">{promptPreview.skill_count} skills active</span>
                  )}
                  {promptPreview.guardrail_count !== undefined && (
                    <span className="text-xs px-1.5 py-0.5 bg-orange-500/10 text-orange-600 rounded">{promptPreview.guardrail_count} guardrails active</span>
                  )}
                </div>
              </div>
              <button onClick={() => setPromptPreview(null)} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-border px-5 gap-1">
              {([
                { key: 'system', label: 'System Prompt' },
                { key: 'user', label: 'User Prompt' },
                { key: 'skills', label: `Skills (${promptPreview.skills_applied?.length ?? 0})` },
                { key: 'guardrails', label: `Guardrails (${promptPreview.guardrails_applied?.length ?? 0})` },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPromptPreviewTab(tab.key)}
                  className={cn('px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                    promptPreviewTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >{tab.label}</button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {promptPreview.error && (
                <div className="mb-3 p-3 bg-red-500/5 border border-red-500/20 rounded text-xs text-red-600 font-mono">
                  {promptPreview.error}
                </div>
              )}

              {promptPreviewTab === 'system' && (
                <pre className="text-xs text-foreground/85 font-mono whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-4 border border-border/50">
                  {promptPreview.system_prompt || '(empty)'}
                </pre>
              )}

              {promptPreviewTab === 'user' && (
                <pre className="text-xs text-foreground/85 font-mono whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-4 border border-border/50">
                  {promptPreview.user_prompt || '(The user prompt is built dynamically at runtime from the actual article content, IOCs, and TTPs.)'}
                </pre>
              )}

              {promptPreviewTab === 'skills' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">Skills inject additional instructions into the system prompt at runtime, before the model call.</p>
                  {(promptPreview.skills_applied || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No active skills.</p>
                  ) : (
                    (promptPreview.skills_applied || []).map((s, i) => (
                      <div key={i} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-foreground">{s.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded">{s.category}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {promptPreviewTab === 'guardrails' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">Guardrails validate input before and output after each model call.</p>
                  {(promptPreview.guardrails_applied || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No active guardrails.</p>
                  ) : (
                    (promptPreview.guardrails_applied || []).map((g, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg border border-border/50">
                        <span className="text-xs font-medium text-foreground flex-1">{g.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">{g.type}</span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium',
                          g.action === 'reject' ? 'bg-red-500/10 text-red-600' :
                          g.action === 'retry' ? 'bg-yellow-500/10 text-yellow-600' :
                          g.action === 'fix' ? 'bg-blue-500/10 text-blue-600' :
                          'bg-muted text-muted-foreground'
                        )}>{g.action}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Skills and guardrails are injected dynamically at runtime — this preview shows the current active set.
              </span>
              <button onClick={() => setPromptPreview(null)} className="px-3 py-1.5 bg-muted rounded text-xs hover:bg-accent">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== AUTOMATION TAB ====== */}
      {activeTab === 'automation' && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Configure how frequently feeds are polled and enable automated GenAI processing.
            Changes are applied immediately to running jobs after saving.
          </p>

          {/* ── Feed Polling ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Rss className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Feed Polling Intervals</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">

              {/* Org Feeds */}
              {(['feed_ingestion', 'user_feed_ingestion'] as const).map((jobId, idx) => {
                const isCustom = idx === 1;
                const label = isCustom ? 'Personal Feeds — Poll Every' : 'Org Feeds — Poll Every';
                const intervalKey = isCustom ? 'custom_feed_poll_interval_minutes' : 'org_feed_poll_interval_minutes';
                const defaultVal = isCustom ? 30 : 60;
                const job = schedulerJobs[jobId];
                const result = jobRunResults[jobId];
                const isRunning = runningJob === jobId;
                return (
                  <div key={jobId}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-foreground">{label}</label>
                      {isCustom && (
                        <button
                          onClick={() => setSchedulerSettings((p) => ({ ...p, custom_feed_enabled: !p.custom_feed_enabled }))}
                          className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none', schedulerSettings.custom_feed_enabled ? 'bg-green-500' : 'bg-muted')}
                          title={schedulerSettings.custom_feed_enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                        >
                          <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform', schedulerSettings.custom_feed_enabled ? 'translate-x-5' : 'translate-x-0.5')} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={5} max={1440}
                        value={schedulerSettings[intervalKey]}
                        onChange={(e) => setSchedulerSettings((p) => ({ ...p, [intervalKey]: parseInt(e.target.value) || defaultVal }))}
                        className="w-24 px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <span className="text-sm text-muted-foreground">minutes</span>
                    </div>
                    {job && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        <div>Last run: {job.last_run ? new Date(job.last_run).toLocaleString() : '—'} · Runs: {job.run_count}</div>
                        {job.last_status && (
                          <div className={cn('font-medium', job.last_status === 'success' ? 'text-green-600' : 'text-red-600')}>
                            {job.last_status === 'success' ? '✓' : '✗'} {job.last_message || job.last_status}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Inline run result */}
                    {result && (
                      <div className={cn('mt-2 p-2 rounded text-xs border', result.status === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-700' : 'bg-red-500/5 border-red-500/20 text-red-700')}>
                        <span className="font-semibold">{result.status === 'success' ? '✓ Run completed:' : '✗ Run failed:'}</span>{' '}
                        {result.message}
                      </div>
                    )}
                    <button
                      onClick={() => handleRunJob(jobId)}
                      disabled={isRunning}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
                    >
                      {isRunning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…</> : <><Play className="w-3.5 h-3.5" /> Run Now</>}
                    </button>
                  </div>
                );
              })}
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
              Interval is always editable — toggle enables/disables the scheduled run.
              Use Run Now to trigger immediately regardless of toggle state.
            </p>

            <div className="space-y-4">
              {([
                {
                  jobId: 'genai_batch_summarize',
                  icon: <Brain className="w-4 h-4 text-blue-500" />,
                  label: 'Auto-Summarize New Articles',
                  desc: 'Generates executive & technical summaries for articles ingested without one. Processes up to 20 articles per run.',
                  enabledKey: 'genai_summarize_enabled' as const,
                  intervalKey: 'genai_summarize_interval_minutes' as const,
                  defaultInterval: 60,
                },
                {
                  jobId: 'genai_batch_extract',
                  icon: <Zap className="w-4 h-4 text-yellow-500" />,
                  label: 'Auto-Extract IOCs & TTPs',
                  desc: 'Extracts IOCs and MITRE ATT&CK TTPs from articles not yet analyzed. Processes up to 10 articles per run.',
                  enabledKey: 'genai_extract_enabled' as const,
                  intervalKey: 'genai_extract_interval_minutes' as const,
                  defaultInterval: 120,
                },
              ]).map(({ jobId, icon, label, desc, enabledKey, intervalKey, defaultInterval }) => {
                const job = schedulerJobs[jobId];
                const result = jobRunResults[jobId];
                const isRunning = runningJob === jobId;
                const isEnabled = schedulerSettings[enabledKey];
                return (
                  <div key={jobId} className="p-4 bg-muted/30 rounded-lg space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {icon}
                          <span className="font-medium text-sm">{label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      {/* Toggle */}
                      <button
                        onClick={() => setSchedulerSettings((p) => ({ ...p, [enabledKey]: !p[enabledKey] }))}
                        className={cn('relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none mt-0.5', isEnabled ? 'bg-green-500' : 'bg-muted')}
                        title={isEnabled ? 'Scheduled: ON — click to disable' : 'Scheduled: OFF — click to enable'}
                      >
                        <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform', isEnabled ? 'translate-x-5' : 'translate-x-0.5')} />
                      </button>
                    </div>

                    {/* Interval + Run Now row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Every</span>
                        <input
                          type="number" min={15} max={1440}
                          value={schedulerSettings[intervalKey]}
                          onChange={(e) => setSchedulerSettings((p) => ({ ...p, [intervalKey]: parseInt(e.target.value) || defaultInterval }))}
                          className="w-20 px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                      <button
                        onClick={() => handleRunJob(jobId)}
                        disabled={isRunning}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 font-medium"
                      >
                        {isRunning ? <><Loader2 className="w-3 h-3 animate-spin" /> Running…</> : <><Play className="w-3 h-3" /> Run Now</>}
                      </button>
                    </div>

                    {/* Last run status from scheduler */}
                    {job && (job.last_run || job.run_count > 0) && (
                      <div className="text-xs text-muted-foreground">
                        Last run: {job.last_run ? new Date(job.last_run).toLocaleString() : '—'} · Total runs: {job.run_count}
                        {job.last_status && (
                          <span className={cn('ml-2 font-medium', job.last_status === 'success' ? 'text-green-600' : 'text-red-600')}>
                            {job.last_status === 'success' ? '✓' : '✗'} {job.last_message}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Inline result from most recent Run Now */}
                    {result && (
                      <div className={cn('p-2.5 rounded border text-xs', result.status === 'success' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20')}>
                        <div className={cn('font-semibold mb-0.5', result.status === 'success' ? 'text-green-700' : 'text-red-700')}>
                          {result.status === 'success' ? '✓ Run completed' : '✗ Run failed'} · {new Date(result.ts).toLocaleTimeString()}
                        </div>
                        <div className={cn('font-mono break-all', result.status === 'success' ? 'text-green-700/80' : 'text-red-700/80')}>
                          {result.message}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

    {/* ====== PROVIDER TEST DIALOG ====== */}

    {testDialog && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TestTube className="w-5 h-5 text-primary" />
                Test {PROVIDER_DEFS.find(p => p.provider === testDialog.provider)?.label || testDialog.provider}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Send a sample prompt and verify the model responds correctly</p>
            </div>
            <button onClick={() => { setTestDialog(null); setTestDialogResult(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Prompt Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Test Prompt</label>
              <textarea
                value={testDialog.prompt}
                onChange={(e) => setTestDialog(prev => prev ? { ...prev, prompt: e.target.value } : null)}
                rows={4}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">The prompt above will be sent as a summarization request to test the provider connection and response quality.</p>
            </div>

            {/* Result */}
            {testDialogResult && (
              <div className={cn(
                'rounded-lg border p-4 space-y-3',
                testDialogResult.status === 'success' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
              )}>
                {/* Status header */}
                <div className="flex items-center gap-2 flex-wrap">
                  {testDialogResult.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className={cn('text-sm font-semibold', testDialogResult.status === 'success' ? 'text-green-700' : 'text-red-700')}>
                    {testDialogResult.status === 'success' ? 'Test Passed' : 'Test Failed'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Provider: <span className="font-mono text-foreground">{testDialogResult.provider}</span>
                  </span>
                  {testDialogResult.test_type && (
                    <span className="text-xs text-muted-foreground">
                      · Type: <span className="font-mono text-foreground">{testDialogResult.test_type}</span>
                    </span>
                  )}
                  {testDialogResult.model && (
                    <span className="ml-auto text-xs text-muted-foreground font-mono">{testDialogResult.model}</span>
                  )}
                </div>

                {/* Success response */}
                {testDialogResult.response && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Model Response:</p>
                    <div className="bg-background rounded-md p-3 text-xs text-foreground/80 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap border border-border/50">
                      {testDialogResult.response}
                    </div>
                  </div>
                )}

                {/* Error detail */}
                {testDialogResult.error && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 mb-1">What went wrong:</p>
                    <div className="bg-background rounded-md p-3 text-xs text-red-600/90 font-mono border border-red-500/20 whitespace-pre-wrap break-all">
                      {testDialogResult.error}
                    </div>
                  </div>
                )}

                {/* Suggestion / remediation */}
                {testDialogResult.suggestion && (
                  <div className="flex gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-md">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-yellow-700 mb-0.5">How to fix:</p>
                      <p className="text-xs text-yellow-700/80 leading-relaxed">{testDialogResult.suggestion}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleRunTestDialog}
                disabled={testDialogLoading || !testDialog.prompt.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium text-sm"
              >
                {testDialogLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {testDialogLoading ? 'Sending...' : 'Send Test Prompt'}
              </button>
              <button
                onClick={() => { setTestDialog(null); setTestDialogResult(null); }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
