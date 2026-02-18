'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Eye,
  RefreshCw,
  Flame,
  ChevronDown,
  ChevronRight,
  Pencil,
  Search,
} from 'lucide-react';
import { watchlistAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'TTP', 'Threat Actor', 'Attack Type', 'Vulnerability', 'Malware',
  'APT Group', 'Campaign', 'CVE', 'Exploit', 'Ransomware',
  'C2 Infrastructure', 'Phishing', 'Data Exfiltration', 'Insider Threat',
  'Supply Chain', 'Zero Day', 'Compliance', 'Executive Risk',
  'Industry Sector', 'Custom',
];

const CATEGORY_COLORS: Record<string, string> = {
  'TTP': 'bg-red-500/10 text-red-600 border-red-500/30',
  'Threat Actor': 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  'Attack Type': 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  'Vulnerability': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  'Malware': 'bg-pink-500/10 text-pink-600 border-pink-500/30',
  'APT Group': 'bg-violet-500/10 text-violet-600 border-violet-500/30',
  'Campaign': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  'CVE': 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  'Exploit': 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  'Ransomware': 'bg-red-600/10 text-red-700 border-red-600/30',
  'C2 Infrastructure': 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  'Phishing': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  'Data Exfiltration': 'bg-teal-500/10 text-teal-600 border-teal-500/30',
  'Insider Threat': 'bg-lime-500/10 text-lime-600 border-lime-500/30',
  'Supply Chain': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  'Zero Day': 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/30',
  'Compliance': 'bg-sky-500/10 text-sky-600 border-sky-500/30',
  'Executive Risk': 'bg-stone-500/10 text-stone-600 border-stone-500/30',
  'Industry Sector': 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30',
  'Custom': 'bg-blue-500/10 text-blue-600 border-blue-500/30',
};

interface WatchlistItem {
  id: string;
  keyword: string;
  category?: string;
  is_active: boolean;
  created_at?: string;
}

interface PersonalKeyword {
  id: string;
  keyword: string;
  is_active: boolean;
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
  const [activeTab, setActiveTab] = useState<'global' | 'personal'>('global');
  const [personalKeywords, setPersonalKeywords] = useState<PersonalKeyword[]>([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [newPersonalKeyword, setNewPersonalKeyword] = useState('');
  const [addingPersonal, setAddingPersonal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

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
        `Refreshed: ${data.articles_updated || 0} articles updated, ${data.high_priority_articles || 0} high priority`
      );
      await loadWatchlist();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (activeTab === 'personal') handleAddPersonal();
      else handleAdd();
    }
  };

  const loadPersonalKeywords = async () => {
    try {
      setPersonalLoading(true);
      const response = await watchlistAPI.getMyKeywords() as any;
      const keywords = Array.isArray(response) ? response : (response.data || []);
      setPersonalKeywords(
        keywords.map((k: any) => ({
          id: k.id.toString(),
          keyword: k.keyword,
          is_active: k.is_active,
        }))
      );
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setPersonalLoading(false);
    }
  };

  const handleAddPersonal = async () => {
    if (!newPersonalKeyword.trim()) return;
    setAddingPersonal(true);
    setError('');
    try {
      await watchlistAPI.addMyKeyword(newPersonalKeyword.trim());
      setSuccess('Personal keyword added');
      setNewPersonalKeyword('');
      await loadPersonalKeywords();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setAddingPersonal(false);
    }
  };

  const handleDeletePersonal = async (id: string) => {
    if (!confirm('Remove this personal keyword?')) return;
    try {
      await watchlistAPI.deleteMyKeyword(id);
      setSuccess('Personal keyword removed');
      await loadPersonalKeywords();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleTogglePersonal = async (id: string, currentActive: boolean) => {
    try {
      await watchlistAPI.toggleMyKeyword(id, !currentActive);
      setPersonalKeywords((prev) =>
        prev.map((k) => (k.id === id ? { ...k, is_active: !currentActive } : k))
      );
      setSuccess(`Personal keyword ${!currentActive ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    if (activeTab === 'personal' && personalKeywords.length === 0) {
      loadPersonalKeywords();
    }
  }, [activeTab]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Filter items by search
  const filteredItems = searchFilter
    ? items.filter((i) => i.keyword.toLowerCase().includes(searchFilter.toLowerCase()))
    : items;

  // Group items by category
  const grouped = filteredItems.reduce<Record<string, WatchlistItem[]>>((acc, item) => {
    const cat = item.category || 'Ungrouped';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const groupOrder = [...CATEGORIES, 'Ungrouped'];
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const ai = groupOrder.indexOf(a);
    const bi = groupOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const filteredPersonal = searchFilter
    ? personalKeywords.filter((k) => k.keyword.toLowerCase().includes(searchFilter.toLowerCase()))
    : personalKeywords;

  const renderKeywordRow = (item: WatchlistItem) => {
    const isEditingCat = editingCategory === item.id;

    return (
      <div
        key={item.id}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group hover:bg-muted/50',
          !item.is_active && 'opacity-50'
        )}
      >
        <button
          onClick={() => handleToggle(item.id, item.is_active)}
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
            item.is_active ? 'bg-primary' : 'bg-muted-foreground/30'
          )}
        >
          <span
            className={cn(
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm',
              item.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
            )}
          />
        </button>

        <span className="text-sm text-foreground font-medium truncate flex-1 min-w-0">
          {item.keyword}
        </span>

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
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
            title="Change category"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={() => handleDelete(item.id)}
          className="p-1 text-muted-foreground hover:text-red-600 rounded hover:bg-red-500/10 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove keyword"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
          <span className="text-sm text-muted-foreground">
            {items.filter((k) => k.is_active).length} active of {items.length}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          title="Refresh watchlist matches"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-500/10 text-red-700 rounded-lg flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-500/10 text-green-700 rounded-lg flex items-start gap-2 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Search + Tabs Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter keywords..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('global')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === 'global'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Global ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === 'personal'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Personal ({personalKeywords.length})
          </button>
        </div>
      </div>

      {/* Add Keyword Input — compact inline bar */}
      {activeTab === 'global' ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add keyword (e.g., APT29, ransomware, zero-day)"
            className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-2 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !newKeyword.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={newPersonalKeyword}
            onChange={(e) => setNewPersonalKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a personal keyword to monitor..."
            className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleAddPersonal}
            disabled={addingPersonal || !newPersonalKeyword.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      )}

      {/* Personal Keywords Tab */}
      {activeTab === 'personal' && (
        <>
          {personalLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading your keywords...</div>
          ) : filteredPersonal.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
              {searchFilter ? 'No matching personal keywords' : 'No personal keywords added yet'}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {filteredPersonal.map((kw) => (
                <div
                  key={kw.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 group hover:bg-muted/50 transition-colors',
                    !kw.is_active && 'opacity-50'
                  )}
                >
                  <button
                    onClick={() => handleTogglePersonal(kw.id, kw.is_active)}
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
                      kw.is_active ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span className={cn(
                      'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm',
                      kw.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
                    )} />
                  </button>
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{kw.keyword}</span>
                  <button
                    onClick={() => handleDeletePersonal(kw.id)}
                    className="p-1 text-muted-foreground hover:text-red-600 rounded hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Personal keywords are private to you and not visible to other users.
          </p>
        </>
      )}

      {/* Global Keywords — Grouped */}
      {activeTab === 'global' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading watchlist...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Eye className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                {searchFilter ? 'No matching keywords' : 'No watchlist keywords yet'}
              </p>
              {!searchFilter && (
                <p className="text-xs text-muted-foreground mt-1">
                  Add keywords above to get notified when matching articles are found
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedGroups.map((group) => {
                const groupItems = grouped[group];
                const isCollapsed = collapsedGroups.has(group);
                const activeInGroup = groupItems.filter((i) => i.is_active).length;
                const colorClass = CATEGORY_COLORS[group] || 'bg-gray-500/10 text-gray-600 border-gray-500/30';

                return (
                  <div key={group} className="bg-card border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGroup(group)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium border', colorClass)}>
                          {group}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {groupItems.length} keyword{groupItems.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {activeInGroup}/{groupItems.length} active
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="border-t border-border">
                        {groupItems.map(renderKeywordRow)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
