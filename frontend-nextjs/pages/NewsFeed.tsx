'use client';

import React, { useEffect, useState } from 'react';
import { Search, Filter, Bookmark, X, Eye, EyeOff, Share2, AlertCircle } from 'lucide-react';
import { isSafeExternalUrl } from '@/utils/url';
import { articlesAPI, sourcesAPI } from '@/api/client';

interface Article {
  id: string;
  title: string;
  summary?: string;
  raw_content?: string;
  normalized_content?: string;
  url: string;
  image_url?: string;
  published_at: string;
  source_name: string;
  source_id: number;
  status: string;
  is_read?: boolean;
  is_high_priority?: boolean;
  watchlist_match_keywords?: string[];
}

interface Source {
  id: string;
  name: string;
}

export default function NewsFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchSources();
    fetchArticles(1);
  }, []);

  useEffect(() => {
    fetchArticles(1);
  }, [selectedSource]);

  const fetchSources = async () => {
    try {
      const response = await sourcesAPI.getSources(1, 100) as any;
      setSources(response.data || response || []);
    } catch (err: any) {
      console.error('Failed to load sources:', err);
    }
  };

  const fetchArticles = async (page: number) => {
    try {
      setLoading(true);
      const filters: any = {};
      if (selectedSource) {
        filters.source_id = selectedSource;
      }

      const response = await articlesAPI.getArticles(page, pageSize, filters) as any;
      const articleData = response.data || response;

      let articleList = articleData.items || [];

      // Filter by search term if provided
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        articleList = articleList.filter((article: Article) =>
          article.title.toLowerCase().includes(term) ||
          article.summary?.toLowerCase().includes(term) ||
          article.normalized_content?.toLowerCase().includes(term)
        );
      }

      // Sort articles
      articleList.sort((a: Article, b: Article) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
          case 'priority':
            return (b.is_high_priority ? 1 : 0) - (a.is_high_priority ? 1 : 0);
          case 'newest':
          default:
            return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
        }
      });

      setArticles(articleList);
      setTotalArticles(articleData.total || articleList.length);
      setCurrentPage(page);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load articles');
      console.error('Articles error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (articleId: string) => {
    try {
      await articlesAPI.markAsRead(articleId);
      setArticles(
        articles.map((article) =>
          article.id === articleId ? { ...article, is_read: true } : article
        )
      );
    } catch (err: any) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleToggleBookmark = async (articleId: string) => {
    try {
      await articlesAPI.toggleBookmark(articleId);
      // Optimistically update UI
      setArticles(
        articles.map((article) =>
          article.id === articleId
            ? { ...article, status: article.status === 'bookmarked' ? 'new' : 'bookmarked' }
            : article
        )
      );
    } catch (err: any) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles(1);
  };

  const totalPages = Math.ceil(totalArticles / pageSize);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">News Feed</h1>
        <p className="text-muted-foreground">Aggregated threat intelligence and news from your configured sources</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 text-red-700 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="mb-6 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Search
          </button>
        </form>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Sources ({sources.length})</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">Priority First</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading articles...</p>
          </div>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-4">No articles found</p>
          {selectedSource || searchTerm ? (
            <button
              onClick={() => {
                setSelectedSource('');
                setSearchTerm('');
                fetchArticles(1);
              }}
              className="text-primary hover:underline"
            >
              Clear filters
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add sources from the{' '}
              <a href="/sources" className="text-primary hover:underline">
                Sources page
              </a>{' '}
              to start aggregating articles
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-8">
            {articles.map((article) => (
              <div
                key={article.id}
                className="border border-border rounded-lg p-4 bg-card hover:bg-card/80 transition"
              >
                {article.is_high_priority && (
                  <div className="mb-2 inline-block px-2 py-1 bg-red-500/20 text-red-600 text-xs font-semibold rounded">
                    HIGH PRIORITY
                  </div>
                )}

                {article.image_url && (
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-48 object-cover rounded mb-3"
                  />
                )}

                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                      {article.title}
                    </h3>

                    {article.normalized_content && (
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
                        {article.normalized_content}
                      </p>
                    )}

                    {article.watchlist_match_keywords && article.watchlist_match_keywords.length > 0 && (
                      <div className="mb-3 flex gap-2 flex-wrap">
                        {article.watchlist_match_keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-yellow-500/10 text-yellow-700 text-xs rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-medium">{article.source_name}</span>
                      <span>{new Date(article.published_at).toLocaleDateString()}</span>
                      <span className="capitalize bg-blue-500/10 text-blue-700 px-2 py-1 rounded text-xs">
                        {article.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleMarkAsRead(article.id)}
                      className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                      title={article.is_read ? 'Mark as unread' : 'Mark as read'}
                    >
                      {article.is_read ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleToggleBookmark(article.id)}
                      className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                      title="Bookmark article"
                    >
                      <Bookmark className={`w-4 h-4 ${article.status === 'bookmarked' ? 'fill-current' : ''}`} />
                    </button>

                    <a
                      href={isSafeExternalUrl(article.url) ? article.url : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                      title="Open in new tab"
                    >
                      <Share2 className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => fetchArticles(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-input rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (page) =>
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                )
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span className="px-2 py-2">...</span>
                    )}
                    <button
                      onClick={() => fetchArticles(page)}
                      className={`px-4 py-2 rounded-md border ${
                        currentPage === page
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-input hover:bg-secondary'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}

              <button
                onClick={() => fetchArticles(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-input rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
