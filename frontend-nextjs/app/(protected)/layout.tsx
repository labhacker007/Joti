'use client';

import { useState, useEffect, Suspense } from 'react';
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
        <Suspense fallback={<div className="w-48" />}>
          <Sidebar
            userRole={user?.role}
            collapsed={collapsed}
            onToggle={handleToggle}
          />
        </Suspense>
        <main
          className={`flex-1 min-w-0 transition-all duration-300 bg-background ${
            mounted
              ? collapsed ? 'ml-16' : 'ml-48'
              : 'ml-48'
          }`}
        >
          <div className="p-6 max-w-screen-2xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
