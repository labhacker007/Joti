'use client';

import React, { useEffect, useState } from 'react';
import {
  Brain,
  AlertCircle,
  CheckCircle,
  Save,
  ToggleRight,
  ToggleLeft,
} from 'lucide-react';
import { adminAPI } from '@/api/client';
import { cn } from '@/lib/utils';

interface GenAIConfig {
  provider: string;
  model: string;
  api_key: string;
  enabled: boolean;
  max_tokens: number;
  temperature: number;
  base_url?: string;
}

export default function GenAIManagement() {
  const [config, setConfig] = useState<GenAIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<GenAIConfig | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError('');
      // Mock config retrieval
      const mockConfig: GenAIConfig = {
        provider: 'openai',
        model: 'gpt-4',
        api_key: '***hidden***',
        enabled: true,
        max_tokens: 2000,
        temperature: 0.7,
      };
      setConfig(mockConfig);
      setFormData(mockConfig);
    } catch (err: any) {
      setError(err.message || 'Failed to load GenAI config');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!formData) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Mock save
      setConfig(formData);
      setSuccess('GenAI configuration updated successfully');
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading GenAI configuration...</div>
      </div>
    );
  }

  if (!config || !formData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">GenAI configuration not available</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">GenAI Management</h1>
          <p className="text-muted-foreground mt-2">Configure AI model providers and settings</p>
        </div>
        {!editMode && (
          <button
            onClick={() => {
              setEditMode(true);
              setFormData(config);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Brain className="w-4 h-4" />
            Edit Configuration
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-600">Error</p>
            <p className="text-sm text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-600">Success</p>
            <p className="text-sm text-green-600/80">{success}</p>
          </div>
        </div>
      )}

      {/* Configuration Card */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <h2 className="text-xl font-bold text-foreground">Provider Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              AI Provider
            </label>
            {editMode ? (
              <select
                value={formData.provider}
                onChange={(e) =>
                  setFormData({ ...formData, provider: e.target.value })
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama</option>
                <option value="huggingface">HuggingFace</option>
              </select>
            ) : (
              <p className="text-lg font-semibold text-foreground capitalize">{config.provider}</p>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Model
            </label>
            {editMode ? (
              <input
                type="text"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <p className="text-lg font-semibold text-foreground">{config.model}</p>
            )}
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Max Tokens
            </label>
            {editMode ? (
              <input
                type="number"
                value={formData.max_tokens}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_tokens: parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <p className="text-lg font-semibold text-foreground">{config.max_tokens}</p>
            )}
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Temperature
            </label>
            {editMode ? (
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    temperature: parseFloat(e.target.value),
                  })
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <p className="text-lg font-semibold text-foreground">{config.temperature}</p>
            )}
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            API Key
          </label>
          {editMode ? (
            <input
              type="password"
              value={formData.api_key}
              onChange={(e) =>
                setFormData({ ...formData, api_key: e.target.value })
              }
              placeholder="Enter your API key"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          ) : (
            <p className="text-sm font-mono text-muted-foreground">
              {config.api_key === '***hidden***' ? '●●●●●●●●●●●●●●●●' : config.api_key}
            </p>
          )}
        </div>

        {/* Enabled Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <h3 className="font-semibold text-foreground">Status</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {config.enabled ? 'GenAI is active and ready to use' : 'GenAI is currently disabled'}
            </p>
          </div>
          {editMode ? (
            <button
              onClick={() =>
                setFormData({ ...formData, enabled: !formData.enabled })
              }
              className="transition-colors"
            >
              {formData.enabled ? (
                <ToggleRight className="w-6 h-6 text-primary" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                config.enabled
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-gray-500/10 text-gray-600'
              )}
            >
              {config.enabled ? 'Enabled' : 'Disabled'}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {editMode && (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              setEditMode(false);
              setFormData(config);
            }}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      )}
    </div>
  );
}
