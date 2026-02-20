export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import Feeds from '@/views/Feeds';

export default function FeedsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
      <Feeds />
    </Suspense>
  );
}
