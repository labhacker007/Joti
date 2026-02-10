import React, { useEffect, useState } from 'react';
import {
  Activity, RefreshCw, Play, CheckCircle2, XCircle, AlertCircle, TrendingUp, Users, FileText, Database
} from 'lucide-react';
import { adminAPI } from '../api/client.ts';
import type { SystemStats } from '../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Alert, AlertDescription } from '../components/ui/alert';
import AdminNav from '../components/AdminNav';

// ============================================
// MAIN COMPONENT
// ============================================

export default function SystemMonitoring() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSystemData();
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadSystemData() {
    setLoading(true);
    setError('');
    try {
      const [statsRes, healthRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getHealth().catch(() => ({ data: null })),
      ]);

      setStats(statsRes.data);
      setHealth(healthRes.data);
    } catch (err: any) {
      console.error('Failed to load system data', err);
      setError('Unable to load system data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function getHealthIcon(status?: string) {
    switch (status) {
      case 'healthy':
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  }

  function getHealthBadge(status?: string) {
    switch (status) {
      case 'healthy':
      case 'ok':
        return <Badge variant="default">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="secondary">Degraded</Badge>;
      case 'unhealthy':
      case 'error':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <AdminNav />
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <Spinner className="mx-auto mb-4" />
            <p className="text-muted-foreground">Loading system monitoring data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-8 w-8" />
            System Monitoring
          </h1>
          <p className="text-muted-foreground">Monitor system health, stats, and performance</p>
        </div>
        <Button variant="outline" onClick={loadSystemData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            System Health
            {health && getHealthIcon(health.status)}
          </CardTitle>
          <CardDescription>Current system health status</CardDescription>
        </CardHeader>
        <CardContent>
          {health ? (
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  {getHealthBadge(health.status)}
                </div>
                {health.message && (
                  <div className="text-sm text-muted-foreground">{health.message}</div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Health status unavailable</p>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Articles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.total_articles?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              All-time total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Active Sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.active_sources || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Currently enabled
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.total_users || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Registered accounts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getHealthIcon(health?.status)}
              <span className="text-xl font-bold">
                {health?.status || 'Unknown'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Current status
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {stats?.recent_activity && stats.recent_activity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recent_activity.slice(0, 10).map((activity: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50"
                >
                  <div>
                    <div className="font-medium">{activity.description || activity.action}</div>
                    <div className="text-sm text-muted-foreground">
                      {activity.user && `by ${activity.user} • `}
                      {activity.timestamp && new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {activity.status && (
                    <Badge variant={activity.status === 'success' ? 'default' : 'destructive'}>
                      {activity.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="default">Connected</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>PostgreSQL</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cache</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="default">Connected</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>Redis</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
