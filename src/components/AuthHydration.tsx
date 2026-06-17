'use client';

import { useLayoutEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

export default function AuthHydration() {
  useLayoutEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  return null;
}
