import { METRICS, mergePlatforms } from '../calculations';
import type { PlatformStats } from '@/services/scraperService';

const samplePlatform = (p: Partial<PlatformStats> = {}): PlatformStats =>
  ({
    platform: 'facebook',
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    posts: 0,
    previous: { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 },
    truoc: { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 },
    followers: 0,
    channelCount: 0,
    totalChannels: 0,
    so_kenh: 0,
    tong_kenh: 0,
    dailySeries: [],
    theo_ngay: [],
    ...p,
  }) as PlatformStats;

const sampleDaily = (date: string, views: number, posts = 0) => ({
  date,
  ngay: date,
  views,
  likes: 0,
  comments: 0,
  shares: 0,
  posts,
});

describe('mergePlatforms — period metrics summation', () => {
  it('sums all 5 primary metrics for top card row', () => {
    const res = mergePlatforms([
      samplePlatform({ views: 100, likes: 10, comments: 5, shares: 2, posts: 1 }),
      samplePlatform({ platform: 'tiktok', views: 900, likes: 90, comments: 45, shares: 18, posts: 9 }),
    ]);

    for (const { code } of METRICS) {
      expect(res[code]).toBeGreaterThan(0);
    }
    expect(res).toMatchObject({ views: 1000, likes: 100, comments: 50, shares: 20, posts: 10 });
  });

  it('sums previous period metrics separately for delta calculation', () => {
    const res = mergePlatforms([
      samplePlatform({ views: 100, previous: { views: 80, likes: 8, comments: 4, shares: 2, posts: 1 } }),
      samplePlatform({
        platform: 'tiktok',
        views: 200,
        previous: { views: 120, likes: 12, comments: 6, shares: 3, posts: 2 },
      }),
    ]);

    expect(res.views).toBe(300);
    expect(res.previous).toEqual({ views: 200, likes: 20, comments: 10, shares: 5, posts: 3 });
  });

  it('sums followers, channelCount, and totalChannels', () => {
    const res = mergePlatforms([
      samplePlatform({ followers: 1000, channelCount: 3, totalChannels: 5 }),
      samplePlatform({ platform: 'youtube', followers: 250, channelCount: 1, totalChannels: 2 }),
    ]);

    expect(res).toMatchObject({ followers: 1250, channelCount: 4, totalChannels: 7 });
  });

  it('returns zeroed stats for empty list without NaN or undefined', () => {
    const res = mergePlatforms([]);

    expect(res).toMatchObject({ views: 0, likes: 0, comments: 0, shares: 0, posts: 0 });
    expect(res.previous).toEqual({ views: 0, likes: 0, comments: 0, shares: 0, posts: 0 });
    expect(res.dailySeries).toEqual([]);
  });

  it('preserves numbers unchanged for a single platform', () => {
    const res = mergePlatforms([samplePlatform({ views: 42, posts: 7, followers: 9 })]);
    expect(res).toMatchObject({ views: 42, posts: 7, followers: 9 });
  });
});

describe('mergePlatforms — daily time series for trend chart', () => {
  it('merges matching dates accurately across platforms', () => {
    const res = mergePlatforms([
      samplePlatform({ dailySeries: [sampleDaily('2026-08-01', 100), sampleDaily('2026-08-02', 200)] }),
      samplePlatform({
        platform: 'tiktok',
        dailySeries: [sampleDaily('2026-08-02', 20), sampleDaily('2026-08-03', 30)],
      }),
    ]);

    expect(res.dailySeries).toEqual([
      expect.objectContaining({ date: '2026-08-01', views: 100 }),
      expect.objectContaining({ date: '2026-08-02', views: 220 }),
      expect.objectContaining({ date: '2026-08-03', views: 30 }),
    ]);
  });

  it('sorts daily items in ascending chronological order', () => {
    const res = mergePlatforms([
      samplePlatform({ dailySeries: [sampleDaily('2026-08-03', 3), sampleDaily('2026-08-01', 1)] }),
      samplePlatform({ platform: 'tiktok', dailySeries: [sampleDaily('2026-08-02', 2)] }),
    ]);

    expect(res.dailySeries.map((d) => d.date)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });

  it('sums all 5 metrics in daily series', () => {
    const dailyItem = { date: '2026-08-01', ngay: '2026-08-01', views: 1, likes: 2, comments: 3, shares: 4, posts: 5 };
    const res = mergePlatforms([
      samplePlatform({ dailySeries: [dailyItem] }),
      samplePlatform({ platform: 'tiktok', dailySeries: [dailyItem] }),
    ]);

    expect(res.dailySeries[0]).toMatchObject({
      date: '2026-08-01',
      views: 2,
      likes: 4,
      comments: 6,
      shares: 8,
      posts: 10,
    });
  });

  it('does not mutate input objects', () => {
    const original = samplePlatform({ views: 100, dailySeries: [sampleDaily('2026-08-01', 100, 2)] });
    const clone = JSON.parse(JSON.stringify(original));

    mergePlatforms([original, samplePlatform({ platform: 'tiktok', views: 50 })]);

    expect(original).toEqual(clone);
  });

  it('merging twice with same input yields identical results', () => {
    const list = [
      samplePlatform({ views: 100, dailySeries: [sampleDaily('2026-08-01', 100)] }),
      samplePlatform({ platform: 'tiktok', views: 200, dailySeries: [sampleDaily('2026-08-01', 50)] }),
    ];
    expect(mergePlatforms(list)).toEqual(mergePlatforms(list));
  });
});
