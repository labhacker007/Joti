'use client';

import React from 'react';
import {
  Users,
  Shield,
  Settings,
  GitBranch,
  AlertTriangle,
  BarChart3,
  Key,
  Zap,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AdminSection {
  title: string;
  description: string;
  icon: React.ComponentType<{ className: string }>;
  href: string;
  color: string;
  priority: 'high' | 'medium' | 'low';
}

export default function Admin() {
  const sections: AdminSection[] = [
    {
      title: 'User Management',
      description: 'Create, edit, and manage system users',
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-500/10 text-blue-600',
      priority: 'high',
    },
    {
      title: 'RBAC Manager',
      description: 'Manage roles and permissions',
      icon: Shield,
      href: '/admin/rbac',
      color: 'bg-purple-500/10 text-purple-600',
      priority: 'high',
    },
    {
      title: 'Audit Logs',
      description: 'View system activity and security logs',
      icon: BarChart3,
      href: '/admin/audit',
      color: 'bg-green-500/10 text-green-600',
      priority: 'high',
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      href: '/admin/settings',
      color: 'bg-orange-500/10 text-orange-600',
      priority: 'high',
    },
    {
      title: 'Guardrails Manager',
      description: 'Manage content filters and safeguards',
      icon: AlertTriangle,
      href: '/admin/guardrails',
      color: 'bg-red-500/10 text-red-600',
      priority: 'medium',
    },
    {
      title: 'Connectors',
      description: 'Manage data source connectors',
      icon: GitBranch,
      href: '/admin/connectors',
      color: 'bg-cyan-500/10 text-cyan-600',
      priority: 'medium',
    },
    {
      title: 'GenAI Management',
      description: 'Configure AI model providers',
      icon: Zap,
      href: '/admin/genai',
      color: 'bg-yellow-500/10 text-yellow-600',
      priority: 'medium',
    },
    {
      title: 'System Monitoring',
      description: 'View real-time system metrics',
      icon: Activity,
      href: '/admin/monitoring',
      color: 'bg-indigo-500/10 text-indigo-600',
      priority: 'medium',
    },
  ];

  const highPrioritySections = sections.filter((s) => s.priority === 'high');
  const otherSections = sections.filter((s) => s.priority !== 'high');

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Administration</h1>
        <p className="text-muted-foreground mt-2">Manage system configuration, users, and security settings</p>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Essential Admin Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highPrioritySections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <div className={cn(
                  'bg-card border border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg'
                )}>
                  <div className="flex items-start gap-4">
                    <div className={cn('p-3 rounded-lg', section.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{section.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Advanced Tools */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Advanced Administration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <div className={cn(
                  'bg-card border border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-all'
                )}>
                  <div className="flex items-start gap-4">
                    <div className={cn('p-2 rounded-lg flex-shrink-0', section.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm">{section.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Admin Notes */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-6">
        <h3 className="font-semibold text-blue-600 mb-2">Admin Guidelines</h3>
        <ul className="text-sm text-blue-600/80 space-y-2">
          <li>• Regularly review audit logs for security monitoring</li>
          <li>• Keep system settings and configurations up to date</li>
          <li>• Manage user permissions carefully following principle of least privilege</li>
          <li>• Monitor system health and performance metrics regularly</li>
          <li>• Test guardrails and content filters periodically</li>
        </ul>
      </div>
    </div>
  );
}
