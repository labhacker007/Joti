import React, { useEffect, useState } from 'react';
import {
  Shield, Plus, Save, RefreshCw, Play, Trash2, Edit, CheckCircle2, XCircle
} from 'lucide-react';
import { adminAPI } from '../api/client.ts';
import type { Guardrail, GuardrailTestResponse } from '../types/api';
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

export default function GuardrailsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Guardrail | null>(null);
  const [error, setError] = useState('');
  const [testInput, setTestInput] = useState('');
  const [testResults, setTestResults] = useState<Record<string, GuardrailTestResponse>>({});

  useEffect(() => {
    loadGuardrails();
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadGuardrails() {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.listGuardrails();
      setGuardrails(response.data || []);
    } catch (err: any) {
      console.error('Failed to load guardrails', err);
      setError('Unable to load guardrails. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async function toggleEnabled(id: string, currentlyEnabled: boolean) {
    setSaving(true);
    try {
      const guardrail = guardrails.find(g => g.id === id);
      if (!guardrail) return;

      await adminAPI.updateGuardrail(id, {
        ...guardrail,
        enabled: !currentlyEnabled,
      });
      await loadGuardrails();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to toggle guardrail');
    } finally {
      setSaving(false);
    }
  }

  async function deleteGuardrail(id: string) {
    if (!window.confirm('Are you sure you want to delete this guardrail?')) return;

    setSaving(true);
    try {
      await adminAPI.deleteGuardrail(id);
      await loadGuardrails();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete guardrail');
    } finally {
      setSaving(false);
    }
  }

  async function testGuardrail(id: string) {
    if (!testInput) {
      setError('Please enter test input');
      return;
    }

    try {
      setError('');
      const response = await adminAPI.testGuardrail(id, testInput);
      setTestResults(prev => ({ ...prev, [id]: response.data }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Test failed');
    }
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
            <p className="text-muted-foreground">Loading guardrails...</p>
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
            <Shield className="h-8 w-8" />
            Guardrails Management
          </h1>
          <p className="text-muted-foreground">Manage GenAI safety guardrails and content filtering</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadGuardrails}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Guardrail
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Guardrails List */}
      {guardrails.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No guardrails configured. Click "Add Guardrail" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {guardrails.map(guardrail => {
            const testResult = testResults[guardrail.id];
            return (
              <Card key={guardrail.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="flex items-center gap-2">
                        {guardrail.name}
                        {guardrail.enabled ? (
                          <Badge variant="default">Enabled</Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                        <Badge variant="secondary">{guardrail.type}</Badge>
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEnabled(guardrail.id, guardrail.enabled)}
                        disabled={saving}
                      >
                        {guardrail.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(guardrail);
                          setModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteGuardrail(guardrail.id)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {guardrail.description && (
                    <CardDescription>{guardrail.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Configuration */}
                    <div>
                      <Label className="text-sm font-semibold">Configuration</Label>
                      <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                        {JSON.stringify(guardrail.config, null, 2)}
                      </pre>
                    </div>

                    {/* Test Section */}
                    <div className="border-t pt-4">
                      <Label htmlFor={`test-${guardrail.id}`} className="text-sm font-semibold">
                        Test Guardrail
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id={`test-${guardrail.id}`}
                          value={testInput}
                          onChange={(e) => setTestInput(e.target.value)}
                          placeholder="Enter text to test..."
                          className="flex-1"
                        />
                        <Button
                          onClick={() => testGuardrail(guardrail.id)}
                          variant="outline"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Test
                        </Button>
                      </div>
                      {testResult && (
                        <Alert
                          variant={testResult.passed ? 'default' : 'destructive'}
                          className="mt-2"
                        >
                          <AlertDescription className="flex items-center gap-2">
                            {testResult.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            <span>
                              {testResult.passed ? 'Passed' : 'Blocked'}
                              {testResult.message && `: ${testResult.message}`}
                            </span>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold">{guardrails.length}</div>
              <div className="text-sm text-muted-foreground">Total Guardrails</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {guardrails.filter(g => g.enabled).length}
              </div>
              <div className="text-sm text-muted-foreground">Enabled</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {guardrails.filter(g => !g.enabled).length}
              </div>
              <div className="text-sm text-muted-foreground">Disabled</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note: Create/Edit modal would go here */}
      {modalOpen && (
        <Alert className="fixed bottom-4 right-4 max-w-md">
          <AlertDescription>
            Create/Edit guardrail functionality coming soon. For now, use the backend API directly.
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
            >
              Close
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
