import React, { useState, useEffect } from 'react';
import { watchlistAPI } from '../api/client.ts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Eye, Plus, Trash2 } from 'lucide-react';

interface WatchlistItem {
  id: number;
  keyword: string;
  matches?: number;
  severity?: string;
}

export default function Watchlist() {
  const [keywords, setKeywords] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      const response = await watchlistAPI.getKeywords();
      setKeywords(response.data || []);
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    try {
      await watchlistAPI.addKeyword({ keyword: newKeyword });
      setNewKeyword('');
      fetchWatchlist();
    } catch (err) {
      console.error('Failed to add keyword:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Watchlist</h1>
        <p className="text-muted-foreground">Monitor keywords across your feeds</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Add Keyword
          </CardTitle>
          <CardDescription>Track important terms in your news feeds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter keyword to watch..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            />
            <Button onClick={addKeyword}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Keywords</CardTitle>
          <CardDescription>{keywords.length} keywords being monitored</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {keywords.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No keywords yet</p>
            ) : (
              keywords.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-md hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{item.keyword}</span>
                    {item.matches !== undefined && (
                      <Badge variant="secondary">{item.matches} matches</Badge>
                    )}
                    {item.severity && (
                      <Badge variant={item.severity === 'high' ? 'destructive' : 'default'}>
                        {item.severity}
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
