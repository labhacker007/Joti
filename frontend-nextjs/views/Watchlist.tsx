'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Pencil,
  Search,
  X,
} from 'lucide-react';
import { watchlistAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';

const CATEGORIES = [
  'TTP', 'Threat Actor', 'Attack Type', 'Vulnerability', 'Malware',
  'APT Group', 'Campaign', 'CVE', 'Exploit', 'Ransomware',
  'C2 Infrastructure', 'Phishing', 'Data Exfiltration', 'Insider Threat',
  'Supply Chain', 'Zero Day', 'Compliance', 'Executive Risk',
  'Industry Sector', 'Custom',
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'TTP':               { bg: 'bg-red-500/8',    text: 'text-red-600',    border: 'border-red-500/20',    dot: 'bg-red-500' },
  'Threat Actor':      { bg: 'bg-purple-500/8',  text: 'text-purple-600',  border: 'border-purple-500/20',  dot: 'bg-purple-500' },
  'Attack Type':       { bg: 'bg-orange-500/8',  text: 'text-orange-600',  border: 'border-orange-500/20',  dot: 'bg-orange-500' },
  'Vulnerability':     { bg: 'bg-yellow-500/8',  text: 'text-yellow-600',  border: 'border-yellow-500/20',  dot: 'bg-yellow-500' },
  'Malware':           { bg: 'bg-pink-500/8',    text: 'text-pink-600',    border: 'border-pink-500/20',    dot: 'bg-pink-500' },
  'APT Group':         { bg: 'bg-violet-500/8',  text: 'text-violet-600',  border: 'border-violet-500/20',  dot: 'bg-violet-500' },
  'Campaign':          { bg: 'bg-indigo-500/8',  text: 'text-indigo-600',  border: 'border-indigo-500/20',  dot: 'bg-indigo-500' },
  'CVE':               { bg: 'bg-amber-500/8',   text: 'text-amber-600',   border: 'border-amber-500/20',   dot: 'bg-amber-500' },
  'Exploit':           { bg: 'bg-rose-500/8',    text: 'text-rose-600',    border: 'border-rose-500/20',    dot: 'bg-rose-500' },
  'Ransomware':        { bg: 'bg-red-600/8',     text: 'text-red-700',     border: 'border-red-600/20',     dot: 'bg-red-600' },
  'C2 Infrastructure': { bg: 'bg-slate-500/8',   text: 'text-slate-600',   border: 'border-slate-500/20',   dot: 'bg-slate-500' },
  'Phishing':          { bg: 'bg-cyan-500/8',    text: 'text-cyan-600',    border: 'border-cyan-500/20',    dot: 'bg-cyan-500' },
  'Data Exfiltration': { bg: 'bg-teal-500/8',    text: 'text-teal-600',    border: 'border-teal-500/20',    dot: 'bg-teal-500' },
  'Insider Threat':    { bg: 'bg-lime-500/8',    text: 'text-lime-600',    border: 'border-lime-500/20',    dot: 'bg-lime-500' },
  'Supply Chain':      { bg: 'bg-emerald-500/8', text: 'text-emerald-600', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  'Zero Day':          { bg: 'bg-fuchsia-500/8', text: 'text-fuchsia-600', border: 'border-fuchsia-500/20', dot: 'bg-fuchsia-500' },
  'Compliance':        { bg: 'bg-sky-500/8',     text: 'text-sky-600',     border: 'border-sky-500/20',     dot: 'bg-sky-500' },
  'Executive Risk':    { bg: 'bg-stone-500/8',   text: 'text-stone-600',   border: 'border-stone-500/20',   dot: 'bg-stone-500' },
  'Industry Sector':   { bg: 'bg-zinc-500/8',    text: 'text-zinc-600',    border: 'border-zinc-500/20',    dot: 'bg-zinc-500' },
  'Custom':            { bg: 'bg-blue-500/8',    text: 'text-blue-600',    border: 'border-blue-500/20',    dot: 'bg-blue-500' },
};

const DEFAULT_CAT_COLOR = { bg: 'bg-gray-500/8', text: 'text-gray-500', border: 'border-gray-500/20', dot: 'bg-gray-500' };

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
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'global' | 'personal'>('global');
  const [personalKeywords, setPersonalKeywords] = useState<PersonalKeyword[]>([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Add keyword state
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);

  // Category card expansion
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  useEffect(() => { loadWatchlist(); }, []);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);

  const loadWatchlist = async () => {
    try {
      setLoading(true); setError('');
      const response = await watchlistAPI.getKeywords() as any;
      const keywords = Array.isArray(response) ? response : (response.data || []);
      setItems(keywords.map((k: any) => ({
        id: k.id.toString(), keyword: k.keyword,
        category: k.category || undefined, is_active: k.is_active, created_at: k.created_at,
      })));
    } catch (err: any) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newKeyword.trim()) { setError('Please enter a keyword'); return; }
    setAdding(true); setError('');
    try {
      if (activeTab === 'personal') {
        await watchlistAPI.addMyKeyword(newKeyword.trim());
        setSuccess('Personal keyword added');
        await loadPersonalKeywords();
      } else {
        const addedCategory = newCategory || 'Ungrouped';
        await watchlistAPI.addKeyword(newKeyword.trim(), newCategory || undefined);
        setSuccess('Keyword added to watchlist');
        await loadWatchlist();
        // Auto-expand the category group where the keyword was placed
        setExpandedCategory(addedCategory);
      }
      setNewKeyword(''); setNewCategory(''); setShowAddPanel(false);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      console.error('[Watchlist] Add keyword error:', err);
      setError(errorMsg);
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this keyword?')) return;
    try { setError(''); await watchlistAPI.deleteKeyword(id); setSuccess('Keyword removed'); await loadWatchlist(); }
    catch (err: any) { setError(getErrorMessage(err)); }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      setError('');
      await watchlistAPI.toggleKeyword(id, !currentActive);
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, is_active: !currentActive } : i));
    } catch (err: any) { setError(getErrorMessage(err)); }
  };

  const handleCategoryChange = async (id: string, newCat: string) => {
    try {
      setError('');
      await watchlistAPI.updateKeyword(id, { category: newCat || null });
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, category: newCat || undefined } : i));
      setEditingCategory(null);
    } catch (err: any) { setError(getErrorMessage(err)); }
  };

  const handleRefresh = async () => {
    setRefreshing(true); setError('');
    try {
      const response = await watchlistAPI.refresh() as any;
      const data = response.data || response;
      setSuccess(`Refreshed: ${data.articles_updated || 0} articles updated`);
      await loadWatchlist();
    } catch (err: any) { setError(getErrorMessage(err)); }
    finally { setRefreshing(false); }
  };

  const loadPersonalKeywords = async () => {
    try {
      setPersonalLoading(true);
      const response = await watchlistAPI.getMyKeywords() as any;
      const keywords = Array.isArray(response) ? response : (response.data || []);
      setPersonalKeywords(keywords.map((k: any) => ({ id: k.id.toString(), keyword: k.keyword, is_active: k.is_active })));
    } catch (err: any) { setError(getErrorMessage(err)); }
    finally { setPersonalLoading(false); }
  };

  const handleDeletePersonal = async (id: string) => {
    if (!confirm('Remove this personal keyword?')) return;
    try { await watchlistAPI.deleteMyKeyword(id); setSuccess('Personal keyword removed'); await loadPersonalKeywords(); }
    catch (err: any) { setError(getErrorMessage(err)); }
  };

  const handleTogglePersonal = async (id: string, currentActive: boolean) => {
    try {
      await watchlistAPI.toggleMyKeyword(id, !currentActive);
      setPersonalKeywords((prev) => prev.map((k) => k.id === id ? { ...k, is_active: !currentActive } : k));
    } catch (err: any) { setError(getErrorMessage(err)); }
  };

  useEffect(() => {
    if (activeTab === 'personal' && personalKeywords.length === 0) loadPersonalKeywords();
  }, [activeTab]);

  // Filter
  const q = searchFilter.toLowerCase();
  const filteredItems = q ? items.filter((i) => i.keyword.toLowerCase().includes(q)) : items;
  const filteredPersonal = q ? personalKeywords.filter((k) => k.keyword.toLowerCase().includes(q)) : personalKeywords;

  // Group by category
  const grouped = filteredItems.reduce<Record<string, WatchlistItem[]>>((acc, item) => {
    const cat = item.category || 'Ungrouped';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const groupOrder = [...CATEGORIES, 'Ungrouped'];
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const ai = groupOrder.indexOf(a); const bi = groupOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const activeCount = items.filter((k) => k.is_active).length;

  return (
    <div className="space-y-4 pb-8">
      {/* ── Header Row ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground shrink-0">Watchlist</h1>
        <span className="text-xs text-muted-foreground shrink-0">{activeCount}/{items.length} active</span>

        {/* Tabs — centered */}
        <div className="flex-1 flex justify-center">
          <div className="flex bg-muted rounded-md p-0.5">
            <button
              onClick={() => setActiveTab('global')}
              className={cn('px-3 py-1.5 text-xs font-medium rounded transition-colors',
                activeTab === 'global' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Org
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={cn('px-3 py-1.5 text-xs font-medium rounded transition-colors',
                activeTab === 'personal' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Personal
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-48 shrink-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search keywords..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-card border border-border rounded-md text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        {/* Add button — admins on global tab, anyone on personal tab */}
        {(activeTab === 'personal' || isAdmin) && (
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className={cn(
              'p-1.5 rounded-md transition-colors shrink-0',
              showAddPanel ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            title="Add keyword"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Refresh — admin only */}
        {isAdmin && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
            title="Refresh matches"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        )}
      </div>

      {/* ── Add Keyword Panel ── */}
      {showAddPanel && (
        <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={activeTab === 'personal' ? 'Personal keyword...' : 'Keyword (e.g., APT29, ransomware)'}
            className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            autoFocus
          />
          {activeTab === 'global' && (
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-2 py-1.5 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="">Category</option>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          )}
          <button
            onClick={handleAdd}
            disabled={adding || !newKeyword.trim()}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {adding ? '...' : 'Add'}
          </button>
          <button
            onClick={() => { setShowAddPanel(false); setNewKeyword(''); setNewCategory(''); }}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Alerts ── */}
      {error && (
        <div className="p-2.5 bg-red-500/10 text-red-700 rounded-md flex items-center gap-2 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-2.5 bg-green-500/10 text-green-700 rounded-md flex items-center gap-2 text-xs">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Global Keywords — Category Card Grid ── */}
      {activeTab === 'global' && (
        <>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading watchlist...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <Eye className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                {searchFilter ? 'No matching keywords' : 'No watchlist keywords yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sortedGroups.map((group) => {
                const groupItems = grouped[group];
                const colors = CATEGORY_COLORS[group] || DEFAULT_CAT_COLOR;
                const activeInGroup = groupItems.filter((i) => i.is_active).length;
                const isExpanded = expandedCategory === group;

                return (
                  <div
                    key={group}
                    className={cn(
                      'border rounded-lg overflow-hidden transition-all cursor-pointer',
                      colors.border, colors.bg,
                      isExpanded && 'col-span-2 sm:col-span-3 lg:col-span-4'
                    )}
                  >
                    {/* Card header */}
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : group)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', colors.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-semibold truncate', colors.text)}>
                          {group}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {groupItems.length} keyword{groupItems.length !== 1 ? 's' : ''} &middot; {activeInGroup} active
                        </p>
                      </div>
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      }
                    </button>

                    {/* Expanded keyword list */}
                    {isExpanded && (
                      <div className="border-t border-border/50 bg-card">
                        {groupItems.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2 group hover:bg-muted/50 transition-colors',
                              !item.is_active && 'opacity-50'
                            )}
                          >
                            {/* Toggle — admin only */}
                            {isAdmin ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggle(item.id, item.is_active); }}
                                className={cn(
                                  'relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0',
                                  item.is_active ? 'bg-primary' : 'bg-muted-foreground/30'
                                )}
                              >
                                <span className={cn(
                                  'inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm',
                                  item.is_active ? 'translate-x-3.5' : 'translate-x-0.5'
                                )} />
                              </button>
                            ) : (
                              <div className={cn(
                                'w-2 h-2 rounded-full flex-shrink-0',
                                item.is_active ? 'bg-primary' : 'bg-muted-foreground/30'
                              )} />
                            )}

                            <span className="text-xs text-foreground font-medium truncate flex-1 min-w-0">
                              {item.keyword}
                            </span>

                            {/* Edit category — admin only */}
                            {isAdmin && (
                              <>
                                {editingCategory === item.id ? (
                                  <select
                                    autoFocus
                                    value={item.category || ''}
                                    onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                                    onBlur={() => setEditingCategory(null)}
                                    className="px-1.5 py-0.5 bg-background border border-input rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary flex-shrink-0"
                                  >
                                    <option value="">Ungrouped</option>
                                    {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                                  </select>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingCategory(item.id); }}
                                    className="p-0.5 text-muted-foreground hover:text-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    title="Change category"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}

                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                  className="p-0.5 text-muted-foreground hover:text-red-600 rounded hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Personal Keywords ── */}
      {activeTab === 'personal' && (
        <>
          {personalLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : filteredPersonal.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground text-sm">
                {searchFilter ? 'No matching personal keywords' : 'No personal keywords yet'}
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {filteredPersonal.map((kw) => (
                <div
                  key={kw.id}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 group hover:bg-muted/50 transition-colors',
                    !kw.is_active && 'opacity-50'
                  )}
                >
                  <button
                    onClick={() => handleTogglePersonal(kw.id, kw.is_active)}
                    className={cn(
                      'relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0',
                      kw.is_active ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span className={cn(
                      'inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm',
                      kw.is_active ? 'translate-x-3.5' : 'translate-x-0.5'
                    )} />
                  </button>
                  <span className="text-xs font-medium text-foreground flex-1 truncate">{kw.keyword}</span>
                  <button
                    onClick={() => handleDeletePersonal(kw.id)}
                    className="p-0.5 text-muted-foreground hover:text-red-600 rounded hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Personal keywords are private and only visible to you.
          </p>
        </>
      )}
    </div>
  );
}
