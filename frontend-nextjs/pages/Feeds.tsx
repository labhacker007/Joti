'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Bookmark,
  BookmarkCheck,
  Globe,
  Calendar,
  TrendingUp,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { articlesAPI } from '@/api/client';
import { formatRelativeTime, formatDate, truncateText, cn } from '@/lib/utils';

interface Article {
  id: string;
  title: string;
  summary: string;
  source_name: string;
  threat_category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  published_at: string;
  url: string;
  is_bookmarked?: boolean;
}

export default function Feeds() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const pageSize = 10;

  useEffect(() => {
    fetchArticles();
  }, [currentPage, searchQuery, selectedSeverity, selectedCategory, showUnreadOnly]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError('');

      const filters: any = {};
      if (selectedSeverity !== 'ALL') filters.severity = selectedSeverity;
      if (selectedCategory !== 'ALL') filters.threat_category = selectedCategory;
      if (searchQuery) filters.search = searchQuery;
      if (showUnreadOnly) filters.unread_only = true;

      const response = await articlesAPI.getArticles(
        currentPage,
        pageSize,
        Object.keys(filters).length > 0 ? filters : undefined
      ) as any;

      const fetchedArticles = response.data?.items || [];
      setArticles(fetchedArticles);
      setTotalPages(Math.ceil((response.data?.total || 0) / pageSize));

      // Calculate unread count from all articles (not just current page)
      const allUnreadCount = fetchedArticles.filter(a => !a.is_read).length;
      setUnreadCount(allUnreadCount);
    } catch (err: any) {
      setError(err.message || 'Failed to load articles');
      console.error('Articles error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (articleId: string) => {
    try {
      await articlesAPI.toggleBookmark(articleId);
      // Refresh articles to get updated bookmark state
      await fetchArticles();
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await articlesAPI.markAllAsRead();
      // Refresh articles to get updated read state
      await fetchArticles();
    } catch (err) {
      console.error('Mark all as read error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      CRITICAL: 'bg-red-500/10 text-red-600 border-red-500/30',
      HIGH: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
      MEDIUM: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      LOW: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      INFO: 'bg-green-500/10 text-green-600 border-green-500/30',
    };
    return colors[severity] || colors.INFO;
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSeverityFilter = (severity: string) => {
    setSelectedSeverity(severity);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  if (loading && articles.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading articles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Feeds</h1>
        <p className="text-muted-foreground mt-2">Latest threat intelligence and security feeds</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-600">Error Loading Articles</p>
            <p className="text-sm text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Unread Filter */}
          <button
            onClick={() => {
              setShowUnreadOnly(!showUnreadOnly);
              setCurrentPage(1);
            }}
            className={cn(
              'px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1',
              showUnreadOnly
                ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                : 'bg-muted text-foreground hover:bg-accent'
            )}
          >
            <Eye className="w-4 h-4" />
            Unread
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs font-medium">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Severity Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSeverityFilter('ALL')}
              className={cn(
                'px-3 py-1 rounded-full text-sm transition-colors',
                selectedSeverity === 'ALL'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-accent'
              )}
            >
              All Severities
            </button>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((severity) => (
              <button
                key={severity}
                onClick={() => handleSeverityFilter(severity)}
                className={cn(
                  'px-3 py-1 rounded-full text-sm transition-colors',
                  selectedSeverity === severity
                    ? getSeverityColor(severity) + ' border'
                    : 'bg-muted text-foreground hover:bg-accent'
                )}
              >
                {severity}
              </button>
            ))}
          </div>

          {/* Mark All as Read Button */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="ml-auto px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-600 border border-green-500/30 hover:bg-green-500/30 transition-colors"
            >
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Articles List */}
      <div className="space-y-4">
        {articles.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No articles found</p>
          </div>
        ) : (
          articles.map((article) => (
              <div
                key={article.id}
                className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-lg font-semibold text-foreground line-clamp-2">
                        {article.title}
                      </h3>
                      <button
                        onClick={() => toggleBookmark(article.id)}
                        className="flex-shrink-0 p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        {article.is_bookmarked ? (
                          <BookmarkCheck className="w-5 h-5 text-primary" />
                        ) : (
                          <Bookmark className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {article.summary}
                    </p>

                    {/* Tags and Metadata */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={cn('px-2 py-1 rounded text-xs font-medium border', getSeverityColor(article.severity))}>
                        {article.severity}
                      </span>
                      {article.threat_category && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-500/30">
                          {article.threat_category}
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        <span>{article.source_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatRelativeTime(article.published_at)}</span>
                      </div>
                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Read Full Article →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'px-3 py-2 rounded-lg transition-colors',
                  currentPage === page
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border hover:bg-accent'
                )}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
