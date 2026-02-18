'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle,
  Play,
  Zap,
  X,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { guardrailsAPI, skillsAPI, getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

// ---- Types ----

interface Guardrail {
  id: number;
  name: string;
  description: string | null;
  type: string;
  config: Record<string, any>;
  action: string;
  max_retries: number;
  is_active: boolean;
  created_at: string;
  created_by_id: number | null;
}

interface GuardrailType {
  type: string;
  description: string;
  example_config: Record<string, any>;
}

interface Skill {
  id: string;
  name: string;
  description: string | null;
  persona: string;
  instructions: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type TabType = 'guardrails' | 'skills';

// ---- Component ----

export default function GuardrailsManager() {
  const [activeTab, setActiveTab] = useState<TabType>('guardrails');

  // Guardrails state
  const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
  const [guardrailTypes, setGuardrailTypes] = useState<GuardrailType[]>([]);
  const [guardrailsLoading, setGuardrailsLoading] = useState(true);

  // Skills state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);

  // Shared state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [showCreateGuardrail, setShowCreateGuardrail] = useState(false);
  const [editingGuardrail, setEditingGuardrail] = useState<Guardrail | null>(null);
  const [showCreateSkill, setShowCreateSkill] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'guardrail' | 'skill'; id: number | string; name: string } | null>(null);

  // Test state
  const [testGuardrailId, setTestGuardrailId] = useState<number | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{ passed: boolean; violations: string[]; action_taken?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Guardrail form
  const [gForm, setGForm] = useState({
    name: '',
    description: '',
    type: 'pii',
    config: '{}',
    action: 'retry',
    max_retries: 2,
    is_active: true,
  });

  // Skill form
  const [sForm, setSForm] = useState({
    name: '',
    description: '',
    persona: 'analyst',
    instructions: '',
    is_active: true,
  });

  // Clear alerts after 5s
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Fetch data
  const fetchGuardrails = useCallback(async () => {
    try {
      setGuardrailsLoading(true);
      const [guardrailsRes, typesRes] = await Promise.all([
        guardrailsAPI.list() as any,
        guardrailsAPI.getTypes() as any,
      ]);
      setGuardrails(Array.isArray(guardrailsRes) ? guardrailsRes : guardrailsRes.data || []);
      setGuardrailTypes(Array.isArray(typesRes) ? typesRes : typesRes.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setGuardrailsLoading(false);
    }
  }, []);

  const fetchSkills = useCallback(async () => {
    try {
      setSkillsLoading(true);
      const res = await skillsAPI.list() as any;
      setSkills(Array.isArray(res) ? res : res.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuardrails();
    fetchSkills();
  }, [fetchGuardrails, fetchSkills]);

  // ---- Guardrail handlers ----

  const openEditGuardrail = (g: Guardrail) => {
    setEditingGuardrail(g);
    setGForm({
      name: g.name,
      description: g.description || '',
      type: g.type,
      config: JSON.stringify(g.config, null, 2),
      action: g.action,
      max_retries: g.max_retries,
      is_active: g.is_active,
    });
  };

  const handleSaveGuardrail = async () => {
    try {
      setError('');
      if (!gForm.name.trim()) { setError('Name is required'); return; }
      let configParsed: Record<string, any>;
      try {
        configParsed = JSON.parse(gForm.config);
      } catch {
        setError('Config must be valid JSON');
        return;
      }

      const payload = {
        name: gForm.name.trim(),
        description: gForm.description.trim() || undefined,
        type: gForm.type,
        config: configParsed,
        action: gForm.action,
        max_retries: gForm.max_retries,
        is_active: gForm.is_active,
      };

      if (editingGuardrail) {
        await guardrailsAPI.update(editingGuardrail.id, payload);
        setSuccess('Guardrail updated');
        setEditingGuardrail(null);
      } else {
        await guardrailsAPI.create(payload);
        setSuccess('Guardrail created');
        setShowCreateGuardrail(false);
      }

      resetGForm();
      await fetchGuardrails();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleToggleGuardrail = async (g: Guardrail) => {
    try {
      await guardrailsAPI.update(g.id, { is_active: !g.is_active });
      setGuardrails(prev => prev.map(gr => gr.id === g.id ? { ...gr, is_active: !gr.is_active } : gr));
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteGuardrail = async (id: number) => {
    try {
      setError('');
      await guardrailsAPI.delete(id);
      setSuccess('Guardrail deleted');
      setDeleteConfirm(null);
      await fetchGuardrails();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleTestGuardrail = async () => {
    if (!testGuardrailId || !testInput.trim()) { setError('Enter test input'); return; }
    const guardrail = guardrails.find(g => g.id === testGuardrailId);
    if (!guardrail) return;

    try {
      setTesting(true);
      setError('');
      const res = await guardrailsAPI.test({
        guardrail_type: guardrail.type,
        config: guardrail.config,
        test_input: testInput,
      }) as any;
      const result = res.data || res;
      setTestResult({
        passed: result.passed,
        violations: result.violations || [],
        action_taken: result.action_taken,
      });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  const resetGForm = () => {
    setGForm({ name: '', description: '', type: 'pii', config: '{}', action: 'retry', max_retries: 2, is_active: true });
  };

  // ---- Skill handlers ----

  const openEditSkill = (s: Skill) => {
    setEditingSkill(s);
    setSForm({
      name: s.name,
      description: s.description || '',
      persona: s.persona,
      instructions: s.instructions,
      is_active: s.is_active,
    });
  };

  const handleSaveSkill = async () => {
    try {
      setError('');
      if (!sForm.name.trim() || !sForm.instructions.trim()) {
        setError('Name and instructions are required');
        return;
      }

      const payload = {
        name: sForm.name.trim(),
        description: sForm.description.trim() || undefined,
        persona: sForm.persona,
        instructions: sForm.instructions.trim(),
        is_active: sForm.is_active,
      };

      if (editingSkill) {
        await skillsAPI.update(editingSkill.id, payload);
        setSuccess('Skill updated');
        setEditingSkill(null);
      } else {
        await skillsAPI.create(payload);
        setSuccess('Skill created');
        setShowCreateSkill(false);
      }

      resetSForm();
      await fetchSkills();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleToggleSkill = async (s: Skill) => {
    try {
      await skillsAPI.update(s.id, { is_active: !s.is_active });
      setSkills(prev => prev.map(sk => sk.id === s.id ? { ...sk, is_active: !sk.is_active } : sk));
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      setError('');
      await skillsAPI.delete(id);
      setSuccess('Skill deleted');
      setDeleteConfirm(null);
      await fetchSkills();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const resetSForm = () => {
    setSForm({ name: '', description: '', persona: 'analyst', instructions: '', is_active: true });
  };

  // ---- Helpers ----

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const actionColors: Record<string, string> = {
    retry: 'bg-yellow-500/10 text-yellow-600',
    reject: 'bg-red-500/10 text-red-600',
    fix: 'bg-blue-500/10 text-blue-600',
    log: 'bg-gray-500/10 text-gray-500',
  };

  const personaColors: Record<string, string> = {
    executive: 'bg-purple-500/10 text-purple-600',
    analyst: 'bg-blue-500/10 text-blue-600',
    technical: 'bg-green-500/10 text-green-600',
  };

  // Populate example config when type changes
  const onGuardrailTypeChange = (type: string) => {
    const typeInfo = guardrailTypes.find(t => t.type === type);
    setGForm(f => ({
      ...f,
      type,
      config: typeInfo ? JSON.stringify(typeInfo.example_config, null, 2) : f.config,
    }));
  };

  // ---- Render ----

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Guardrails &amp; Skills</h1>
          <p className="text-muted-foreground mt-2">
            Manage GenAI safety guardrails and domain expertise skills
          </p>
        </div>
        <button
          onClick={() => activeTab === 'guardrails' ? setShowCreateGuardrail(true) : setShowCreateSkill(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'guardrails' ? 'Guardrail' : 'Skill'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {[
          { key: 'guardrails' as TabType, label: 'Guardrails', icon: Shield, count: guardrails.length },
          { key: 'skills' as TabType, label: 'Skills', icon: Sparkles, count: skills.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-600">Error</p>
            <p className="text-sm text-red-600/80">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-700"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-green-600">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ========== GUARDRAILS TAB ========== */}
      {activeTab === 'guardrails' && (
        <div className="space-y-4">
          {guardrailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : guardrails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No guardrails configured</p>
              <p className="text-sm mt-1">Add your first guardrail to protect GenAI operations</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guardrails.map((g) => (
                    <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{g.name}</p>
                          {g.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">{g.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-600">
                          {g.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', actionColors[g.action] || 'bg-gray-500/10 text-gray-500')}>
                          {g.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ToggleSwitch
                          checked={g.is_active}
                          onChange={() => handleToggleGuardrail(g)}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(g.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => { setTestGuardrailId(g.id); setTestInput(''); setTestResult(null); }}
                            className="p-1.5 hover:bg-accent rounded text-blue-600"
                            title="Test guardrail"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditGuardrail(g)}
                            className="p-1.5 hover:bg-accent rounded text-foreground"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'guardrail', id: g.id, name: g.name })}
                            className="p-1.5 hover:bg-accent rounded text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== SKILLS TAB ========== */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          {skillsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No skills configured</p>
              <p className="text-sm mt-1">Add domain expertise skills for GenAI prompts</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {skills.map((s) => (
                <div key={s.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <h3 className="font-medium text-foreground">{s.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <ToggleSwitch
                        checked={s.is_active}
                        onChange={() => handleToggleSkill(s)}
                        size="sm"
                      />
                      <button
                        onClick={() => openEditSkill(s)}
                        className="p-1.5 hover:bg-accent rounded text-foreground"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'skill', id: s.id, name: s.name })}
                        className="p-1.5 hover:bg-accent rounded text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {s.description && (
                    <p className="text-sm text-muted-foreground mb-3">{s.description}</p>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', personaColors[s.persona] || 'bg-gray-500/10 text-gray-500')}>
                      {s.persona}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDate(s.updated_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded p-2 font-mono">
                    {s.instructions}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== MODALS ========== */}

      {/* Create/Edit Guardrail Modal */}
      {(showCreateGuardrail || editingGuardrail) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {editingGuardrail ? 'Edit Guardrail' : 'Add New Guardrail'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                <input
                  type="text"
                  value={gForm.name}
                  onChange={(e) => setGForm({ ...gForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={gForm.description}
                  onChange={(e) => setGForm({ ...gForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {!editingGuardrail && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Type *</label>
                  <select
                    value={gForm.type}
                    onChange={(e) => onGuardrailTypeChange(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {guardrailTypes.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.type} - {t.description}
                      </option>
                    ))}
                    {guardrailTypes.length === 0 && (
                      <>
                        <option value="pii">PII Detection</option>
                        <option value="prompt_injection">Prompt Injection</option>
                        <option value="length">Length Limits</option>
                        <option value="toxicity">Toxicity Filter</option>
                        <option value="keywords_forbidden">Forbidden Keywords</option>
                        <option value="keywords_required">Required Keywords</option>
                        <option value="format">Format Enforcement</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Config (JSON) *</label>
                <textarea
                  value={gForm.config}
                  onChange={(e) => setGForm({ ...gForm, config: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Action on Failure</label>
                  <select
                    value={gForm.action}
                    onChange={(e) => setGForm({ ...gForm, action: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="retry">Retry</option>
                    <option value="reject">Reject</option>
                    <option value="fix">Fix</option>
                    <option value="log">Log Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Max Retries</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={gForm.max_retries}
                    onChange={(e) => setGForm({ ...gForm, max_retries: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={gForm.is_active}
                  onChange={(v) => setGForm({ ...gForm, is_active: v })}
                  label="Active"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveGuardrail}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                {editingGuardrail ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => { setShowCreateGuardrail(false); setEditingGuardrail(null); resetGForm(); }}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Skill Modal */}
      {(showCreateSkill || editingSkill) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {editingSkill ? 'Edit Skill' : 'Add New Skill'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                <input
                  type="text"
                  value={sForm.name}
                  onChange={(e) => setSForm({ ...sForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={sForm.description}
                  onChange={(e) => setSForm({ ...sForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Persona</label>
                <select
                  value={sForm.persona}
                  onChange={(e) => setSForm({ ...sForm, persona: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="executive">Executive</option>
                  <option value="analyst">Analyst</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Instructions *</label>
                <textarea
                  value={sForm.instructions}
                  onChange={(e) => setSForm({ ...sForm, instructions: e.target.value })}
                  rows={6}
                  placeholder="Domain expertise instructions for the GenAI model..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={sForm.is_active}
                  onChange={(v) => setSForm({ ...sForm, is_active: v })}
                  label="Active"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveSkill}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                {editingSkill ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => { setShowCreateSkill(false); setEditingSkill(null); resetSForm(); }}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Guardrail Modal */}
      {testGuardrailId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Test Guardrail</h2>
              <button onClick={() => { setTestGuardrailId(null); setTestResult(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              Testing: <span className="font-medium text-foreground">{guardrails.find(g => g.id === testGuardrailId)?.name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Test Input</label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  rows={4}
                  placeholder="Enter text to test against the guardrail..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {testResult && (
                <div className={cn(
                  'rounded-lg p-3 border',
                  testResult.passed
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    {testResult.passed ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={cn('font-medium text-sm', testResult.passed ? 'text-green-600' : 'text-red-600')}>
                      {testResult.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  {testResult.violations.length > 0 && (
                    <ul className="text-xs text-red-600/80 mt-1 space-y-0.5">
                      {testResult.violations.map((v, i) => (
                        <li key={i}>- {v}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleTestGuardrail}
                disabled={testing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
              >
                {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {testing ? 'Testing...' : 'Run Test'}
              </button>
              <button
                onClick={() => { setTestGuardrailId(null); setTestResult(null); }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Delete {deleteConfirm.type}?</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-foreground mb-4">
              Are you sure you want to delete <span className="font-medium">&quot;{deleteConfirm.name}&quot;</span>?
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'guardrail') handleDeleteGuardrail(deleteConfirm.id as number);
                  else handleDeleteSkill(deleteConfirm.id as string);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
