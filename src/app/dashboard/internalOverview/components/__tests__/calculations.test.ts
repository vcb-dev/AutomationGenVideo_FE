import { METRICS, mergePlatforms } from '../calculations';
import type { PlatformStats } from '@/services/scraperService';

/**
 * Gộp nhiều nền tảng thành một bộ số cho chế độ "Tất cả nền tảng".
 *
 * Đây là chỗ duy nhất bên FE còn tự cộng số — mọi phép cộng khác đã đẩy sang SQL. Cộng sai ở
 * đây thì hàng thẻ đầu trang và biểu đồ xu hướng lệch nhau mà không có gì báo.
 */

const platform = (p: Partial<PlatformStats> = {}): PlatformStats =>
  ({
    platform: 'facebook',
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    posts: 0,
    truoc: { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 },
    followers: 0,
    so_kenh: 0,
    tong_kenh: 0,
    theo_ngay: [],
    ...p,
  }) as PlatformStats;

const ngay = (ngay: string, views: number, posts = 0) => ({
  ngay,
  views,
  likes: 0,
  comments: 0,
  shares: 0,
  posts,
});

describe('mergePlatforms — cộng chỉ số kỳ này', () => {
  it('cộng đủ 5 chỉ số trên hàng thẻ đầu trang', () => {
    const ra = mergePlatforms([
      platform({ views: 100, likes: 10, comments: 5, shares: 2, posts: 1 }),
      platform({ platform: 'tiktok', views: 900, likes: 90, comments: 45, shares: 18, posts: 9 }),
    ]);

    for (const { ma } of METRICS) {
      expect(ra[ma]).toBeGreaterThan(0);
    }
    expect(ra).toMatchObject({ views: 1000, likes: 100, comments: 50, shares: 20, posts: 10 });
  });

  it('cộng riêng bộ số kỳ trước — đây là gốc của mũi tên tăng/giảm', () => {
    const ra = mergePlatforms([
      platform({ views: 100, truoc: { views: 80, likes: 8, comments: 4, shares: 2, posts: 1 } }),
      platform({
        platform: 'tiktok',
        views: 200,
        truoc: { views: 120, likes: 12, comments: 6, shares: 3, posts: 2 },
      }),
    ]);

    expect(ra.views).toBe(300);
    expect(ra.truoc).toEqual({ views: 200, likes: 20, comments: 10, shares: 5, posts: 3 });
  });

  it('cộng followers, so_kenh, tong_kenh', () => {
    const ra = mergePlatforms([
      platform({ followers: 1000, so_kenh: 3, tong_kenh: 5 }),
      platform({ platform: 'youtube', followers: 250, so_kenh: 1, tong_kenh: 2 }),
    ]);

    expect(ra).toMatchObject({ followers: 1250, so_kenh: 4, tong_kenh: 7 });
  });

  it('danh sách rỗng trả bộ số 0, không phải NaN hay undefined', () => {
    const ra = mergePlatforms([]);

    expect(ra).toMatchObject({ views: 0, likes: 0, comments: 0, shares: 0, posts: 0 });
    expect(ra.truoc).toEqual({ views: 0, likes: 0, comments: 0, shares: 0, posts: 0 });
    expect(ra.theo_ngay).toEqual([]);
  });

  it('một nền tảng thì giữ nguyên số, không nhân đôi', () => {
    const ra = mergePlatforms([platform({ views: 42, posts: 7, followers: 9 })]);
    expect(ra).toMatchObject({ views: 42, posts: 7, followers: 9 });
  });
});

describe('mergePlatforms — chuỗi theo ngày cho biểu đồ xu hướng', () => {
  /*
   * Cộng theo NGÀY chứ không theo vị trí trong mảng. BE đã bơm đủ mọi ngày cho từng nền tảng
   * nên hai mảng vốn dài bằng nhau, nhưng cộng theo ngày thì kể cả sau này BE đổi cách trả về,
   * biểu đồ vẫn không bị lệch cột.
   */
  it('cộng đúng ngày với ngày kể cả khi hai nền tảng lệch danh sách ngày', () => {
    const ra = mergePlatforms([
      platform({ theo_ngay: [ngay('2026-08-01', 100), ngay('2026-08-02', 200)] }),
      platform({
        platform: 'tiktok',
        theo_ngay: [ngay('2026-08-02', 20), ngay('2026-08-03', 30)],
      }),
    ]);

    expect(ra.theo_ngay).toEqual([
      expect.objectContaining({ ngay: '2026-08-01', views: 100 }),
      expect.objectContaining({ ngay: '2026-08-02', views: 220 }),
      expect.objectContaining({ ngay: '2026-08-03', views: 30 }),
    ]);
  });

  it('xếp ngày tăng dần dù đầu vào lộn xộn — biểu đồ vẽ theo đúng thứ tự mảng', () => {
    const ra = mergePlatforms([
      platform({ theo_ngay: [ngay('2026-08-03', 3), ngay('2026-08-01', 1)] }),
      platform({ platform: 'tiktok', theo_ngay: [ngay('2026-08-02', 2)] }),
    ]);

    expect(ra.theo_ngay.map((d) => d.ngay)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });

  it('cộng cả 5 chỉ số trong chuỗi ngày, không riêng lượt xem', () => {
    const mot = { ngay: '2026-08-01', views: 1, likes: 2, comments: 3, shares: 4, posts: 5 };
    const ra = mergePlatforms([
      platform({ theo_ngay: [mot] }),
      platform({ platform: 'tiktok', theo_ngay: [mot] }),
    ]);

    expect(ra.theo_ngay[0]).toEqual({
      ngay: '2026-08-01',
      views: 2,
      likes: 4,
      comments: 6,
      shares: 8,
      posts: 10,
    });
  });

  /*
   * Bản gộp phải là đối tượng MỚI. Cộng thẳng vào đối tượng của nền tảng đầu tiên thì lần gộp
   * thứ hai trên cùng dữ liệu sẽ cho ra số gấp đôi — lỗi chỉ lộ khi người dùng đổi bộ lọc rồi
   * đổi ngược lại.
   */
  it('không sửa dữ liệu đầu vào', () => {
    const goc = platform({ views: 100, theo_ngay: [ngay('2026-08-01', 100, 2)] });
    const banSao = JSON.parse(JSON.stringify(goc));

    mergePlatforms([goc, platform({ platform: 'tiktok', views: 50 })]);

    expect(goc).toEqual(banSao);
  });

  it('gộp hai lần trên cùng đầu vào cho ra kết quả y hệt', () => {
    const list = [
      platform({ views: 100, theo_ngay: [ngay('2026-08-01', 100)] }),
      platform({ platform: 'tiktok', views: 50, theo_ngay: [ngay('2026-08-01', 50)] }),
    ];

    expect(mergePlatforms(list)).toEqual(mergePlatforms(list));
  });
});
