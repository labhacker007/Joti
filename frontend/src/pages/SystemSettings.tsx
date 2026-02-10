import React, { useEffect, useState } from 'react';
import {
  Settings2, Save, RefreshCw, Play, Eye, EyeOff, Key, CheckCircle2,
  XCircle, Bot, Zap, Mail, Shield, Cog, Database, Lock
} from 'lucide-react';
import { adminAPI } from '../api/client.ts';
import type {
  ConfigurationsByCategory,
  ConfigurationItem,
  ConfigTestResponse,
  ConfigCategory,
} from '../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

// ============================================
// CONSTANTS
// ============================================

const CATEGORY_ICONS: Record<ConfigCategory, React.ReactNode> = {
  genai: <Bot className="h-4 w-4" />,
  hunt_connectors: <Zap className="h-4 w-4" />,
  notifications: <Mail className="h-4 w-4" />,
  authentication: <Shield className="h-4 w-4" />,
  automation: <Cog className="h-4 w-4" />,
  data_retention: <Database className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<ConfigCategory, string> = {
  genai: 'GenAI Providers',
  hunt_connectors: 'Hunt Platform Connectors',
  notifications: 'Notifications',
  authentication: 'Authentication & SSO',
  automation: 'Automation Settings',
  data_retention: 'Data Retention',
};

const EXCLUDED_CATEGORIES: ConfigCategory[] = ['data_retention'];

// ============================================
// TYPES
// ============================================

interface EditedValues {
  [key: string]: string | boolean | number;
}

interface ShowSecrets {
  [key: string]: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configurations, setConfigurations] = useState<ConfigurationsByCategory>({});
  const [editedValues, setEditedValues] = useState<EditedValues>({});
  const [showSecrets, setShowSecrets] = useState<ShowSecrets>({});
  const [testResults, setTestResults] = useState<ConfigTestResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState<ConfigCategory>('genai');
  const [error, setError] = useState('');

  useEffect(() => {
    loadConfigurations();
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadConfigurations() {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getConfigurations();
      setConfigurations(response.data || {});
      setEditedValues({});
    } catch (err: any) {
      console.error('Failed to load configurations', err);
      setError('Unable to load configurations. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // VALUE CHANGE HANDLERS
  // ============================================

  function handleValueChange(category: ConfigCategory, key: string, value: string | boolean | number) {
    const fullKey = `${category}:${key}`;
    setEditedValues(prev => ({
      ...prev,
      [fullKey]: value,
    }));
  }

  function toggleShowSecret(fullKey: string) {
    setShowSecrets(prev => ({
      ...prev,
      [fullKey]: !prev[fullKey],
    }));
  }

  // ============================================
  // SAVE & TEST HANDLERS
  // ============================================

  async function saveCategory(category: ConfigCategory) {
    setSaving(true);
    setError('');
    try {
      const categoryConfigs = configurations[category] || [];
      const configsToSave = categoryConfigs
        .map(item => {
          const fullKey = `${category}:${item.key}`;
          const editedValue = editedValues[fullKey];

          const hasEditedValue = fullKey in editedValues;

          // Skip masked values and unchanged values
          if (!hasEditedValue || editedValue === '••••••••') {
            return null;
          }

          // Convert value based on type
          let valueToSave: string;
          if (item.value_type === 'bool') {
            valueToSave = String(editedValue === true || editedValue === 'true');
          } else if (item.value_type === 'int') {
            valueToSave = String(parseInt(String(editedValue)) || 0);
          } else {
            valueToSave = String(editedValue || '');
          }

          return {
            category,
            key: item.key,
            value: valueToSave,
            value_type: item.value_type,
            is_sensitive: item.is_sensitive,
          };
        })
        .filter(Boolean) as any[];

      if (configsToSave.length === 0) {
        setError('No changes to save. Make a change to a setting first.');
        setSaving(false);
        return;
      }

      const response = await adminAPI.saveConfigurations({
        configurations: configsToSave
      });

      setError('');
      await loadConfigurations();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save configurations');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function testCategory(category: ConfigCategory) {
    try {
      setError('');
      const response = await adminAPI.testConfiguration(category);
      setTestResults(response.data);

      const hasFailure = response.data.tests.some(t => t.status === 'failed');
      if (hasFailure) {
        setError('Some tests failed - see results below');
      }
    } catch (err: any) {
      setError('Test failed: ' + (err?.response?.data?.detail || err.message));
    }
  }

  // ============================================
  // RENDER HELPERS
  // ============================================

  function renderConfigItem(item: ConfigurationItem, category: ConfigCategory) {
    const fullKey = `${category}:${item.key}`;
    const hasEdited = fullKey in editedValues;

    let currentValue: string | boolean | number;
    if (hasEdited) {
      currentValue = editedValues[fullKey];
    } else if (item.is_configured && item.value && item.value !== '••••••••') {
      currentValue = item.value;
    } else {
      currentValue = '';
    }

    const isSecret = item.is_sensitive;
    const showValue = showSecrets[fullKey];
    const fieldLabel = item.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
      <div key={item.key} className="space-y-2 mb-4">
        <Label htmlFor={fullKey} className="flex items-center gap-2">
          {isSecret && <Lock className="h-3 w-3 text-amber-500" />}
          {fieldLabel}
          {item.is_configured && (
            <Badge variant="default" className="ml-2">Configured</Badge>
          )}
        </Label>

        {item.value_type === 'bool' ? (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={fullKey}
              checked={currentValue === 'true' || currentValue === true}
              onChange={(e) => handleValueChange(category, item.key, e.target.checked)}
              className="h-4 w-4"
            />
            <Badge variant={currentValue === 'true' || currentValue === true ? 'default' : 'outline'}>
              {currentValue === 'true' || currentValue === true ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        ) : item.value_type === 'int' ? (
          <Input
            id={fullKey}
            type="number"
            value={currentValue ? parseInt(String(currentValue)) : ''}
            onChange={(e) => handleValueChange(category, item.key, e.target.value)}
            placeholder={item.description}
            className="max-w-md"
          />
        ) : isSecret ? (
          <div className="relative max-w-md">
            <Input
              id={fullKey}
              type={showValue ? 'text' : 'password'}
              value={String(currentValue)}
              onChange={(e) => handleValueChange(category, item.key, e.target.value)}
              placeholder={item.is_configured ? '••••••••' : `Enter ${item.key}`}
              className="pr-20"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full"
              onClick={() => toggleShowSecret(fullKey)}
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <Input
            id={fullKey}
            type="text"
            value={String(currentValue)}
            onChange={(e) => handleValueChange(category, item.key, e.target.value)}
            placeholder={item.description || `Enter ${item.key}`}
            className="max-w-md"
          />
        )}
        {item.description && (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        )}
      </div>
    );
  }

  function renderCategoryContent(category: ConfigCategory) {
    const items = configurations[category] || [];

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {items.map(item => renderConfigItem(item, category))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No configuration items found for this category.
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={() => saveCategory(category)}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            Save {CATEGORY_LABELS[category]}
          </Button>

          {(category === 'notifications' || category === 'genai') && (
            <Button
              variant="outline"
              onClick={() => testCategory(category)}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Test Connection
            </Button>
          )}
        </div>

        {testResults && testResults.category === category && testResults.tests.length > 0 && (
          <Alert variant={testResults.tests.some(t => t.status === 'failed') ? 'destructive' : 'default'}>
            <AlertDescription>
              <div className="font-semibold mb-2">Test Results</div>
              <div className="space-y-2">
                {testResults.tests.map((test, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {test.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">{test.name}:</span>
                    <span>{test.status}</span>
                    {test.error && <span className="text-destructive text-sm">({test.error})</span>}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <Spinner className="mx-auto mb-4" />
            <p className="text-muted-foreground">Loading configurations...</p>
          </div>
        </div>
      </div>
    );
  }

  const categories = Object.keys(CATEGORY_LABELS)
    .filter(cat => !EXCLUDED_CATEGORIES.includes(cat as ConfigCategory))
    .filter(cat => configurations[cat]) as ConfigCategory[];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings2 className="h-8 w-8" />
            System Configuration
          </h1>
          <p className="text-muted-foreground">Configure API keys, connectors, and system settings</p>
        </div>
        <Button variant="outline" onClick={loadConfigurations}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Security Note */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Note:</strong> API keys and passwords are encrypted at rest. Changes take effect immediately for new operations.
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Configuration Tabs */}
      <Tabs value={activeCategory} onValueChange={(val) => setActiveCategory(val as ConfigCategory)}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          {categories.map(category => (
            <TabsTrigger key={category} value={category} className="flex items-center gap-2">
              {CATEGORY_ICONS[category]}
              <span className="hidden sm:inline">{CATEGORY_LABELS[category]}</span>
              {configurations[category]?.some(c => c.is_configured) && (
                <Badge variant="default" className="ml-1 h-2 w-2 p-0 rounded-full" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {CATEGORY_ICONS[category]}
                  {CATEGORY_LABELS[category]}
                </CardTitle>
                <CardDescription>
                  Configure settings for {CATEGORY_LABELS[category].toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderCategoryContent(category)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
