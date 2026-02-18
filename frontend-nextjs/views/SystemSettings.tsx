'use client';

import React, { useEffect, useState } from 'react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import {
  Settings,
  AlertCircle,
  CheckCircle,
  Save,
  RefreshCw,
  Clock,
  Database,
  Download,
  Shield,
  Brain,
  BookOpen,
  FileText,
} from 'lucide-react';
import { adminAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
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

interface RetentionSettings {
  article_retention_days: number;
  audit_retention_days: number;
  hunt_retention_days: number;
}

export default function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<SystemConfig | null>(null);

  // Retention settings
  const [retention, setRetention] = useState<RetentionSettings>({
    article_retention_days: 90,
    audit_retention_days: 365,
    hunt_retention_days: 180,
  });
  const [retentionLoading, setRetentionLoading] = useState(true);
  const [retentionSaving, setRetentionSaving] = useState(false);

  // Export state
  const [exportType, setExportType] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchRetention();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getSettings() as any;
      setConfig(response.data);
      setFormData(response.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchRetention = async () => {
    try {
      setRetentionLoading(true);
      const response = (await adminAPI.getRetentionSettings()) as any;
      if (response.data) {
        setRetention(response.data);
      }
    } catch {
      // Retention endpoint might not exist yet, use defaults
    } finally {
      setRetentionLoading(false);
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
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRetention = async () => {
    try {
      setRetentionSaving(true);
      setError('');
      setSuccess('');
      await adminAPI.updateRetentionSettings(retention);
      setSuccess('Retention settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setRetentionSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(config);
    setEditMode(false);
  };

  const handleExport = async (type: string) => {
    try {
      setExportLoading(true);
      setExportType(type);
      setError('');

      let response: any;
      switch (type) {
        case 'articles': response = await adminAPI.exportArticles(1, 10000); break;
        case 'iocs': response = await adminAPI.exportIOCs(1, 10000); break;
        case 'ttps': response = await adminAPI.exportTTPs(1, 10000); break;
        case 'audit': response = await adminAPI.exportAuditLogs(1, 10000); break;
        default: return;
      }

      const data = response.data || [];
      if (data.length === 0) {
        setError(`No ${type} data to export`);
        return;
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map((row: any) =>
          headers.map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          }).join(',')
        ),
      ];
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `joti-${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      setSuccess(`${data.length} ${type} records exported`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setExportLoading(false);
      setExportType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground mt-2">Configure system-wide settings, data retention, and exports</p>
        </div>
        {!editMode && config && (
          <button
            onClick={() => { setEditMode(true); setFormData(config); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Edit Settings
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* General Settings */}
      {config && formData && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-bold text-foreground">General Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Application Name</label>
              {editMode ? (
                <input type="text" value={formData.app_name}
                  onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              ) : (
                <p className="text-lg font-semibold text-foreground">{config.app_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Version</label>
              <p className="text-lg font-semibold text-foreground">{config.app_version}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Session Timeout (minutes)</label>
              {editMode ? (
                <input type="number" value={formData.session_timeout_minutes}
                  onChange={(e) => setFormData({ ...formData, session_timeout_minutes: parseInt(e.target.value, 10) })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              ) : (
                <p className="text-lg font-semibold text-foreground">{config.session_timeout_minutes} min</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feature Toggles */}
      {config && formData && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground">Feature Toggles</h2>
          {[
            { key: 'debug_mode', label: 'Debug Mode', desc: 'Enable detailed error messages and logging' },
            { key: 'enable_api_docs', label: 'API Documentation', desc: 'Enable Swagger UI endpoint' },
            { key: 'enable_automation_scheduler', label: 'Automation Scheduler', desc: 'Enable background feed ingestion' },
          ].map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <h3 className="font-semibold text-foreground">{toggle.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{toggle.desc}</p>
              </div>
              {editMode ? (
                <ToggleSwitch
                  checked={(formData as any)[toggle.key]}
                  onChange={(val) => setFormData({ ...formData, [toggle.key]: val })}
                  size="md"
                />
              ) : (
                <span className={cn('px-3 py-1 rounded-full text-sm font-medium',
                  (config as any)[toggle.key] ? 'bg-blue-500/10 text-blue-600' : 'bg-gray-500/10 text-gray-600')}>
                  {(config as any)[toggle.key] ? 'Enabled' : 'Disabled'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Save / Cancel for general settings */}
      {editMode && (
        <div className="flex gap-2 justify-end">
          <button onClick={handleCancel} className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors">Cancel</button>
          <button onClick={handleSaveSettings} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Data Retention & Auto-Purge */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Data Retention & Auto-Purge</h2>
            <p className="text-sm text-muted-foreground">
              Set how long data is retained before automatic purge
            </p>
          </div>
        </div>

        {retentionLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <RetentionInput
              label="Articles & Summaries"
              description="Articles, executive summaries, technical summaries"
              value={retention.article_retention_days}
              onChange={(v) => setRetention({ ...retention, article_retention_days: v })}
              icon={BookOpen}
            />
            <RetentionInput
              label="Audit Logs"
              description="Login history, user actions, system events"
              value={retention.audit_retention_days}
              onChange={(v) => setRetention({ ...retention, audit_retention_days: v })}
              icon={FileText}
            />
            <RetentionInput
              label="Hunt Results & IOCs"
              description="Extracted IOCs, TTPs, hunt queries"
              value={retention.hunt_retention_days}
              onChange={(v) => setRetention({ ...retention, hunt_retention_days: v })}
              icon={Shield}
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSaveRetention}
            disabled={retentionSaving || retentionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            {retentionSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Retention Settings
          </button>
          <p className="text-xs text-muted-foreground">
            Runtime only. Set env vars for persistence across restarts.
          </p>
        </div>
      </div>

      {/* Data Export */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Data Export (API & CSV)</h2>
            <p className="text-sm text-muted-foreground">
              Export platform data for SIEM/SOAR integration. Also available via REST API.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { type: 'articles', icon: BookOpen, title: 'Articles & Summaries', desc: 'All articles with summaries and metadata', endpoint: '/api/admin/export/articles' },
            { type: 'iocs', icon: Shield, title: 'IOCs', desc: 'Extracted indicators of compromise', endpoint: '/api/admin/export/iocs' },
            { type: 'ttps', icon: Brain, title: 'TTPs (MITRE ATT&CK)', desc: 'Mapped techniques and tactics', endpoint: '/api/admin/export/ttps' },
            { type: 'audit', icon: FileText, title: 'Audit Logs', desc: 'All system and user audit events', endpoint: '/api/admin/export/audit-logs' },
          ].map((item) => (
            <div key={item.type} className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground text-sm">{item.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
              <div className="flex items-center justify-between">
                <code className="text-[10px] text-muted-foreground bg-background px-2 py-1 rounded">{item.endpoint}</code>
                <button
                  onClick={() => handleExport(item.type)}
                  disabled={exportLoading && exportType === item.type}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {exportLoading && exportType === item.type ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  CSV
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-blue-500/10 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-700 mb-2">API Integration</h3>
          <p className="text-xs text-blue-600">
            All export endpoints support pagination via <code className="bg-blue-100 px-1 rounded">?page=1&page_size=100</code>.
            Authenticate with Bearer token. Use these to push data to your SIEM, SOAR, or data lake.
          </p>
        </div>
      </div>
    </div>
  );
}

function RetentionInput({
  label,
  description,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="p-4 bg-muted rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-medium text-foreground text-sm">{label}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={3650}
          value={value}
          onChange={(e) => onChange(Math.max(1, Math.min(3650, parseInt(e.target.value) || 1)))}
          className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <span className="text-sm text-muted-foreground">days</span>
      </div>
    </div>
  );
}
