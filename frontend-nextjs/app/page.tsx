'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /news by default
    router.replace('/news');
  }, [router]);

  return null;
}
