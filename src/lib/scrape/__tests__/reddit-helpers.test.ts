import {
  REDDIT_SEARCH_SORT_OPTIONS,
  REDDIT_SUBREDDIT_SORT_OPTIONS,
  REDDIT_TIME_OPTIONS,
  canScrapeReddit,
  filterRedditPostsByMedia,
  formatRedditCount,
  normalizeSubredditInput,
  SUBREDDITS_PER_PAGE,
  clampPage,
  parseScrapeCount,
} from '../reddit-helpers';
import { UserRole } from '@/types/auth';

/**
 * Tab Reddit ở Khám phá kênh: tìm bài theo từ khoá + cào theo cộng đồng (subreddit). Giá trị gửi
 * BE phải khớp REDDIT_SORTS / REDDIT_TIME_RANGES bên BE, tên cộng đồng chuẩn hoá giống BE.
 */
describe('normalizeSubredditInput', () => {
  it.each([
    ['r/Jewelry', 'jewelry'],
    ['/r/jewelry/', 'jewelry'],
    ['https://www.reddit.com/r/jewelry/top/?t=month', 'jewelry'],
    ['https://www.reddit.com/r/EngagementRings/s/AbCdEf', 'engagementrings'],
    ['jewelry', 'jewelry'],
  ])('%s → %s', (raw, name) => {
    expect(normalizeSubredditInput(raw)).toBe(name);
  });

  it.each(['u/someone', 'https://example.com', 'r/a', 'trang sức', ''])('%s → không hợp lệ', (raw) => {
    expect(normalizeSubredditInput(raw)).toBe('');
  });
});

describe('Tuỳ chọn gửi BE', () => {
  it('sort khớp REDDIT_SORTS của BE', () => {
    const allowed = ['RELEVANCE', 'HOT', 'TOP', 'NEW', 'COMMENTS'];
    for (const o of REDDIT_SEARCH_SORT_OPTIONS) expect(allowed).toContain(o.value);
  });

  it('trong cộng đồng không có "Liên quan nhất"', () => {
    expect(REDDIT_SUBREDDIT_SORT_OPTIONS.map((o) => o.value)).not.toContain('RELEVANCE');
  });

  it('time_range khớp REDDIT_TIME_RANGES của BE', () => {
    const allowed = ['all', 'year', 'month', 'week', 'day', 'hour'];
    for (const o of REDDIT_TIME_OPTIONS) expect(allowed).toContain(o.value);
  });
});

describe('formatRedditCount', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1543, '1.5K'],
    [2000, '2K'],
    [382636, '382.6K'],
    [25409226, '25.4M'],
  ])('%d → %s', (n, text) => {
    expect(formatRedditCount(n)).toBe(text);
  });
});

describe('canScrapeReddit', () => {
  it('chỉ ADMIN / LEADER — khớp quyền BE', () => {
    expect(canScrapeReddit([UserRole.ADMIN])).toBe(true);
    expect(canScrapeReddit([UserRole.LEADER])).toBe(true);
    expect(canScrapeReddit([UserRole.MANAGER])).toBe(false);
    expect(canScrapeReddit([])).toBe(false);
    expect(canScrapeReddit(undefined)).toBe(false);
  });
});

describe('parseScrapeCount', () => {
  it('số nguyên dương, kẹp tối đa', () => {
    expect(parseScrapeCount('25', 1000)).toBe(25);
    expect(parseScrapeCount('12.9', 1000)).toBe(12);
    expect(parseScrapeCount('5000', 1000)).toBe(1000);
  });

  it('rỗng / 0 / âm / chữ → null (không gửi BE)', () => {
    for (const raw of ['', '0', '-3', 'abc']) expect(parseScrapeCount(raw, 1000)).toBeNull();
  });
});

describe('filterRedditPostsByMedia', () => {
  const posts = [{ media_type: 'TEXT' }, { media_type: 'VIDEO' }, { media_type: 'IMAGE' }, { media_type: 'VIDEO' }];

  it('ALL không lọc', () => {
    expect(filterRedditPostsByMedia(posts, 'ALL')).toHaveLength(4);
  });

  it('lọc đúng loại', () => {
    expect(filterRedditPostsByMedia(posts, 'VIDEO')).toEqual([{ media_type: 'VIDEO' }, { media_type: 'VIDEO' }]);
  });
});

describe('Chia trang cộng đồng đã lưu', () => {
  it('6 cộng đồng/trang (2 hàng)', () => {
    expect(SUBREDDITS_PER_PAGE).toBe(6);
  });

  it('xoá cộng đồng cuối cùng của trang cuối → lùi về trang trước', () => {
    // 31 cộng đồng = 6 trang, trang 6 chỉ có 1 cái; xoá nó còn 30 → 5 trang
    expect(clampPage(6, 30)).toBe(5);
  });

  it('vẫn còn cộng đồng trên trang hiện tại thì giữ nguyên trang', () => {
    expect(clampPage(3, 29)).toBe(3);
  });

  it('xoá hết → trang 1, không ra trang 0', () => {
    expect(clampPage(2, 0)).toBe(1);
    expect(clampPage(0, 12)).toBe(1);
  });
});
