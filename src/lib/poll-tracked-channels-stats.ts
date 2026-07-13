/**
 * Kênh vừa import / đang chờ Apify: chưa có bất kỳ chỉ số nào.
 * 
 * LƯU Ý: Kênh Facebook có thể bị block scraping → followers=0 nhưng vẫn có posts.
 * Chỉ hiển thị "loading" khi KHÔNG có BẤT KỲ số liệu nào (kể cả videos/posts).
 * Nếu có ít nhất 1 video hoặc 1 likes/views → kênh đã có data, không cần loading.
 */
export function channelAwaitingStats(ch: {
  total_followers?: number | null;
  total_likes?: number | bigint | null;
  total_views?: number | bigint | null;
  total_videos?: number | null;
  last_synced_at?: string | Date | null;
}): boolean {
  // If we already synced the channel (meaning AI finished processing), do NOT mark it as awaiting.
  if (ch.last_synced_at) return false;

  const f = ch.total_followers ?? 0;
  const l = Number(ch.total_likes ?? 0);
  const v = Number(ch.total_views ?? 0);
  const n = Number(ch.total_videos ?? 0);

  // If channel has ANY data (videos, likes, views, or followers), it's NOT awaiting stats.
  // Facebook channels blocked by Apify will have 0 followers but may have posts → don't show loading.
  const hasAnyData = f > 0 || l > 0 || v > 0 || n > 0;
  return !hasAnyData;
}

/**
 * Poll API cho đến khi mọi kênh đã có ít nhất một chỉ số, hoặc hết thời gian.
 */
export async function pollTrackedChannelsUntilStats<T>(
  loadChannels: () => Promise<T[]>,
  options?: { maxMs?: number; intervalMs?: number },
): Promise<T[]> {
  const maxMs = options?.maxMs ?? 180000;
  const intervalMs = options?.intervalMs ?? 3000;
  const deadline = Date.now() + maxMs;
  let list = await loadChannels();
  while (
    list.length > 0 &&
    list.some((c) => channelAwaitingStats(c as Parameters<typeof channelAwaitingStats>[0])) &&
    Date.now() < deadline
  ) {
    await new Promise((r) => setTimeout(r, intervalMs));
    list = await loadChannels();
  }
  return list;
}
