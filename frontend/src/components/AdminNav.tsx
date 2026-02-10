import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Settings, Shield, FileText, Plug, Brain, Activity, LayoutGrid } from 'lucide-react';

const adminLinks = [
  { path: '/admin', label: 'Overview', icon: LayoutGrid },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
  { path: '/admin/rbac', label: 'RBAC', icon: Shield },
  { path: '/admin/guardrails', label: 'Guardrails', icon: Shield },
  { path: '/admin/connectors', label: 'Connectors', icon: Plug },
  { path: '/admin/genai', label: 'GenAI', icon: Brain },
  { path: '/admin/monitoring', label: 'Monitoring', icon: Activity },
  { path: '/admin/audit', label: 'Audit', icon: FileText },
];

export default function AdminNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="border-b bg-card mb-6">
      <div className="flex gap-1 overflow-x-auto p-2">
        {adminLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;

          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md whitespace-nowrap transition-colors
                ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{link.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
