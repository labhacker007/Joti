'use client';

import NavBar from '@/components/NavBar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <NavBar />
      <div style={{ marginTop: 48 }}>
        {children}
      </div>
    </ProtectedRoute>
  );
}
