'use client';

import { BATCH_CONCURRENCY } from '@/lib/product-image/batch';
import { buildRealismLayers, type CutoutPixels, type RealismLayers, type RealismSettings } from '@/lib/product-image/realism-layers';
import type { CompositeJob, CompositeReply } from './composite.worker';

interface Pending {
  resolve: (layers: RealismLayers) => void;
  reject: (error: Error) => void;
}

interface Slot {
  worker: Worker;
  jobs: number;
}

let slots: Slot[] | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function createSlot(): Slot {
  const worker = new Worker(new URL('./composite.worker.ts', import.meta.url));
  const slot = { worker, jobs: 0 };
  worker.onmessage = ({ data }: MessageEvent<CompositeReply>) => {
    slot.jobs -= 1;
    const job = pending.get(data.id);
    pending.delete(data.id);
    if ('layers' in data) job?.resolve(data.layers);
    else job?.reject(new Error(data.error));
  };
  return slot;
}

/** Tính lớp ảnh ở luồng nền để trang không khựng; trình duyệt không có Worker thì tính ngay tại đây. */
export function buildLayersInBackground(
  base: CutoutPixels,
  settings: RealismSettings,
  target: { width: number; height: number },
): Promise<RealismLayers> {
  if (typeof Worker === 'undefined') return Promise.resolve(buildRealismLayers(base, settings, target));
  slots ??= Array.from({ length: BATCH_CONCURRENCY }, createSlot);
  const slot = slots.reduce((least, candidate) => (candidate.jobs < least.jobs ? candidate : least));
  const id = (nextId += 1);
  slot.jobs += 1;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    // Chép điểm ảnh vì `base` còn được dùng ở luồng chính.
    const copy = base.data.slice();
    const job: CompositeJob = { id, base: { ...base, data: copy }, settings, target };
    slot.worker.postMessage(job, [copy.buffer]);
  });
}
