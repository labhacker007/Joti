'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  FileText,
  Users,
  Rss,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { adminAPI, articlesAPI, auditAPI } from '@/api/client';
import { formatRelativeTime, cn } from '@/lib/utils';

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}

interface RecentActivity {
  id: string;
  action: string;
  resource: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILURE';
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch system stats
      const statsResponse = await adminAPI.getSystemStats() as any;
      setStats(statsResponse.data);

      // Fetch recent audit logs
      const auditResponse = await auditAPI.getLogs(1, 5) as any;
      const activity = (auditResponse.data?.items || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        resource: `${log.resource_type}${log.resource_id ? ': ' + log.resource_id : ''}`,
        timestamp: log.timestamp,
        status: log.status || 'SUCCESS',
      }));
      setRecentActivity(activity);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards: StatCard[] = stats
    ? [
        {
          label: 'Total Articles',
          value: stats.total_articles || 0,
          icon: <FileText className="w-6 h-6" />,
          color: 'bg-blue-500/10 text-blue-600',
        },
        {
          label: 'Active Sources',
          value: stats.active_sources || 0,
          icon: <Rss className="w-6 h-6" />,
          color: 'bg-green-500/10 text-green-600',
        },
        {
          label: 'Total Users',
          value: stats.total_users || 0,
          icon: <Users className="w-6 h-6" />,
          color: 'bg-purple-500/10 text-purple-600',
        },
        {
          label: 'Articles Today',
          value: stats.articles_today || 0,
          icon: <TrendingUp className="w-6 h-6" />,
          color: 'bg-orange-500/10 text-orange-600',
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here's your system overview.</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-600">Error Loading Data</p>
            <p className="text-sm text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                <p className="text-3xl font-bold text-foreground mt-2">{card.value}</p>
                {card.trend && (
                  <p className="text-xs text-green-600 mt-2">↑ {card.trend}</p>
                )}
              </div>
              <div className={cn('p-3 rounded-lg', card.color)}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                <div className="flex items-center gap-3">
                  {activity.status === 'SUCCESS' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.resource}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-6 cursor-pointer hover:border-blue-500/40 transition-colors">
          <BarChart3 className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-semibold text-foreground mb-1">View Analytics</h3>
          <p className="text-sm text-muted-foreground">Detailed system metrics and performance</p>
        </div>

        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-6 cursor-pointer hover:border-green-500/40 transition-colors">
          <FileText className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Latest Articles</h3>
          <p className="text-sm text-muted-foreground">Browse newest threat intelligence</p>
        </div>

        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-6 cursor-pointer hover:border-purple-500/40 transition-colors">
          <Users className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Manage Users</h3>
          <p className="text-sm text-muted-foreground">User and permission management</p>
        </div>
      </div>
    </div>
  );
}
