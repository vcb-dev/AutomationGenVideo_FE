import type { PlatformStats } from '@/services/scraperService';
import { averageViewsPerPost, lacksViewData, platformsWithoutViews } from '../calculations';

/**
 * "Không ai xem" khác hẳn "chưa lấy được số".
 *
 * Đo trên dữ liệu thật: 1.446/1.470 reels Instagram có `play_count = 0` vì token thiếu quyền
 * `instagram_manage_insights`, trong khi 947 reels vẫn có lượt thích. Nếu để số 0 đó trộn vào
 * số liệu chung thì trang Tổng quan kênh nội bộ nói dối theo ba cách cùng lúc:
 *
 *   1. Biểu đồ vẽ một đường phẳng dính đáy mang tên "Instagram"
 *   2. Ô "Lượt xem trung bình / bài" chia cho cả 1.156 bài Instagram → tụt vô căn cứ
 *   3. Mọi kênh Instagram rơi xuống đáy bảng xếp hạng với cột lượt xem = 0
 *
 * Không đâu trên trang nói rằng con số đó không tồn tại.
 */
describe('Phân biệt "chưa lấy được lượt xem" với "0 lượt xem"', () => {
  const platform = (over: Partial<PlatformStats>): PlatformStats =>
    ({
      platform: 'facebook',
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      posts: 0,
      followers: 0,
      truoc: { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 },
      so_kenh: 0,
      tong_kenh: 0,
      theo_ngay: [],
      ...over,
    }) as PlatformStats;

  describe('lacksViewData', () => {
    it('tin cờ viewsAvailable của BE trước tiên', () => {
      expect(lacksViewData(platform({ viewsAvailable: false, posts: 10, views: 0 }))).toBe(true);
      expect(lacksViewData(platform({ viewsAvailable: true, posts: 10, views: 0 }))).toBe(false);
    });

    it('BE bản cũ không có cờ thì tự suy ra: có bài mà không có view', () => {
      expect(lacksViewData(platform({ posts: 1156, views: 0 }))).toBe(true);
    });

    it('có bài và có view thì bình thường', () => {
      expect(lacksViewData(platform({ posts: 100, views: 28_700_000 }))).toBe(false);
    });

    it('KHÔNG có bài nào trong kỳ thì không kết luận gì — 0 bài thì 0 view là đúng', () => {
      expect(lacksViewData(platform({ posts: 0, views: 0 }))).toBe(false);
    });
  });

  describe('platformsWithoutViews', () => {
    it('chỉ ra đúng nền tảng thiếu số', () => {
      const list = [
        platform({ platform: 'facebook', posts: 4100, views: 28_700_000 }),
        platform({ platform: 'instagram', posts: 1156, views: 0 }),
        platform({ platform: 'threads', posts: 1, views: 0 }),
      ];

      expect(platformsWithoutViews(list)).toEqual(['instagram', 'threads']);
    });

    it('mọi nền tảng đều có số thì trả mảng rỗng', () => {
      expect(platformsWithoutViews([platform({ posts: 10, views: 1000 })])).toEqual([]);
    });
  });

  describe('averageViewsPerPost', () => {
    it('bỏ nền tảng thiếu số ra khỏi CẢ tử số lẫn mẫu số', () => {
      const list = [
        platform({ platform: 'facebook', posts: 100, views: 700_000 }),
        platform({ platform: 'instagram', posts: 1156, views: 0 }),
      ];

      // 700.000 / 100 = 7.000. Nếu gộp cả 1.156 bài Instagram thì ra 557 — sai lệch 12 lần.
      expect(averageViewsPerPost(list)).toBe(7000);
    });

    it('không còn nền tảng nào có số thì trả 0 chứ không chia cho 0', () => {
      expect(averageViewsPerPost([platform({ posts: 1156, views: 0 })])).toBe(0);
    });

    it('danh sách rỗng cũng an toàn', () => {
      expect(averageViewsPerPost([])).toBe(0);
    });

    it('làm tròn về số nguyên', () => {
      expect(averageViewsPerPost([platform({ posts: 3, views: 10 })])).toBe(3);
    });
  });
});
