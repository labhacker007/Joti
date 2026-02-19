'use client';

import React, { useState } from 'react';
import { BarChart3, Activity, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const AdminAnalytics = dynamic(() => import('@/views/AdminAnalytics'), { ssr: false });
const SystemMonitoring = dynamic(() => import('@/views/SystemMonitoring'), { ssr: false });
const SystemSettings = dynamic(() => import('@/views/SystemSettings'), { ssr: false });

type Tab = 'analytics' | 'monitoring' | 'settings';

export default function PlatformWrapper() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');

  const tabs = [
    { key: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { key: 'monitoring' as const, label: 'Monitoring', icon: Activity },
    { key: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex border-b border-border mb-0 px-6 pt-4 bg-card">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'analytics' && <AdminAnalytics />}
      {activeTab === 'monitoring' && <SystemMonitoring />}
      {activeTab === 'settings' && <SystemSettings />}
    </div>
  );
}
