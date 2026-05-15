import apiClient from '@/lib/api-client';
import { clearLarkSyncCooldown, type LarkTrackedSyncResult } from '@/lib/sync-lark-tracked-channels';
import {
  channelAwaitingStats,
} from '@/lib/poll-tracked-channels-stats';

const listeners = new Set<(running: boolean) => void>();
let refcount = 0;
let gate: Promise<void> = Promise.resolve();

function notify() {
  const busy = refcount > 0;
  listeners.forEach((cb) => {
    try {
      cb(busy);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeGlobalHrSync(cb: (busy: boolean) => void): () => void {
  cb(refcount > 0);
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isGlobalHrSyncBusy(): boolean {
  return refcount > 0;
}

export function waitUntilGlobalHrIdle(): Promise<void> {
  if (refcount === 0) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = subscribeGlobalHrSync((busy) => {
      if (!busy) {
        unsub();
        resolve();
      }
    });
  });
}

/**
 * Đồng bộ HR tuần tự; giữ loading trên mọi tab kênh.
 * BE enrich ưu tiên `priorityPlatform` trước (Facebook trước khi đang ở FB, v.v.).
 */
export async function runGlobalHrSync<T>(
  priorityPlatform: string,
  loadChannels: () => Promise<T[]>,
): Promise<LarkTrackedSyncResult> {
  refcount += 1;
  notify();

  const waitPrev = gate;
  let rel!: () => void;
  gate = new Promise<void>((r) => {
    rel = r;
  });

  await waitPrev;

  try {
    clearLarkSyncCooldown();
    const { data } = await apiClient.post<LarkTrackedSyncResult>(
      '/tracked-channels/sync-from-lark-assignment',
      { prioritizePlatform: priorityPlatform },
      { timeout: 900000 },
    );
    const r = data;
    return r;
  } finally {
    rel();
    refcount -= 1;
    notify();
  }
}
