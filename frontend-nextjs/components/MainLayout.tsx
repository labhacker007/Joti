'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Don't show sidebar on login page
  const showSidebar = pathname !== '/login';

  useEffect(() => {
    // Get user role from localStorage
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserRole(userData.role);
        } catch (e) {
          console.error('Failed to parse user data', e);
        }
      }
    }
  }, [pathname]);

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={userRole} />
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {children}
      </main>
    </div>
  );
}
