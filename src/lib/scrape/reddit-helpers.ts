import type { RedditMediaType, RedditSort, RedditTimeRange } from '@/services/scraperService';
import { UserRole } from '@/types/auth';

export interface RedditOption<T extends string> {
  value: T;
  label: string;
}

/** Sắp xếp khi tìm theo từ khoá — giá trị khớp REDDIT_SORTS bên BE. */
export const REDDIT_SEARCH_SORT_OPTIONS: RedditOption<RedditSort>[] = [
  { value: 'TOP', label: 'Nhiều upvote nhất' },
  { value: 'HOT', label: 'Đang hot' },
  { value: 'NEW', label: 'Mới nhất' },
  { value: 'COMMENTS', label: 'Nhiều bình luận' },
  { value: 'RELEVANCE', label: 'Liên quan nhất' },
];

/** Trong một cộng đồng thì "liên quan" không có nghĩa — bỏ đi. */
export const REDDIT_SUBREDDIT_SORT_OPTIONS: RedditOption<RedditSort>[] = REDDIT_SEARCH_SORT_OPTIONS.filter(
  (o) => o.value !== 'RELEVANCE',
);

export const REDDIT_TIME_OPTIONS: RedditOption<RedditTimeRange>[] = [
  { value: 'day', label: 'Hôm nay' },
  { value: 'week', label: '7 ngày qua' },
  { value: 'month', label: '30 ngày qua' },
  { value: 'year', label: '1 năm qua' },
  { value: 'all', label: 'Mọi lúc' },
];

export const REDDIT_MEDIA_LABELS: Record<RedditMediaType, string> = {
  TEXT: 'Chữ',
  IMAGE: 'Ảnh',
  GALLERY: 'Album',
  VIDEO: 'Video',
  LINK: 'Link',
};

/**
 * "r/Jewelry", "/r/jewelry/", link reddit.com/r/jewelry/..., link chia sẻ ".../r/jewelry/s/<mã>"
 * hoặc tên trần → "jewelry"; '' nếu không hợp lệ. Khớp normalizeSubredditName bên BE.
 */
export function normalizeSubredditInput(raw: string): string {
  const text = (raw || '').trim();
  const match = text.match(/(?:^|\/)r\/([A-Za-z0-9_]+)/);
  const name = match ? match[1] : text.replace(/^\/+/, '');
  return /^[A-Za-z0-9_]{2,21}$/.test(name) ? name.toLowerCase() : '';
}

/** 1543 → "1.5K", 382636 → "382.6K", 25409226 → "25.4M". */
export function formatRedditCount(n: number): string {
  const value = Number(n) || 0;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(value);
}

/** Tìm / cào / xoá gọi TikHub tính phí — BE chỉ cho ADMIN/LEADER. */
export function canScrapeReddit(roles: readonly string[] | undefined | null): boolean {
  return (roles ?? []).some((r) => r === UserRole.ADMIN || r === UserRole.LEADER);
}

/** Ô "số bài muốn lấy": số nguyên dương, kẹp tối đa `max` (khớp normalizeTargetCount bên BE); sai → null. */
export function parseScrapeCount(raw: string, max: number): number | null {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? Math.min(max, n) : null;
}

/** Lọc kết quả vừa quét theo loại bài ('ALL' = không lọc). Kho đã lưu thì BE lọc. */
export function filterRedditPostsByMedia<T extends { media_type: string }>(posts: T[], mediaType: string): T[] {
  return mediaType === 'ALL' ? posts : posts.filter((p) => p.media_type === mediaType);
}

/** Cộng đồng đã lưu chia trang: 6 cái/trang — 2 hàng trên màn rộng (3 thẻ/hàng). */
export const SUBREDDITS_PER_PAGE = 6;

/** Trang hợp lệ sau khi số cộng đồng thay đổi (vd xoá cái cuối của trang cuối thì lùi một trang). */
export function clampPage(page: number, total: number, perPage = SUBREDDITS_PER_PAGE): number {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  return Math.min(Math.max(1, page), lastPage);
}
