import type { PeriodStats, DailyStats, PlatformStats } from '@/services/scraperService';

/** Five primary metrics displayed in the top card row. */
export const METRICS = [
  { code: 'views', label: 'Lượt xem', ma: 'views', nhan: 'Lượt xem' },
  { code: 'likes', label: 'Lượt thích', ma: 'likes', nhan: 'Lượt thích' },
  { code: 'comments', label: 'Bình luận', ma: 'comments', nhan: 'Bình luận' },
  { code: 'shares', label: 'Chia sẻ', ma: 'shares', nhan: 'Chia sẻ' },
  { code: 'posts', label: 'Bài đã đăng', ma: 'posts', nhan: 'Bài đã đăng' },
] as const;

export type MetricCode = (typeof METRICS)[number]['code'];

export interface Summary extends PeriodStats {
  previous: PeriodStats;
  followers: number;
  channelCount: number;
  totalChannels: number;
  dailySeries: DailyStats[];

  // Backward compatibility aliases:
  truoc?: PeriodStats;
  so_kenh?: number;
  tong_kenh?: number;
  theo_ngay?: DailyStats[];
}

const EMPTY_STATS: PeriodStats = { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 };

/**
 * Merges platform stats across multiple platforms for "All Platforms" summary mode.
 */
export function mergePlatforms(list: PlatformStats[]): Summary {
  const dailyMap = new Map<string, DailyStats>();
  for (const p of list) {
    const series = p.dailySeries || p.theo_ngay || [];
    for (const d of series) {
      const dateKey = d.date || d.ngay || '';
      const cur = dailyMap.get(dateKey) ?? {
        date: dateKey,
        ngay: dateKey,
        ...EMPTY_STATS,
      };
      cur.views += d.views;
      cur.likes += d.likes;
      cur.comments += d.comments;
      cur.shares += d.shares;
      cur.posts += d.posts;
      dailyMap.set(dateKey, cur);
    }
  }

  const sumStats = (getter: (p: PlatformStats) => PeriodStats): PeriodStats =>
    list.reduce(
      (s, p) => {
        const v = getter(p);
        return {
          views: s.views + (v?.views ?? 0),
          likes: s.likes + (v?.likes ?? 0),
          comments: s.comments + (v?.comments ?? 0),
          shares: s.shares + (v?.shares ?? 0),
          posts: s.posts + (v?.posts ?? 0),
        };
      },
      { ...EMPTY_STATS },
    );

  const current = sumStats((p) => p);
  const previous = sumStats((p) => p.previous || p.truoc || EMPTY_STATS);
  const followers = list.reduce((s, p) => s + (p.followers ?? 0), 0);
  const channelCount = list.reduce((s, p) => s + (p.channelCount ?? p.so_kenh ?? 0), 0);
  const totalChannels = list.reduce((s, p) => s + (p.totalChannels ?? p.tong_kenh ?? 0), 0);
  const dailySeries = [...dailyMap.values()].sort((a, b) =>
    (a.date || a.ngay || '').localeCompare(b.date || b.ngay || ''),
  );

  return {
    ...current,
    previous,
    followers,
    channelCount,
    totalChannels,
    dailySeries,

    // Backward compatibility aliases
    truoc: previous,
    so_kenh: channelCount,
    tong_kenh: totalChannels,
    theo_ngay: dailySeries,
  };
}
