/**
 * Gọi BE làm mới follower / likes / views qua Apify (mọi nền tảng).
 */
export async function enrichTrackedChannelApify(
  channelId: string,
): Promise<{ success: boolean; message?: string }> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const res = await fetch(`${apiUrl}/tracked-channels/${channelId}/enrich-apify`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      message: (data as { message?: string }).message || `Lỗi ${res.status}`,
    };
  }
  if ((data as { success?: boolean }).success === false) {
    return {
      success: false,
      message: (data as { message?: string }).message,
    };
  }
  return { success: true };
}

/**
 * Tự động enrich các kênh chưa có data (last_synced_at = null).
 * Dùng cooldown 30 phút để không tốn Apify quota liên tục.
 */
const STALE_ENRICH_KEY = 'stale_enrich_ts';
const STALE_COOLDOWN_MS = 30 * 60 * 1000; // 30 phút

export async function enrichStaleChannelsIfNeeded(): Promise<{
  enriched: number;
  skipped: number;
  total_stale: number;
} | null> {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STALE_ENRICH_KEY);
  if (raw && Date.now() - parseInt(raw, 10) < STALE_COOLDOWN_MS) return null;

  const token = localStorage.getItem('auth_token');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  try {
    const res = await fetch(`${apiUrl}/tracked-channels/enrich-stale`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    sessionStorage.setItem(STALE_ENRICH_KEY, String(Date.now()));
    return data as { enriched: number; skipped: number; total_stale: number };
  } catch {
    return null;
  }
}
