'use client';

import React, { useEffect, useState } from 'react';
import {
  Link as LinkIcon,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Power,
  Clock,
} from 'lucide-react';
import { adminAPI } from '@/api/client';
import { formatDate, cn } from '@/lib/utils';
import { Table, Column } from '@/components/Table';

interface Connector {
  id: string;
  name: string;
  type: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  config: Record<string, any>;
  created_at: string;
  last_sync: string;
}

export default function ConnectorManagement() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'RSS_FEED',
    config_url: '',
    config_api_key: '',
  });

  useEffect(() => {
    fetchConnectors();
  }, []);

  const fetchConnectors = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getConnectors() as any;
      setConnectors(response.data?.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load connectors');
      console.error('Connectors error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConnector = async () => {
    try {
      setError('');
      setSuccess('');

      if (!formData.name) {
        setError('Name is required');
        return;
      }

      await adminAPI.createConnector({
        name: formData.name,
        type: formData.type,
        config: {
          url: formData.config_url,
          api_key: formData.config_api_key,
        },
      });

      setSuccess('Connector created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', type: 'RSS_FEED', config_url: '', config_api_key: '' });
      await fetchConnectors();
    } catch (err: any) {
      setError(err.message || 'Failed to create connector');
    }
  };

  const handleDeleteConnector = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connector?')) return;

    try {
      setError('');
      setSuccess('');
      await adminAPI.deleteConnector(id);
      setSuccess('Connector deleted successfully');
      await fetchConnectors();
    } catch (err: any) {
      setError(err.message || 'Failed to delete connector');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      CONNECTED: 'bg-green-500/10 text-green-600',
      DISCONNECTED: 'bg-gray-500/10 text-gray-600',
      ERROR: 'bg-red-500/10 text-red-600',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-600';
  };

  const columns: Column<Connector>[] = [
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
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={cn('px-2 py-1 rounded text-xs font-medium', getStatusColor(value))}>
          {value}
        </span>
      ),
    },
    {
      key: 'last_sync',
      label: 'Last Sync',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleDeleteConnector(value)}
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
          <h1 className="text-3xl font-bold text-foreground">Connectors</h1>
          <p className="text-muted-foreground mt-2">Manage data source connectors</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Connector
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

      {/* Connectors Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table<Connector>
          data={connectors}
          columns={columns}
          loading={loading}
          empty="No connectors found"
        />
      </div>

      {/* Create Connector Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-foreground mb-4">Add New Connector</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Security Feed, API Source"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                  <option value="RSS_FEED">RSS Feed</option>
                  <option value="API">API Endpoint</option>
                  <option value="DATABASE">Database</option>
                  <option value="SYSLOG">Syslog</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  URL / Endpoint
                </label>
                <input
                  type="text"
                  value={formData.config_url}
                  onChange={(e) => setFormData({ ...formData, config_url: e.target.value })}
                  placeholder="https://example.com/feed"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  API Key (optional)
                </label>
                <input
                  type="password"
                  value={formData.config_api_key}
                  onChange={(e) => setFormData({ ...formData, config_api_key: e.target.value })}
                  placeholder="Enter API key if required"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateConnector}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ name: '', type: 'RSS_FEED', config_url: '', config_api_key: '' });
                }}
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
