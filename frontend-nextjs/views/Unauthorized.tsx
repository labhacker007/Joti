'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-foreground">403</h1>
        <p className="text-lg text-muted-foreground mb-6">
          You don't have permission to access this page.
        </p>
        <Link href="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
