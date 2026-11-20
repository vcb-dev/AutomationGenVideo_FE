import { formatCompact, hasStatsScope, sortVideos } from '../tiktok-stats';
import type { TikTokVideoStat } from '@/lib/api/social';

describe('formatCompact', () => {
  it.each([
    [0, '0'], [950, '950'], [1000, '1K'], [1234, '1.2K'], [15500, '15.5K'],
    [1500000, '1.5M'], [2300000000, '2.3B'], [null, '0'], [undefined, '0'],
  ] as const)('%p → %p', (n, want) => {
    expect(formatCompact(n as any)).toBe(want);
  });
});

describe('sortVideos', () => {
  const v = (postId: string, views: number, publishedAt: string | null): TikTokVideoStat =>
    ({ postId, title: null, url: null, publishedAt, views, likes: 100 - views, comments: 0, shares: 0 });
  const list = [v('a', 10, '2026-11-01'), v('b', 30, null), v('c', 20, '2026-11-05')];

  it('giảm dần theo lượt xem, không đổi mảng gốc', () => {
    expect(sortVideos(list, 'views').map((x) => x.postId)).toEqual(['b', 'c', 'a']);
    expect(list.map((x) => x.postId)).toEqual(['a', 'b', 'c']);
  });

  it('theo lượt thích', () => {
    expect(sortVideos(list, 'likes').map((x) => x.postId)).toEqual(['a', 'c', 'b']);
  });

  it('theo ngày đăng: mới nhất trước, thiếu ngày xuống cuối', () => {
    expect(sortVideos(list, 'publishedAt').map((x) => x.postId)).toEqual(['c', 'a', 'b']);
  });
});

describe('hasStatsScope', () => {
  it('cần đủ video.list và user.info.stats', () => {
    expect(hasStatsScope('user.info.basic,video.list,user.info.stats')).toBe(true);
    expect(hasStatsScope('user.info.basic,video.publish')).toBe(false);
    expect(hasStatsScope(undefined)).toBe(false);
  });
});
