import apiClient from '@/lib/api-client';

export type LarkTrackedSyncResult = {
  success?: boolean;
  imported: number;
  skipped_no_user: number;
  skipped_no_identity: number;
  errors?: string[];
};

const SESSION_KEY = 'lark_tracked_channels_sync_ts';
const COOLDOWN_MS = 25 * 60 * 1000; // tránh gọi lặp mỗi lần đổi tab

/** Gọi BE: đồng bộ kênh được gán (Bảng Channel Lark) → tracked_channels của user đăng nhập */
export async function syncFromLarkAssignment(): Promise<LarkTrackedSyncResult> {
  const { data } = await apiClient.post<LarkTrackedSyncResult>(
    '/tracked-channels/sync-from-lark-assignment',
    {},
    { timeout: 900000 },
  );
  return data;
}

/** Chỉ sync nếu đã qua COOLDOWN kể từ lần trước (sessionStorage). Trả null nếu bỏ qua. */
export async function syncFromLarkAssignmentIfStale(): Promise<LarkTrackedSyncResult | null> {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  const now = Date.now();
  if (raw && now - parseInt(raw, 10) < COOLDOWN_MS) return null;
  try {
    const r = await syncFromLarkAssignment();
    sessionStorage.setItem(SESSION_KEY, String(now));
    return r;
  } catch {
    // Không set cooldown khi thất bại để lần sau vẫn có thể thử lại
    return null;
  }
}

export function clearLarkSyncCooldown() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
}
