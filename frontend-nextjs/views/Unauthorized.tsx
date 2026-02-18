'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, LogIn } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-yellow-500" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-foreground mb-2">403</h1>
        <h2 className="text-xl font-semibold text-foreground mb-3">Access Denied</h2>
        <p className="text-sm text-muted-foreground mb-8">
          You don&apos;t have permission to access this page.
          Contact your administrator if you believe this is an error.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/feeds"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feeds
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 transition-colors border border-border"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
