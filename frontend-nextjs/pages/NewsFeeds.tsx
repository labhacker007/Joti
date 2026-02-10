import React, { useState, useEffect } from 'react';
import { articlesAPI } from '../api/client.ts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Search, Eye, EyeOff, Bookmark, ExternalLink } from 'lucide-react';

interface Article {
  id: number;
  title: string;
  summary?: string;
  source: string;
  published_at: string;
  url: string;
  is_read?: boolean;
}

export default function NewsFeeds() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await articlesAPI.getArticles({ limit: 50, offset: 0 });
      setArticles(response.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">News Feeds</h1>
          <p className="text-muted-foreground">Latest articles from your sources</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredArticles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No articles found</p>
            </CardContent>
          </Card>
        ) : (
          filteredArticles.map(article => (
            <Card key={article.id} className="hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    <CardDescription className="mt-2">
                      <Badge variant="secondary" className="mr-2">{article.source}</Badge>
                      {new Date(article.published_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      {article.is_read ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {article.summary && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{article.summary}</p>
                  <Button variant="link" size="sm" className="mt-2 p-0 h-auto" asChild>
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      Read more <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
