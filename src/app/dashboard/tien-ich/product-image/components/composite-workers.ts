'use client';

import { BATCH_CONCURRENCY } from '@/lib/product-image/batch';
import { createCompositePool, type BuildLayers } from '@/lib/product-image/composite-pool';
import { buildRealismLayers } from '@/lib/product-image/realism-layers';

let pool: BuildLayers | null = null;

/** Tính lớp ảnh ở luồng nền để trang không khựng; trình duyệt không có Worker thì tính ngay tại đây. */
export const buildLayersInBackground: BuildLayers = (base, settings, target, signal) => {
  if (typeof Worker === 'undefined') return Promise.resolve(buildRealismLayers(base, settings, target));
  pool ??= createCompositePool(() => new Worker(new URL('./composite.worker.ts', import.meta.url)), BATCH_CONCURRENCY);
  return pool(base, settings, target, signal);
};
