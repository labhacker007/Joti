export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import Feeds from '@/views/Feeds';

interface FeedsPageProps {
  searchParams: Promise<{ source_id?: string; user_feed_id?: string }>;
}

export default async function FeedsPage({ searchParams }: FeedsPageProps) {
  const params = await searchParams;
  const sourceId = params?.source_id ? parseInt(params.source_id, 10) : undefined;
  const userFeedId = params?.user_feed_id ? parseInt(params.user_feed_id, 10) : undefined;

  return (
    <Suspense fallback={<div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
      <Feeds sourceId={sourceId} userFeedId={userFeedId} />
    </Suspense>
  );
}
