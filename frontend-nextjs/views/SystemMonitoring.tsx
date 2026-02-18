'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Zap,
  HardDrive,
  Database,
  AlertCircle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  database_connections: number;
  api_latency_ms: number;
  error_rate: number;
  uptime_hours: number;
  active_sessions: number;
}

export default function SystemMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      // Mock metrics for demo
      const mockMetrics: SystemMetrics = {
        cpu_usage: Math.random() * 80 + 10,
        memory_usage: Math.random() * 70 + 20,
        disk_usage: Math.random() * 60 + 15,
        database_connections: Math.floor(Math.random() * 100 + 50),
        api_latency_ms: Math.random() * 500 + 50,
        error_rate: Math.random() * 2,
        uptime_hours: 24 * 30 + Math.random() * 24,
        active_sessions: Math.floor(Math.random() * 500 + 100),
      };
      setMetrics(mockMetrics);
      setLoading(false);
    } catch (err) {
      console.error('Metrics error:', err);
    }
  };

  const getHealthStatus = (usage: number, threshold = 80) => {
    if (usage >= threshold) return { label: 'Critical', color: 'bg-red-500' };
    if (usage >= threshold * 0.75) return { label: 'Warning', color: 'bg-yellow-500' };
    return { label: 'Healthy', color: 'bg-green-500' };
  };

  const MetricCard = ({
    icon: Icon,
    label,
    value,
    unit,
    threshold,
  }: {
    icon: React.ComponentType<{ className: string }>;
    label: string;
    value: number;
    unit: string;
    threshold?: number;
  }) => {
    const health = threshold ? getHealthStatus(value, threshold) : { label: '', color: '' };
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-2">
              {value.toFixed(1)}{unit}
            </p>
            {health.label && (
              <p className="text-xs mt-2">
                <span className={cn('inline-block w-2 h-2 rounded-full mr-1', health.color)} />
                {health.label}
              </p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>
    );
  };

  if (loading || !metrics) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading system metrics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Monitoring</h1>
        <p className="text-muted-foreground mt-2">Real-time system health and performance metrics</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={Zap}
          label="CPU Usage"
          value={metrics.cpu_usage}
          unit="%"
          threshold={80}
        />
        <MetricCard
          icon={HardDrive}
          label="Memory Usage"
          value={metrics.memory_usage}
          unit="%"
          threshold={80}
        />
        <MetricCard
          icon={Database}
          label="Disk Usage"
          value={metrics.disk_usage}
          unit="%"
          threshold={80}
        />
        <MetricCard
          icon={Activity}
          label="DB Connections"
          value={metrics.database_connections}
          unit=""
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-bold text-foreground mb-4">API Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Latency</span>
                <span className="font-medium text-foreground">{metrics.api_latency_ms.toFixed(0)}ms</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((metrics.api_latency_ms / 1000) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Error Rate</span>
                <span className="font-medium text-foreground">{metrics.error_rate.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={cn('h-2 rounded-full transition-all', metrics.error_rate > 1 ? 'bg-red-500' : 'bg-green-500')}
                  style={{
                    width: `${Math.min(metrics.error_rate * 10, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-bold text-foreground mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <span className="font-medium text-foreground">{(metrics.uptime_hours / 24).toFixed(1)} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Sessions</span>
              <span className="font-medium text-foreground">{metrics.active_sessions}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Overall Health</span>
              <span
                className={cn(
                  'inline-block w-3 h-3 rounded-full',
                  metrics.cpu_usage < 80 && metrics.memory_usage < 80 && metrics.error_rate < 1
                    ? 'bg-green-500'
                    : 'bg-yellow-500'
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(metrics.cpu_usage > 80 || metrics.memory_usage > 80 || metrics.error_rate > 1) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-600">System Alerts</p>
            <ul className="text-sm text-yellow-600/80 mt-1 space-y-1">
              {metrics.cpu_usage > 80 && <li>• CPU usage is above 80%</li>}
              {metrics.memory_usage > 80 && <li>• Memory usage is above 80%</li>}
              {metrics.error_rate > 1 && <li>• Error rate is above 1%</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
