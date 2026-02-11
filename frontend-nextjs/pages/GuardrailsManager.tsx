'use client';

import React, { useEffect, useState } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle,
  Play,
  Clock,
} from 'lucide-react';
import { adminAPI } from '@/api/client';
import { formatDate, cn } from '@/lib/utils';
import { Table, Column } from '@/components/Table';

interface Guardrail {
  id: string;
  name: string;
  description: string;
  type: string;
  pattern: string;
  enabled: boolean;
  created_at: string;
}

export default function GuardrailsManager() {
  const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'CONTENT_FILTER',
    pattern: '',
  });

  useEffect(() => {
    fetchGuardrails();
  }, []);

  const fetchGuardrails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getGuardrails() as any;
      setGuardrails(response.data?.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load guardrails');
      console.error('Guardrails error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuardrail = async () => {
    try {
      setError('');
      setSuccess('');

      if (!formData.name || !formData.pattern) {
        setError('Name and pattern are required');
        return;
      }

      await adminAPI.createGuardrail(formData);
      setSuccess('Guardrail created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', type: 'CONTENT_FILTER', pattern: '' });
      await fetchGuardrails();
    } catch (err: any) {
      setError(err.message || 'Failed to create guardrail');
    }
  };

  const handleDeleteGuardrail = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guardrail?')) return;

    try {
      setError('');
      setSuccess('');
      await adminAPI.deleteGuardrail(id);
      setSuccess('Guardrail deleted successfully');
      await fetchGuardrails();
    } catch (err: any) {
      setError(err.message || 'Failed to delete guardrail');
    }
  };

  const handleTestGuardrail = async (id: string) => {
    try {
      setError('');
      setTestingId(id);

      if (!testInput.trim()) {
        setError('Please enter test input');
        return;
      }

      const response = await adminAPI.testGuardrail(id, testInput) as any;
      setTestResult(response.data?.result || 'Test completed');
    } catch (err: any) {
      setError(err.message || 'Failed to test guardrail');
    } finally {
      setTestingId(null);
    }
  };

  const columns: Column<Guardrail>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value) => (
        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-600">
          {value}
        </span>
      ),
    },
    {
      key: 'enabled',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span
          className={cn(
            'px-2 py-1 rounded text-xs font-medium',
            value ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'
          )}
        >
          {value ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleTestGuardrail(value)}
            disabled={testingId === value}
            className="p-1 hover:bg-accent rounded text-blue-600 disabled:opacity-50"
            title="Test"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteGuardrail(value)}
            className="p-1 hover:bg-accent rounded text-red-600"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Guardrails Manager</h1>
          <p className="text-muted-foreground mt-2">Manage content filters and guardrails</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Guardrail
        </button>
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

      {/* Test Result */}
      {testResult && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600">Test Result:</p>
          <p className="text-sm text-blue-600/80 mt-1">{testResult}</p>
          <button
            onClick={() => setTestResult(null)}
            className="text-xs text-blue-600 hover:underline mt-2"
          >
            Clear
          </button>
        </div>
      )}

      {/* Guardrails Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table<Guardrail>
          data={guardrails}
          columns={columns}
          loading={loading}
          empty="No guardrails found"
        />
      </div>

      {/* Create Guardrail Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-foreground mb-4">Add New Guardrail</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="CONTENT_FILTER">Content Filter</option>
                  <option value="REGEX_PATTERN">Regex Pattern</option>
                  <option value="KEYWORD_BLOCK">Keyword Block</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Pattern *
                </label>
                <textarea
                  value={formData.pattern}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  rows={3}
                  placeholder="Enter pattern or regex"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateGuardrail}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ name: '', description: '', type: 'CONTENT_FILTER', pattern: '' });
                }}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Guardrail Modal */}
      {testingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-foreground mb-4">Test Guardrail</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Test Input
                </label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  rows={4}
                  placeholder="Enter text to test against the guardrail"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleTestGuardrail(testingId)}
                disabled={testingId !== null}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
              >
                {testingId ? 'Testing...' : 'Test'}
              </button>
              <button
                onClick={() => {
                  setTestingId(null);
                  setTestInput('');
                }}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
