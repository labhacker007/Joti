'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  AlertCircle,
  CheckCircle,
  Save,
  RefreshCw,
  ToggleRight,
  ToggleLeft,
} from 'lucide-react';
import { adminAPI } from '@/api/client';
import { cn } from '@/lib/utils';

interface SystemConfig {
  app_name: string;
  app_version: string;
  debug_mode: boolean;
  max_upload_size_mb: number;
  session_timeout_minutes: number;
  enable_api_docs: boolean;
  enable_automation_scheduler: boolean;
  cors_origins: string;
  admin_email: string;
}

export default function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState<SystemConfig | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getSettings() as any;
      setConfig(response.data);
      setFormData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load system settings');
      console.error('Settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!formData) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await adminAPI.updateSettings(formData);
      setSuccess('System settings updated successfully');
      setConfig(formData);
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(config);
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading system settings...</div>
      </div>
    );
  }

  if (!config || !formData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">System settings not available</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground mt-2">Configure system-wide settings and behavior</p>
        </div>
        {!editMode && (
          <button
            onClick={() => {
              setEditMode(true);
              setFormData(config);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Edit Settings
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

      {/* General Settings */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <h2 className="text-xl font-bold text-foreground">General Settings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* App Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Application Name
            </label>
            {editMode ? (
              <input
                type="text"
                value={formData.app_name}
                onChange={(e) =>
                  setFormData({ ...formData, app_name: e.target.value })
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <p className="text-lg font-semibold text-foreground">{config.app_name}</p>
            )}
          </div>

          {/* App Version */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Version
            </label>
            <p className="text-lg font-semibold text-foreground">{config.app_version}</p>
          </div>

          {/* Admin Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Admin Email
            </label>
            {editMode ? (
              <input
                type="email"
                value={formData.admin_email}
                onChange={(e) =>
                  setFormData({ ...formData, admin_email: e.target.value })
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <p className="text-lg font-semibold text-foreground">{config.admin_email}</p>
            )}
          </div>

          {/* Session Timeout */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Session Timeout (minutes)
            </label>
            {editMode ? (
              <input
                type="number"
                value={formData.session_timeout_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    session_timeout_minutes: parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <p className="text-lg font-semibold text-foreground">
                {config.session_timeout_minutes} minutes
              </p>
            )}
          </div>

          {/* Max Upload Size */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Max Upload Size (MB)
            </label>
            {editMode ? (
              <input
                type="number"
                value={formData.max_upload_size_mb}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_upload_size_mb: parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <p className="text-lg font-semibold text-foreground">
                {config.max_upload_size_mb} MB
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Feature Toggles</h2>

        <div className="space-y-4">
          {/* Debug Mode */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h3 className="font-semibold text-foreground">Debug Mode</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enable detailed error messages and logging
              </p>
            </div>
            {editMode ? (
              <button
                onClick={() =>
                  setFormData({ ...formData, debug_mode: !formData.debug_mode })
                }
                className="transition-colors"
              >
                {formData.debug_mode ? (
                  <ToggleRight className="w-6 h-6 text-primary" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  config.debug_mode
                    ? 'bg-blue-500/10 text-blue-600'
                    : 'bg-gray-500/10 text-gray-600'
                )}
              >
                {config.debug_mode ? 'Enabled' : 'Disabled'}
              </div>
            )}
          </div>

          {/* API Documentation */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h3 className="font-semibold text-foreground">API Documentation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enable Swagger UI and API documentation endpoints
              </p>
            </div>
            {editMode ? (
              <button
                onClick={() =>
                  setFormData({ ...formData, enable_api_docs: !formData.enable_api_docs })
                }
                className="transition-colors"
              >
                {formData.enable_api_docs ? (
                  <ToggleRight className="w-6 h-6 text-primary" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  config.enable_api_docs
                    ? 'bg-blue-500/10 text-blue-600'
                    : 'bg-gray-500/10 text-gray-600'
                )}
              >
                {config.enable_api_docs ? 'Enabled' : 'Disabled'}
              </div>
            )}
          </div>

          {/* Automation Scheduler */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h3 className="font-semibold text-foreground">Automation Scheduler</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enable background job scheduling and automation
              </p>
            </div>
            {editMode ? (
              <button
                onClick={() =>
                  setFormData({
                    ...formData,
                    enable_automation_scheduler: !formData.enable_automation_scheduler,
                  })
                }
                className="transition-colors"
              >
                {formData.enable_automation_scheduler ? (
                  <ToggleRight className="w-6 h-6 text-primary" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  config.enable_automation_scheduler
                    ? 'bg-blue-500/10 text-blue-600'
                    : 'bg-gray-500/10 text-gray-600'
                )}
              >
                {config.enable_automation_scheduler ? 'Enabled' : 'Disabled'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <h2 className="text-xl font-bold text-foreground">Advanced Settings</h2>

        {/* CORS Origins */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            CORS Origins (comma-separated)
          </label>
          {editMode ? (
            <textarea
              value={formData.cors_origins}
              onChange={(e) =>
                setFormData({ ...formData, cors_origins: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="http://localhost:3000, https://example.com"
            />
          ) : (
            <div className="p-4 bg-muted rounded-lg max-h-32 overflow-auto">
              <p className="text-sm text-foreground whitespace-pre-wrap">{config.cors_origins}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {editMode && (
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
