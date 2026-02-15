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
  Loader,
} from 'lucide-react';
import { watchlistAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';

interface WatchlistItem {
  id: string;
  keyword: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
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
    is_active: boolean;
  }>({
    keyword: '',
    is_active: true,
  });

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await watchlistAPI.getKeywords() as any;
      const keywords = response.data || [];
      setItems(
        keywords.map((k: any) => ({
          id: k.id.toString(),
          keyword: k.keyword,
          is_active: k.is_active,
          created_at: k.created_at,
          updated_at: k.updated_at,
        }))
      );
    } catch (err: any) {
      setError(getErrorMessage(err));
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
        await watchlistAPI.updateKeyword(editingId, {
          is_active: formData.is_active,
        });
        setSuccess('Watchlist item updated');
      } else {
        // Create
        await watchlistAPI.addKeyword({
          keyword: formData.keyword.trim(),
        });
        setSuccess('Watchlist item added');
      }

      resetForm();
      await loadWatchlist();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this watchlist item?')) return;

    try {
      setError('');
      setSuccess('');
      await watchlistAPI.deleteKeyword(id);
      setSuccess('Watchlist item deleted');
      await loadWatchlist();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleEdit = (item: WatchlistItem) => {
    setFormData({
      keyword: item.keyword,
      is_active: item.is_active,
    });
    setEditingId(item.id);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      keyword: '',
      is_active: true,
    });
    setEditingId(null);
    setShowAddModal(false);
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
                'bg-card border rounded-lg p-4 transition-all flex items-center justify-between',
                item.is_active ? 'border-border hover:border-primary/50' : 'border-border/50 opacity-60'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-foreground">{item.keyword}</h3>
                  {!item.is_active && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-600 border border-gray-500/30">
                      Inactive
                    </span>
                  )}
                </div>
                {item.created_at && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Created: {new Date(item.created_at).toLocaleDateString()}
                  </p>
                )}
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
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {editingId ? 'Edit Watchlist Keyword' : 'Add Watchlist Keyword'}
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
                  disabled={!!editingId}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {editingId && (
                <div className="space-y-2">
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
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddOrUpdate}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {editingId ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingId ? 'Update' : 'Add'}
                  </>
                )}
              </button>
              <button
                onClick={resetForm}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
