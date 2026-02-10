import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { articlesAPI, sourcesAPI } from '../api/client.ts';
import { useAuthStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';
import { Badge } from '../components/ui/badge';
import { FileText, CheckCircle, Clock, Eye, Rss, TrendingUp } from 'lucide-react';

interface DashboardStats {
  total: number;
  unread: number;
  sources: number;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, unread: 0, sources: 0 });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [articlesRes, sourcesRes] = await Promise.all([
        articlesAPI.getArticles({ limit: 1, offset: 0 }),
        sourcesAPI.getSources()
      ]);

      setStats({
        total: articlesRes.data?.total || 0,
        unread: articlesRes.data?.total || 0, // Simplified
        sources: sourcesRes.data?.length || 0,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.username}!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all">
          <CardHeader className="pb-3">
            <CardDescription>Total Articles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-foreground">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">Articles monitored</p>
              </div>
              <FileText className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-accent/20 hover:border-accent/40 transition-all">
          <CardHeader className="pb-3">
            <CardDescription>Unread Articles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-foreground">{stats.unread}</div>
                <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
              </div>
              <Eye className="h-8 w-8 text-accent opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-secondary/20 hover:border-secondary/40 transition-all">
          <CardHeader className="pb-3">
            <CardDescription>Active Sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-foreground">{stats.sources}</div>
                <p className="text-xs text-muted-foreground mt-1">RSS feeds</p>
              </div>
              <Rss className="h-8 w-8 text-secondary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to key areas</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => navigate('/news')}
          >
            <FileText className="h-6 w-6" />
            <span className="text-xs">View News</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => navigate('/profile')}
          >
            <Eye className="h-6 w-6" />
            <span className="text-xs">Profile</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => navigate('/audit')}
          >
            <CheckCircle className="h-6 w-6" />
            <span className="text-xs">Audit Logs</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => navigate('/admin')}
          >
            <TrendingUp className="h-6 w-6" />
            <span className="text-xs">Admin</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
