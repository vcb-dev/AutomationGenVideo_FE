'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ExternalChannelsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/externalChannels/all');
  }, [router]);

  return null;
}
