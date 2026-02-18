'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
    setMounted(true);
  }, []);

  const handleToggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev));
      return !prev;
    });
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar
          userRole={user?.role}
          collapsed={collapsed}
          onToggle={handleToggle}
        />
        <main
          className={`flex-1 min-w-0 transition-all duration-300 bg-background ${
            mounted
              ? collapsed ? 'ml-16' : 'ml-64'
              : 'ml-64'
          }`}
        >
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
