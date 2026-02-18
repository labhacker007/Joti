'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bookmark,
  Eye,
  AlertTriangle,
  TrendingUp,
  Clock,
  Rss,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { analyticsAPI } from '@/api/client';
import { getErrorMessage } from '@/api/client';
import { cn } from '@/lib/utils';

interface AnalyticsSummary {
  total_articles: number;
  articles_read: number;
  unread: number;
  bookmarked: number;
  watchlist_matches: number;
  read_percentage: number;
}

interface DailyRead {
  date: string;
  count: number;
}

interface TopSource {
  name: string;
  count: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  daily_reads: DailyRead[];
  top_sources: TopSource[];
  time_range: string;
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = (await analyticsAPI.getMyAnalytics(timeRange)) as any;
      setData(response.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const maxDailyCount = data?.daily_reads?.length
    ? Math.max(...data.daily_reads.map((d) => d.count), 1)
    : 1;

  const maxSourceCount = data?.top_sources?.length
    ? Math.max(...data.top_sources.map((s) => s.count), 1)
    : 1;

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your reading activity and intelligence consumption
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <SummaryCard
              icon={BookOpen}
              label="Total Articles"
              value={data.summary.total_articles}
              color="blue"
            />
            <SummaryCard
              icon={Eye}
              label="Articles Read"
              value={data.summary.articles_read}
              color="green"
            />
            <SummaryCard
              icon={Clock}
              label="Unread"
              value={data.summary.unread}
              color="amber"
            />
            <SummaryCard
              icon={Bookmark}
              label="Bookmarked"
              value={data.summary.bookmarked}
              color="purple"
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Watchlist Hits"
              value={data.summary.watchlist_matches}
              color="red"
            />
            <SummaryCard
              icon={TrendingUp}
              label="Read Rate"
              value={`${data.summary.read_percentage}%`}
              color="emerald"
            />
          </div>

          {/* Pipeline Flow Visualization */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Intelligence Pipeline</h2>
            <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
              <PipelineStep
                label="Ingested"
                value={data.summary.total_articles}
                color="bg-blue-500"
              />
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <PipelineStep
                label="Watchlist Match"
                value={data.summary.watchlist_matches}
                color="bg-red-500"
              />
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <PipelineStep
                label="Read"
                value={data.summary.articles_read}
                color="bg-green-500"
              />
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <PipelineStep
                label="Bookmarked"
                value={data.summary.bookmarked}
                color="bg-purple-500"
              />
              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <PipelineStep
                label="Unread"
                value={data.summary.unread}
                color="bg-amber-500"
              />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Daily Reading Activity */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Daily Reading Activity
              </h2>
              {data.daily_reads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No reading activity in this period
                </div>
              ) : (
                <div className="space-y-2">
                  {data.daily_reads.slice(-14).map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 text-right flex-shrink-0">
                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{
                            width: `${Math.max((day.count / maxDailyCount) * 100, 8)}%`,
                          }}
                        >
                          <span className="text-[10px] font-bold text-primary-foreground">
                            {day.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Sources */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Top Sources Read
              </h2>
              {data.top_sources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No source data available
                </div>
              ) : (
                <div className="space-y-3">
                  {data.top_sources.map((source, idx) => (
                    <div key={source.name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                        {idx + 1}
                      </span>
                      <Rss className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground truncate">
                            {source.name}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {source.count} articles
                          </span>
                        </div>
                        <div className="bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary/70 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(source.count / maxSourceCount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600',
    green: 'bg-green-500/10 text-green-600',
    amber: 'bg-amber-500/10 text-amber-600',
    purple: 'bg-purple-500/10 text-purple-600',
    red: 'bg-red-500/10 text-red-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
  };
  const colorClasses = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', colorClasses)}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PipelineStep({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm', color)}>
        {value > 999 ? `${Math.round(value / 1000)}k` : value}
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}
