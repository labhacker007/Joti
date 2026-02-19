'use client';

import React, { useState } from 'react';
import { Users, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const UserManagement = dynamic(() => import('@/views/UserManagement'), { ssr: false });
const RBACManager = dynamic(() => import('@/views/RBACManager'), { ssr: false });

type Tab = 'users' | 'rbac';

export default function AccessControlWrapper() {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  const tabs = [
    { key: 'users' as const, label: 'User Management', icon: Users },
    { key: 'rbac' as const, label: 'Roles & Permissions', icon: Lock },
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
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'rbac' && <RBACManager />}
    </div>
  );
}
