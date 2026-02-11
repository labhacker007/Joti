'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Bell,
  AlertCircle,
  CheckCircle,
  Eye,
  Save,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WatchlistItem {
  id: string;
  keyword: string;
  severity_threshold: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  notify_email: boolean;
  notify_web: boolean;
  is_active: boolean;
  match_count: number;
  last_matched: string | null;
}

export default function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    keyword: string;
    severity_threshold: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    notify_email: boolean;
    notify_web: boolean;
    is_active: boolean;
  }>({
    keyword: '',
    severity_threshold: 'HIGH',
    notify_email: true,
    notify_web: true,
    is_active: true,
  });

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      setError('');
      // Mock data - in real implementation would call watchlistAPI.getWatchlist()
      setItems([
        {
          id: '1',
          keyword: 'ransomware',
          severity_threshold: 'CRITICAL',
          notify_email: true,
          notify_web: true,
          is_active: true,
          match_count: 12,
          last_matched: '2 hours ago',
        },
        {
          id: '2',
          keyword: 'zero-day',
          severity_threshold: 'HIGH',
          notify_email: true,
          notify_web: false,
          is_active: true,
          match_count: 5,
          last_matched: '1 day ago',
        },
        {
          id: '3',
          keyword: 'supply chain',
          severity_threshold: 'MEDIUM',
          notify_email: false,
          notify_web: true,
          is_active: false,
          match_count: 3,
          last_matched: '3 days ago',
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async () => {
    try {
      setError('');
      setSuccess('');

      if (!formData.keyword.trim()) {
        setError('Keyword is required');
        return;
      }

      if (editingId) {
        // Update
        setItems(
          items.map((item) =>
            item.id === editingId
              ? { ...item, ...formData }
              : item
          )
        );
        setSuccess('Watchlist item updated');
      } else {
        // Create
        const newItem: WatchlistItem = {
          id: Date.now().toString(),
          ...formData,
          match_count: 0,
          last_matched: null,
        };
        setItems([...items, newItem]);
        setSuccess('Watchlist item added');
      }

      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save watchlist item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this watchlist item?')) return;

    try {
      setItems(items.filter((item) => item.id !== id));
      setSuccess('Watchlist item deleted');
    } catch (err: any) {
      setError(err.message || 'Failed to delete watchlist item');
    }
  };

  const handleEdit = (item: WatchlistItem) => {
    setFormData({
      keyword: item.keyword,
      severity_threshold: item.severity_threshold,
      notify_email: item.notify_email,
      notify_web: item.notify_web,
      is_active: item.is_active,
    });
    setEditingId(item.id);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      keyword: '',
      severity_threshold: 'HIGH',
      notify_email: true,
      notify_web: true,
      is_active: true,
    });
    setEditingId(null);
    setShowAddModal(false);
  };

  const getSeverityColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      CRITICAL: 'bg-red-500/10 text-red-600 border-red-500/30',
      HIGH: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
      MEDIUM: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      LOW: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      INFO: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
    };
    return colors[severity] || colors.INFO;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading watchlist...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Watchlist</h1>
          <p className="text-muted-foreground mt-2">Monitor keywords and get alerts for matching articles</p>
        </div>
        <button
          onClick={() => resetForm()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Keyword
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

      {/* Watchlist Items */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No watchlist items yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add keywords to get notified when matching articles are found
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'bg-card border rounded-lg p-4 transition-all',
                item.is_active ? 'border-border hover:border-primary/50' : 'border-border/50 opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{item.keyword}</h3>
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium border',
                        getSeverityColor(item.severity_threshold)
                      )}
                    >
                      {item.severity_threshold}
                    </span>
                    {!item.is_active && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-600 border border-gray-500/30">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mt-3">
                    <div>
                      <span className="text-xs text-muted-foreground/70">Matches</span>
                      <p className="font-semibold text-foreground">{item.match_count}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground/70">Last Match</span>
                      <p className="font-semibold text-foreground">{item.last_matched || 'Never'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground/70">Email</span>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        {item.notify_email ? (
                          <span className="text-green-600">✓ Enabled</span>
                        ) : (
                          <span className="text-gray-600">✗ Disabled</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground/70">Web</span>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        {item.notify_web ? (
                          <span className="text-green-600">✓ Enabled</span>
                        ) : (
                          <span className="text-gray-600">✗ Disabled</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors text-blue-600"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {editingId ? 'Edit Watchlist Item' : 'Add Watchlist Item'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Keyword *
                </label>
                <input
                  type="text"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                  placeholder="e.g., ransomware, zero-day, supply chain"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Minimum Severity
                </label>
                <select
                  value={formData.severity_threshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      severity_threshold: e.target.value as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO',
                    })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="CRITICAL">Critical or higher</option>
                  <option value="HIGH">High or higher</option>
                  <option value="MEDIUM">Medium or higher</option>
                  <option value="LOW">Low or higher</option>
                  <option value="INFO">All (Info and above)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notify_email}
                    onChange={(e) =>
                      setFormData({ ...formData, notify_email: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">Email Notifications</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notify_web}
                    onChange={(e) =>
                      setFormData({ ...formData, notify_web: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">Web Notifications</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddOrUpdate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update' : 'Add'}
              </button>
              <button
                onClick={resetForm}
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
