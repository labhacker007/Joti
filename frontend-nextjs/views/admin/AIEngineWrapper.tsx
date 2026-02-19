'use client';

import React, { useState } from 'react';
import { Bot, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const GenAIManagement = dynamic(() => import('@/views/GenAIManagement'), { ssr: false });
const GuardrailsManager = dynamic(() => import('@/views/GuardrailsManager'), { ssr: false });

type Tab = 'genai' | 'guardrails';

export default function AIEngineWrapper() {
  const [activeTab, setActiveTab] = useState<Tab>('genai');

  const tabs = [
    { key: 'genai' as const, label: 'AI Models & Functions', icon: Bot },
    { key: 'guardrails' as const, label: 'Guardrails & Skills', icon: Shield },
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
      {activeTab === 'genai' && <GenAIManagement />}
      {activeTab === 'guardrails' && <GuardrailsManager />}
    </div>
  );
}
