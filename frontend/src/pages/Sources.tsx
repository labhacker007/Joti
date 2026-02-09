import React, { useState, useEffect } from 'react';
import { sourcesAPI } from '../api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Rss, Plus, CheckCircle, XCircle } from 'lucide-react';

interface Source {
  id: number;
  name: string;
  feed_url: string;
  enabled: boolean;
  last_fetch?: string;
}

export default function Sources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const response = await sourcesAPI.getSources();
      setSources(response.data || []);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    } finally {
      setLoading(false);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sources</h1>
          <p className="text-muted-foreground">Manage RSS feed sources</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map(source => (
          <Card key={source.id} className="hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Rss className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{source.name}</CardTitle>
                </div>
                {source.enabled ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Disabled
                  </Badge>
                )}
              </div>
              <CardDescription className="truncate">{source.feed_url}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {source.last_fetch ? `Last fetched: ${new Date(source.last_fetch).toLocaleDateString()}` : 'Never fetched'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
