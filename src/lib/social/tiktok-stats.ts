/** Hàm thuần cho số liệu TikTok trên trang Kênh. */
import type { TikTokVideoStat } from '@/lib/api/social';

export type TikTokVideoSortKey = 'views' | 'likes' | 'comments' | 'shares' | 'publishedAt';

/** 950 → "950", 1234 → "1.2K", 1500000 → "1.5M", 2300000000 → "2.3B" (bỏ ".0") */
export function formatCompact(n: number | null | undefined): string {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  const fmt = (x: number, unit: string) => `${(Math.round(x * 10) / 10).toString().replace(/\.0$/, '')}${unit}`;
  if (abs >= 1e9) return fmt(v / 1e9, 'B');
  if (abs >= 1e6) return fmt(v / 1e6, 'M');
  if (abs >= 1e3) return fmt(v / 1e3, 'K');
  return String(v);
}

/** Sắp xếp giảm dần theo cột; publishedAt mới nhất trước, video thiếu ngày xuống cuối. Không đổi mảng gốc. */
export function sortVideos(videos: TikTokVideoStat[], key: TikTokVideoSortKey): TikTokVideoStat[] {
  const val = (v: TikTokVideoStat) =>
    key === 'publishedAt' ? (v.publishedAt ? new Date(v.publishedAt).getTime() : -Infinity) : Number(v[key]) || 0;
  return [...videos].sort((a, b) => val(b) - val(a));
}

/** Kênh đã cấp quyền số liệu (scope lưu trong extra_data.scope dạng "a,b,c") */
export function hasStatsScope(scopeRaw: unknown): boolean {
  const s = typeof scopeRaw === 'string' ? scopeRaw.split(',').map((x) => x.trim()) : [];
  return s.includes('video.list') && s.includes('user.info.stats');
}
