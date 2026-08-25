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
  truoc: PeriodStats;
  so_kenh: number;
  tong_kenh: number;
  theo_ngay: DailyStats[];
}

const EMPTY_STATS: PeriodStats = { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 };

/**
 * Nền tảng có bài trong kỳ nhưng không lấy được lượt xem.
 *
 * BE gửi cờ `viewsAvailable`; bản cũ không có cờ thì tự suy ra theo đúng quy tắc đó. Đây là
 * thứ phân biệt "không ai xem" với "chưa lấy được số" — xem chú thích trong owned-stats.service.ts.
 */
export function lacksViewData(p: PlatformStats): boolean {
  if (p.viewsAvailable !== undefined) return !p.viewsAvailable;
  return p.posts > 0 && p.views === 0;
}

/** Danh sách nền tảng thiếu số lượt xem, để giao diện nói ra thay vì hiện số 0. */
export function platformsWithoutViews(list: PlatformStats[]): string[] {
  return list.filter(lacksViewData).map((p) => p.platform);
}

/**
 * Lượt xem trung bình mỗi bài — chỉ tính trên các nền tảng THẬT SỰ có số lượt xem.
 *
 * Gộp cả nền tảng thiếu số vào mẫu số sẽ kéo trung bình xuống một cách vô căn cứ: 1.156 bài
 * Instagram không có lượt xem mà vẫn bị đếm thì con số của Facebook cũng sai theo.
 */
export function averageViewsPerPost(list: PlatformStats[]): number {
  const usable = list.filter((p) => !lacksViewData(p));
  const views = usable.reduce((s, p) => s + p.views, 0);
  const posts = usable.reduce((s, p) => s + p.posts, 0);
  return posts > 0 ? Math.round(views / posts) : 0;
}

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
