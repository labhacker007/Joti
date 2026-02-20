'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bookmark,
  BookmarkCheck,
  Globe,
  Eye,
  Star,
  LayoutGrid,
  List,
  Rss,
  FileText,
  CheckCheck,
  Plus,
  Upload,
  X,
  Loader,
  Shield,
  Brain,
  Crosshair,
  RefreshCw,
} from 'lucide-react';
import { articlesAPI, userFeedsAPI, sourcesAPI, genaiAPI } from '@/api/client';
import { formatRelativeTime, cn } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { isSafeExternalUrl } from '@/utils/url';
import ArticleDetailDrawer from '@/components/ArticleDetailDrawer';
interface Article {
  id: string;
  title: string;
  summary: string;
  source_name: string;
  source_url?: string;
  threat_category: string;
  published_at: string;
  url: string;
  is_bookmarked?: boolean;
  is_read?: boolean;
  watchlist_match_keywords?: string[];
  is_high_priority?: boolean;
  image_url?: string;
  executive_summary?: string;
  ioc_count?: number;
  ttp_count?: number;
}

interface Counts {
  total: number;
  unread: number;
  watchlist_matches: number;
}

const TIME_RANGES = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
];

const FEED_TYPES = [
  { value: 'rss', label: 'RSS Feed' },
  { value: 'atom', label: 'Atom Feed' },
  { value: 'website', label: 'Website/Webpage' },
];

const CYBER_QUOTES = [
  { text: "The only truly secure system is one that is powered off, cast in a block of concrete, and sealed in a lead-lined room with armed guards.", author: "Gene Spafford" },
  { text: "There are only two types of companies: those that have been hacked, and those that will be.", author: "Robert Mueller" },
  { text: "Security is always excessive until it's not enough.", author: "Robbie Sinclair" },
  { text: "The weakest link in the security chain is the human element.", author: "Kevin Mitnick" },
  { text: "Privacy is not an option, and it shouldn't be the price we accept for just getting on the Internet.", author: "Gary Kovacs" },
  { text: "If you think technology can solve your security problems, then you don't understand the problems and you don't understand the technology.", author: "Bruce Schneier" },
  { text: "Amateurs hack systems, professionals hack people.", author: "Bruce Schneier" },
  { text: "Security is not a product, but a process.", author: "Bruce Schneier" },
  { text: "The user's going to pick dancing pigs over security every time.", author: "Bruce Schneier" },
  { text: "Treat your password like your toothbrush. Don't let anybody else use it, and get a new one every six months.", author: "Clifford Stoll" },
  { text: "In the digital age, privacy must be a priority. Is it just me, or is secret blanket surveillance obscenely outrageous?", author: "Al Gore" },
  { text: "Cybersecurity is much more than a matter of IT.", author: "Stephane Nappo" },
  { text: "A breach alone is not a disaster, but mishandling it is.", author: "Stephane Nappo" },
  { text: "It takes 20 years to build a reputation and a few minutes of a cyber-incident to ruin it.", author: "Stephane Nappo" },
  { text: "Hackers don't take breaks.", author: "Cybersecurity Proverb" },
  { text: "The best way to predict the future is to implement it.", author: "David Heinemeier Hansson" },
  { text: "Passwords are like underwear: don't let people see it, change it very often, and you shouldn't share it with strangers.", author: "Chris Pirillo" },
  { text: "A company can spend hundreds of thousands of dollars on firewalls, intrusion detection systems, and encryption, and other security technologies, but if an attacker can call one trusted person, it's all for nothing.", author: "Kevin Mitnick" },
];

function getSourceFavicon(sourceUrl?: string): string | null {
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
  } catch {
    return null;
  }
}

interface FeedsProps {
  sourceId?: number;
  userFeedId?: number;
}

export default function Feeds({ sourceId, userFeedId }: FeedsProps) {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'watchlist' | 'bookmarked'>('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [counts, setCounts] = useState<Counts>({ total: 0, unread: 0, watchlist_matches: 0 });
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Source/feed filter from props (passed from page server component via searchParams)
  const sourceFilter = sourceId ?? null;
  const userFeedFilter = userFeedId ?? null;
  const [activeSourceName, setActiveSourceName] = useState<string | null>(null);

  // Add Feed state
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedType, setNewFeedType] = useState('rss');
  const [addingFeed, setAddingFeed] = useState(false);

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic quote/joke
  const [dynamicQuote, setDynamicQuote] = useState<{ text: string; author: string } | null>(null);

  // Infinite scroll state for card view
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const pageSize = viewMode === 'card' ? 9 : 15;

  const staticQuote = useMemo(() => CYBER_QUOTES[Math.floor(Math.random() * CYBER_QUOTES.length)], []);
  const displayQuote = dynamicQuote || staticQuote;

  // Fetch a dynamic cybersecurity quote/joke on page load
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = (await genaiAPI.getCyberQuote()) as any;
        const data = res.data || res;
        if (data?.text) {
          setDynamicQuote({ text: data.text, author: data.author || 'Joti AI' });
        }
      } catch {
        // Silent fallback to static quote
      }
    };
    fetchQuote();
  }, []);

  // Reset to page 1 and load source name when source filter changes
  useEffect(() => {
    setCurrentPage(1);
    if (viewMode === 'card') { setArticles([]); setHasMore(true); }

    // Fetch source name for active filter
    const loadSourceName = async () => {
      if (sourceFilter) {
        try {
          const res = (await sourcesAPI.getSource(String(sourceFilter))) as any;
          const data = res?.data || res;
          setActiveSourceName(data?.name || `Source #${sourceFilter}`);
        } catch {
          setActiveSourceName(`Source #${sourceFilter}`);
        }
      } else if (userFeedFilter) {
        try {
          const res = (await userFeedsAPI.getMyFeeds()) as any;
          const feeds = res?.data || res || [];
          const feed = feeds.find((f: any) => String(f.id) === String(userFeedFilter));
          setActiveSourceName(feed?.name || `Feed #${userFeedFilter}`);
        } catch {
          setActiveSourceName(`Feed #${userFeedFilter}`);
        }
      } else {
        setActiveSourceName(null);
      }
    };
    loadSourceName();
  }, [sourceFilter, userFeedFilter]);

  // Track previous page to detect "load more" vs "new filter"
  const prevPageRef = useRef(currentPage);
  useEffect(() => {
    const isLoadMore = viewMode === 'card' && currentPage > 1 && currentPage > prevPageRef.current;
    prevPageRef.current = currentPage;
    fetchArticles(isLoadMore);
  }, [currentPage, searchQuery, activeFilter, timeRange, viewMode, sourceFilter, userFeedFilter]);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const response = (await articlesAPI.getCounts()) as any;
      const data = response.data || response;
      setCounts({
        total: data.total || 0,
        unread: data.unread || 0,
        watchlist_matches: data.watchlist_matches || data.high_priority || 0,
      });
    } catch {
      // Non-critical
    }
  };

  const fetchArticles = async (append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');

      const filters: Record<string, string | boolean | number> = {};
      if (searchQuery) filters.search = searchQuery;
      if (activeFilter === 'unread') filters.unread_only = true;
      if (activeFilter === 'watchlist') filters.watchlist_only = true;
      if (activeFilter === 'bookmarked') filters.bookmarked_only = true;
      if (timeRange !== 'all') filters.time_range = timeRange;
      if (sourceFilter) filters.source_id = sourceFilter;
      if (userFeedFilter) filters.user_feed_id = userFeedFilter;

      const response = (await articlesAPI.getArticles(
        currentPage,
        pageSize,
        Object.keys(filters).length > 0 ? filters : undefined
      )) as any;

      const data = response.data || response;
      const fetchedArticles = data.items || [];
      const total = data.total || 0;

      if (append && viewMode === 'card') {
        // Infinite scroll: append new articles (deduplicate by id)
        setArticles((prev) => {
          const existingIds = new Set(prev.map((a) => String(a.id)));
          const newOnes = fetchedArticles.filter((a: Article) => !existingIds.has(String(a.id)));
          return [...prev, ...newOnes];
        });
      } else {
        setArticles(fetchedArticles);
      }

      setTotalArticles(total);
      setTotalPages(Math.ceil(total / pageSize));
      setHasMore(currentPage * pageSize < total);
    } catch (err: any) {
      setError(err.message || 'Failed to load articles');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleMarkAsRead = async (articleId: string | number) => {
    try {
      const idString = String(articleId);
      await articlesAPI.markAsRead(idString);
      setArticles((prev) =>
        prev.map((a) => (String(a.id) === idString ? { ...a, is_read: true } : a))
      );
      setCounts((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch {
      // Silent
    }
  };

  const toggleBookmark = async (articleId: string | number) => {
    const idString = String(articleId);
    setArticles((prev) =>
      prev.map((a) =>
        String(a.id) === idString ? { ...a, is_bookmarked: !a.is_bookmarked } : a
      )
    );
    try {
      await articlesAPI.toggleBookmark(idString);
    } catch (err) {
      console.error('Bookmark toggle failed:', err);
      // Revert on error
      setArticles((prev) =>
        prev.map((a) =>
          String(a.id) === idString ? { ...a, is_bookmarked: !a.is_bookmarked } : a
        )
      );
      throw err; // Re-throw so drawer can handle it
    }
  };

  const openArticleDetail = (articleId: string | number) => {
    const idString = String(articleId);
    setSelectedArticleId(idString);
    handleMarkAsRead(idString);
  };

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return;
    setAddingFeed(true);
    try {
      await userFeedsAPI.createFeed({
        name: newFeedName || newFeedUrl,
        url: newFeedUrl,
        feed_type: newFeedType,
        auto_ingest: true,
      });
      setShowAddFeed(false);
      setNewFeedUrl('');
      setNewFeedName('');
      setNewFeedType('rss');
      // Trigger ingest after adding
      fetchArticles();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to add feed');
    } finally {
      setAddingFeed(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await articlesAPI.markAllAsRead();
      setArticles((prev) => prev.map((a) => ({ ...a, is_read: true })));
      setCounts((prev) => ({ ...prev, unread: 0 }));
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    if (viewMode === 'card') { setArticles([]); setHasMore(true); }
  };

  const handleRefreshFeeds = async () => {
    setRefreshing(true);
    try {
      await sourcesAPI.ingestAll();
      // Also refresh the quote
      try {
        const res = (await genaiAPI.getCyberQuote()) as any;
        const data = res.data || res;
        if (data?.text) {
          setDynamicQuote({ text: data.text, author: data.author || 'Joti AI' });
        }
      } catch { /* silent */ }
      // Wait briefly then refresh articles
      setTimeout(() => {
        fetchArticles();
        fetchCounts();
        setRefreshing(false);
      }, 2000);
    } catch (err: any) {
      console.error('Refresh feeds failed:', err);
      setRefreshing(false);
      fetchArticles();
    }
  };

  const setFilter = (filter: 'all' | 'unread' | 'watchlist' | 'bookmarked') => {
    setActiveFilter(filter);
    setCurrentPage(1);
    if (viewMode === 'card') { setArticles([]); setHasMore(true); }
  };

  // Infinite scroll: IntersectionObserver triggers next page load in card view
  const loadMore = useCallback(() => {
    if (viewMode === 'card' && hasMore && !loading && !loadingMore) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [viewMode, hasMore, loading, loadingMore]);

  useEffect(() => {
    if (viewMode !== 'card') return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, loadMore]);

  // Reset articles when switching view modes
  useEffect(() => {
    setCurrentPage(1);
    setArticles([]);
    setHasMore(true);
  }, [viewMode]);

  if (loading && articles.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading feeds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Rss className="w-7 h-7" />
            Feeds
          </h1>
          <p className="text-xs text-muted-foreground/70 mt-2 italic max-w-2xl leading-relaxed">
            &ldquo;{displayQuote.text}&rdquo; &mdash; {displayQuote.author}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder=""
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-44 pl-8 pr-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Toolbar Row: Action buttons | Time Range (centered) | View Toggle (right) */}
      <div className="flex items-center gap-2">
        {/* Left: Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddFeed(true)}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 flex items-center gap-1.5"
            title="Add custom feed"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Feed
          </button>
          <button
            onClick={() => router.push('/watchlist')}
            className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-accent flex items-center gap-1.5 border border-border"
            title="Watchlist keywords"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Watchlist
          </button>
          <button
            onClick={handleRefreshFeeds}
            disabled={refreshing}
            className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-accent flex items-center gap-1.5 border border-border disabled:opacity-50"
            title="Refresh all feed sources"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Center: Time Range */}
        <div className="flex-1 flex justify-center">
          <div className="flex bg-muted rounded-lg p-0.5">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.value}
                onClick={() => { setTimeRange(tr.value); setCurrentPage(1); if (viewMode === 'card') { setArticles([]); setHasMore(true); } }}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                  timeRange === tr.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: View Toggle */}
        <div className="flex bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            )}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'card' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            )}
            title="Card View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Feed Modal Overlay */}
      {showAddFeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddFeed(false)} />
          <div className="relative bg-card border border-border rounded-xl p-5 shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Add Custom Feed</h3>
              <button onClick={() => setShowAddFeed(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {FEED_TYPES.map((ft) => (
                  <button
                    key={ft.value}
                    onClick={() => setNewFeedType(ft.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors text-center',
                      newFeedType === ft.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
              <input
                type="url"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddFeed(); }}
                placeholder={newFeedType === 'website' ? 'https://example.com' : 'https://example.com/rss'}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                type="text"
                value={newFeedName}
                onChange={(e) => setNewFeedName(e.target.value)}
                placeholder="Feed name (optional)"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleAddFeed}
                disabled={addingFeed || !newFeedUrl.trim()}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {addingFeed ? 'Adding...' : 'Add Feed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active source filter banner */}
      {activeSourceName && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs">
          <Globe className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-foreground">
            Showing: <strong>{activeSourceName}</strong>
          </span>
          <span className="text-muted-foreground ml-1">— other filters (unread, watchlist, time) still apply</span>
          <button
            onClick={() => router.push('/feeds')}
            className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5',
            activeFilter === 'all'
              ? 'bg-slate-700 text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <FileText className="w-3 h-3" />
          All
          <span className="opacity-70">{counts.total || totalArticles}</span>
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5',
            activeFilter === 'unread'
              ? 'bg-blue-600 text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Eye className="w-3 h-3" />
          Unread
          {counts.unread > 0 && <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">{counts.unread}</span>}
        </button>
        <button
          onClick={() => setFilter('watchlist')}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5',
            activeFilter === 'watchlist'
              ? 'bg-yellow-600 text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Star className="w-3 h-3" />
          Watchlist
          {counts.watchlist_matches > 0 && <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">{counts.watchlist_matches}</span>}
        </button>
        <button
          onClick={() => setFilter('bookmarked')}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5',
            activeFilter === 'bookmarked'
              ? 'bg-purple-600 text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Bookmark className="w-3 h-3" />
          Bookmarked
        </button>

        {counts.unread > 0 && (
          <button
            onClick={markAllAsRead}
            className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/30 hover:bg-green-500/30 transition-colors flex items-center gap-1"
          >
            <CheckCheck className="w-3 h-3" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2 text-sm">
          <span className="text-red-600 font-medium">Error:</span>
          <span className="text-red-600/80">{error}</span>
        </div>
      )}

      {/* Articles Display */}
      {articles.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Rss className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No articles found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery || activeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Articles will appear here once sources are configured and ingested'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-2">
          {articles.map((article) => (
            <div
              key={article.id}
              className={cn(
                'bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer',
                !article.is_read && 'border-l-4 border-l-primary'
              )}
              onClick={() => openArticleDetail(article.id)}
            >
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1.5">
                    <h3
                      className={cn(
                        'text-base line-clamp-2',
                        article.is_read ? 'text-muted-foreground' : 'font-semibold text-foreground'
                      )}
                    >
                      {article.title}
                    </h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(article.id); }}
                      className="flex-shrink-0 p-1.5 hover:bg-muted rounded-lg transition-colors"
                      title={article.is_bookmarked ? 'Remove bookmark' : 'Save for later'}
                    >
                      {article.is_bookmarked ? (
                        <BookmarkCheck className="w-4 h-4 text-primary" />
                      ) : (
                        <Bookmark className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {article.executive_summary || article.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {article.threat_category && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 border border-blue-500/30">
                        {article.threat_category}
                      </span>
                    )}
                    {article.is_high_priority && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-600 border border-red-500/30">
                        HIGH PRIORITY
                      </span>
                    )}
                    {article.watchlist_match_keywords?.slice(0, 2).map((keyword) => (
                      <span
                        key={keyword}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-600 border border-yellow-500/30 flex items-center gap-0.5"
                      >
                        <Star className="w-2.5 h-2.5" />
                        {keyword}
                      </span>
                    ))}
                    <span className="text-muted-foreground/50">|</span>
                    <div className="flex items-center gap-1">
                      {(() => {
                        const favicon = getSourceFavicon(article.source_url);
                        return favicon ? (
                          <img
                            src={favicon}
                            alt=""
                            className="w-3.5 h-3.5 rounded"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <Globe className="w-3 h-3" />
                        );
                      })()}
                      <span>{article.source_name}</span>
                    </div>
                    <span className="text-muted-foreground/50">&middot;</span>
                    <span>{formatRelativeTime(article.published_at)}</span>
                    {article.url && isSafeExternalUrl(article.url) && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline ml-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Source &rarr;
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Card View — magazine-style grid, 3 per row */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article) => {
            const favicon = getSourceFavicon(article.source_url);
            return (
              <div
                key={article.id}
                className={cn(
                  'group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer flex flex-col',
                  !article.is_read && 'ring-1 ring-primary/30'
                )}
                onClick={() => openArticleDetail(article.id)}
              >
                {/* Article image or favicon placeholder */}
                {article.image_url ? (
                  <div className="relative h-40 w-full overflow-hidden bg-muted">
                    <img
                      src={article.image_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement!;
                        // Replace broken image with favicon fallback — use DOM methods to avoid innerHTML XSS
                        parent.classList.remove('h-40');
                        parent.classList.add('h-24');
                        while (parent.firstChild) parent.removeChild(parent.firstChild);
                        const wrapper = document.createElement('div');
                        wrapper.className = 'w-full h-full flex items-center justify-center bg-muted/50';
                        if (favicon) {
                          const img = document.createElement('img');
                          img.src = favicon;
                          img.alt = '';
                          img.className = 'w-10 h-10 rounded opacity-40';
                          img.onerror = () => { img.style.display = 'none'; };
                          wrapper.appendChild(img);
                        }
                        parent.appendChild(wrapper);
                      }}
                    />
                    {article.is_high_priority && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase shadow-sm">
                        Priority
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="relative h-24 w-full overflow-hidden bg-muted/30 flex items-center justify-center">
                    {favicon ? (
                      <img
                        src={favicon}
                        alt=""
                        className="w-10 h-10 rounded opacity-40"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Globe className="w-8 h-8 text-muted-foreground/20" />
                    )}
                    {article.is_high_priority && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase shadow-sm">
                        Priority
                      </span>
                    )}
                  </div>
                )}

                {/* Card body */}
                <div className="p-3.5 flex-1 flex flex-col min-h-0">
                  {/* Source + time row */}
                  <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground">
                    {favicon ? (
                      <img
                        src={favicon}
                        alt=""
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <span className="truncate font-medium">{article.source_name}</span>
                    <span className="ml-auto flex-shrink-0 opacity-60">{formatRelativeTime(article.published_at)}</span>
                  </div>

                  {/* Title */}
                  <h3
                    className={cn(
                      'text-sm leading-snug line-clamp-2 mb-1.5',
                      article.is_read ? 'text-muted-foreground' : 'font-semibold text-foreground'
                    )}
                  >
                    {article.title}
                  </h3>

                  {/* Summary snippet */}
                  <p className="text-xs leading-relaxed text-muted-foreground/80 line-clamp-2 mb-3">
                    {article.executive_summary || article.summary}
                  </p>

                  {/* Bottom row: tags + bookmark */}
                  <div className="mt-auto flex items-center gap-1.5 pt-2 border-t border-border/50">
                    {article.threat_category && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 truncate max-w-[50%]">
                        {article.threat_category}
                      </span>
                    )}
                    {article.watchlist_match_keywords && article.watchlist_match_keywords.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-600 flex items-center gap-0.5">
                        <Star className="w-3 h-3" />
                        {article.watchlist_match_keywords.length}
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(article.id); }}
                      className="ml-auto flex-shrink-0 p-1 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                      title={article.is_bookmarked ? 'Remove bookmark' : 'Save'}
                    >
                      {article.is_bookmarked ? (
                        <BookmarkCheck className="w-4 h-4 text-primary" />
                      ) : (
                        <Bookmark className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination for list view / Infinite scroll sentinel for card view */}
      {viewMode === 'list' ? (
        <>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            loading={loading}
          />
          {totalArticles > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, totalArticles)} of {totalArticles} articles
            </div>
          )}
        </>
      ) : (
        <>
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader className="w-4 h-4 animate-spin" />
                Loading more articles...
              </div>
            </div>
          )}
          {!hasMore && articles.length > 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              Showing all {articles.length} of {totalArticles} articles
            </div>
          )}
        </>
      )}

      {/* Article Detail Drawer */}
      <ArticleDetailDrawer
        articleId={selectedArticleId}
        onClose={() => setSelectedArticleId(null)}
        onBookmarkToggle={toggleBookmark}
      />
    </div>
  );
}
