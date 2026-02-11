'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store';

/**
 * AuthInitializer - Restores authentication state from localStorage on app load
 * This must be called early in the app lifecycle to hydrate the auth store
 */
export function AuthInitializer() {
  const loadAuthState = useAuthStore((state) => state.loadAuthState);

  useEffect(() => {
    // Load auth state from localStorage when app mounts
    loadAuthState();
  }, [loadAuthState]);

  return null;
}
