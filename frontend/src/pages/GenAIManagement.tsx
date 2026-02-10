import React, { useEffect, useState } from 'react';
import { Bot, RefreshCw, Play, Download, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { adminAPI } from '../api/client.ts';
import type { GenAIStatus, GenAIModel } from '../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Alert, AlertDescription } from '../components/ui/alert';
import AdminNav from '../components/AdminNav';

// ============================================
// MAIN COMPONENT
// ============================================

export default function GenAIManagement() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<GenAIStatus | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<any>(null);
  const [models, setModels] = useState<GenAIModel[]>([]);
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);
  const [pulling, setPulling] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    loadGenAIStatus();
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadGenAIStatus() {
    setLoading(true);
    setError('');
    try {
      const [statusRes, ollamaRes, modelsRes] = await Promise.all([
        adminAPI.getGenaiStatus(),
        adminAPI.getOllamaStatus().catch(() => ({ data: null })),
        adminAPI.getAvailableModels().catch(() => ({ data: [] })),
      ]);

      setStatus(statusRes.data);
      setOllamaStatus(ollamaRes.data);
      setModels(modelsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load GenAI status', err);
      setError('Unable to load GenAI status. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // GENAI OPERATIONS
  // ============================================

  async function testGenAI() {
    if (!testPrompt) {
      setError('Please enter a test prompt');
      return;
    }

    setTesting(true);
    setError('');
    setTestResult('');
    try {
      const response = await adminAPI.testGenAI({ prompt: testPrompt });
      setTestResult(response.data?.response || 'Test completed successfully');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Test failed');
      setTestResult('');
    } finally {
      setTesting(false);
    }
  }

  async function pullModel(modelName: string) {
    setPulling(prev => ({ ...prev, [modelName]: true }));
    setError('');
    try {
      await adminAPI.pullOllamaModel(modelName);
      await loadGenAIStatus();
    } catch (err: any) {
      setError(`Failed to pull model ${modelName}: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setPulling(prev => ({ ...prev, [modelName]: false }));
    }
  }

  function formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <AdminNav />
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <Spinner className="mx-auto mb-4" />
            <p className="text-muted-foreground">Loading GenAI status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-8 w-8" />
            GenAI Management
          </h1>
          <p className="text-muted-foreground">Manage AI models and test GenAI functionality</p>
        </div>
        <Button variant="outline" onClick={loadGenAIStatus}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GenAI Status */}
        <Card>
          <CardHeader>
            <CardTitle>GenAI Status</CardTitle>
            <CardDescription>Current GenAI provider status</CardDescription>
          </CardHeader>
          <CardContent>
            {status ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Provider:</span>
                  <Badge>{status.provider}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Available:</span>
                  {status.available ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Models:</span>
                  <span>{status.models?.length || 0}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No GenAI provider configured</p>
            )}
          </CardContent>
        </Card>

        {/* Ollama Status */}
        <Card>
          <CardHeader>
            <CardTitle>Ollama Status</CardTitle>
            <CardDescription>Local Ollama instance status</CardDescription>
          </CardHeader>
          <CardContent>
            {ollamaStatus ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={ollamaStatus.available ? 'default' : 'outline'}>
                    {ollamaStatus.available ? 'Running' : 'Not Available'}
                  </Badge>
                </div>
                {ollamaStatus.version && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Version:</span>
                    <span>{ollamaStatus.version}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Ollama not configured</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test GenAI */}
      <Card>
        <CardHeader>
          <CardTitle>Test GenAI</CardTitle>
          <CardDescription>Test the GenAI functionality with a custom prompt</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-prompt">Test Prompt</Label>
            <Input
              id="test-prompt"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter a test prompt..."
              className="mt-2"
            />
          </div>
          <Button onClick={testGenAI} disabled={testing || !status?.available}>
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Test GenAI
              </>
            )}
          </Button>
          {testResult && (
            <Alert>
              <AlertDescription>
                <strong>Response:</strong>
                <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
                  {testResult}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Available Models */}
      <Card>
        <CardHeader>
          <CardTitle>Available Models</CardTitle>
          <CardDescription>
            {models.length > 0
              ? `${models.length} model(s) available`
              : 'No models available'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No models available. Pull a model to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.name}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{model.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatBytes(model.size)}
                      {model.modified_at && ` • Modified ${new Date(model.modified_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => pullModel(model.name)}
                      disabled={pulling[model.name]}
                      title="Update model"
                    >
                      {pulling[model.name] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/admin/settings'}
            >
              Configure GenAI Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => pullModel('llama2')}
              disabled={pulling['llama2']}
            >
              {pulling['llama2'] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pulling...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Pull Llama 2
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => loadGenAIStatus()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
