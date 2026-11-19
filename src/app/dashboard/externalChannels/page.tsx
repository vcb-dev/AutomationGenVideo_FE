'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { filterAllowedPlatforms, canAccessExternalPlatform } from '@/lib/permissions';

const platforms = [
  { id: 'all' },
  { id: 'facebook' },
  { id: 'tiktok' },
  { id: 'instagram' },
  { id: 'threads' },
  { id: 'youtube' },
  { id: 'douyin' },
  { id: 'xiaohongshu' },
  { id: 'kuaishou' },
  { id: 'bilibili' },
];

export default function ExternalChannelsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.replace('/dashboard/externalChannels/all');
      return;
    }
    const visiblePlatforms = filterAllowedPlatforms(user, platforms);
    if (visiblePlatforms.length > 0 && !canAccessExternalPlatform(user, 'all')) {
      router.replace(`/dashboard/externalChannels/${visiblePlatforms[0].id}`);
    } else {
      router.replace('/dashboard/externalChannels/all');
    }
  }, [router, user]);

  return null;
}

