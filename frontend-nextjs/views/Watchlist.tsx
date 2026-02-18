'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Bell,
  AlertCircle,
  CheckCircle,
  Eye,
  RefreshCw,
  Flame,
  ChevronDown,
  ChevronRight,
  Tag,
  Pencil,
} from 'lucide-react';
import { watchlistAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';

const CATEGORIES = ['TTP', 'Threat Actor', 'Attack Type', 'Vulnerability', 'Malware', 'Custom'];

const CATEGORY_COLORS: Record<string, string> = {
  'TTP': 'bg-red-500/10 text-red-600 border-red-500/30',
  'Threat Actor': 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  'Attack Type': 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  'Vulnerability': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  'Malware': 'bg-pink-500/10 text-pink-600 border-pink-500/30',
  'Custom': 'bg-blue-500/10 text-blue-600 border-blue-500/30',
};

interface WatchlistItem {
  id: string;
  keyword: string;
  category?: string;
  is_active: boolean;
  created_at?: string;
}

export default function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  useEffect(() => {
    loadWatchlist();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await watchlistAPI.getKeywords() as any;
      const keywords = Array.isArray(response) ? response : (response.data || []);
      setItems(
        keywords.map((k: any) => ({
          id: k.id.toString(),
          keyword: k.keyword,
          category: k.category || undefined,
          is_active: k.is_active,
          created_at: k.created_at,
        }))
      );
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newKeyword.trim()) {
      setError('Please enter a keyword');
      return;
    }

    setAdding(true);
    setError('');
    try {
      await watchlistAPI.addKeyword(newKeyword.trim(), newCategory || undefined);
      setSuccess('Keyword added to watchlist');
      setNewKeyword('');
      setNewCategory('');
      await loadWatchlist();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this keyword from watchlist?')) return;

    try {
      setError('');
      await watchlistAPI.deleteKeyword(id);
      setSuccess('Keyword removed from watchlist');
      await loadWatchlist();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      setError('');
      await watchlistAPI.toggleKeyword(id, !currentActive);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_active: !currentActive } : item
        )
      );
      setSuccess(`Keyword ${!currentActive ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleCategoryChange = async (id: string, newCat: string) => {
    try {
      setError('');
      await watchlistAPI.updateKeyword(id, { category: newCat || null });
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, category: newCat || undefined } : item
        )
      );
      setEditingCategory(null);
      setSuccess('Category updated');
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await watchlistAPI.refresh() as any;
      const data = response.data || response;
      setSuccess(
        `Watchlist refreshed: ${data.articles_updated || 0} articles updated, ${data.high_priority_articles || 0} high priority`
      );
      await loadWatchlist();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const activeCount = items.filter((k) => k.is_active).length;

  // Group items by category
  const grouped = items.reduce<Record<string, WatchlistItem[]>>((acc, item) => {
    const cat = item.category || 'Ungrouped';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Sort groups: defined categories first, then Ungrouped last
  const groupOrder = [...CATEGORIES, 'Ungrouped'];
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const ai = groupOrder.indexOf(a);
    const bi = groupOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const renderKeywordItem = (item: WatchlistItem) => {
    const isEditingCat = editingCategory === item.id;

    return (
      <div
        key={item.id}
        className={cn(
          'bg-card border rounded-lg p-3 transition-all flex items-center justify-between',
          item.is_active
            ? 'border-border hover:border-primary/50'
            : 'border-border/50 opacity-60'
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Flame
            className={cn('w-4 h-4 flex-shrink-0', item.is_active ? 'text-orange-500' : 'text-gray-400')}
          />
          <span className="text-foreground font-medium text-sm truncate">{item.keyword}</span>
          {item.is_active ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-700 flex-shrink-0">
              Active
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-500/10 text-gray-600 flex-shrink-0">
              Inactive
            </span>
          )}

          {/* Inline category editor */}
          {isEditingCat ? (
            <select
              autoFocus
              value={item.category || ''}
              onChange={(e) => handleCategoryChange(item.id, e.target.value)}
              onBlur={() => setEditingCategory(null)}
              className="px-2 py-0.5 bg-background border border-input rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary flex-shrink-0"
            >
              <option value="">Ungrouped</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => setEditingCategory(item.id)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
              title="Change category"
            >
              <Pencil className="w-3 h-3" />
              <span>{item.category || 'Set category'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            onClick={() => handleToggle(item.id, item.is_active)}
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              item.is_active ? 'bg-primary' : 'bg-gray-300'
            )}
            title={item.is_active ? 'Deactivate' : 'Activate'}
          >
            <span
              className={cn(
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                item.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
              )}
            />
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className="p-1.5 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-500/10"
            title="Remove keyword"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Eye className="w-8 h-8" />
            Watchlist Keywords
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor keywords across threat intelligence feeds
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/10 text-blue-600 border border-blue-500/30 flex items-center gap-1">
          <Bell className="w-4 h-4" />
          {activeCount} Active
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active Keywords</p>
          <p className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {activeCount}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {sortedGroups.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-center">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            Refresh Matches
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 text-red-700 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-500/10 text-green-700 rounded-md flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      {/* Add Keyword Input */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter keyword to monitor (e.g., ransomware, APT29, zero-day)"
            className="flex-1 px-4 py-2 bg-background border border-input rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !newKeyword.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Keywords List - Grouped by Category */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading watchlist...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No watchlist keywords yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add keywords above to get notified when matching articles are found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group) => {
            const groupItems = grouped[group];
            const isCollapsed = collapsedGroups.has(group);
            const activeInGroup = groupItems.filter((i) => i.is_active).length;
            const colorClass = CATEGORY_COLORS[group] || 'bg-gray-500/10 text-gray-600 border-gray-500/30';

            return (
              <div key={group} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium border', colorClass)}>
                      {group}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {groupItems.length} keyword{groupItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activeInGroup} active
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="border-t border-border p-3 space-y-2">
                    {groupItems.map(renderKeywordItem)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
