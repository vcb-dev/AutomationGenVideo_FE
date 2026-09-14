import { ratio, percent } from '../../../internalOverview/components/shared';
import type { PlatformMarketStats } from '@/services/scraperService';

describe('Internal Channels Market Filter & Statistics (Đồ Da / VN / Global)', () => {
  describe('Market Filter Options Specification', () => {
    const MARKET_OPTIONS = [
      { value: '', label: 'Tất cả thị trường' },
      { value: 'vn', label: 'Kênh VN' },
      { value: 'global', label: 'Kênh Global' },
      { value: 'doda', label: 'Kênh Đồ Da' },
    ];

    it('có đúng 4 tuỳ chọn với mã giá trị chuẩn hoá', () => {
      const values = MARKET_OPTIONS.map((o) => o.value);
      expect(values).toEqual(['', 'vn', 'global', 'doda']);
    });

    it('nhãn hiển thị rõ ràng từng nhóm thị trường', () => {
      const labelMap = Object.fromEntries(MARKET_OPTIONS.map((o) => [o.value, o.label]));
      expect(labelMap['']).toBe('Tất cả thị trường');
      expect(labelMap['vn']).toBe('Kênh VN');
      expect(labelMap['global']).toBe('Kênh Global');
      expect(labelMap['doda']).toBe('Kênh Đồ Da');
    });
  });

  describe('Market Statistics Calculation with Đồ Da', () => {
    function computeMarketTotals(thiTruong: PlatformMarketStats[]) {
      const vn = thiTruong.reduce((s, t) => s + t.vn, 0);
      const global = thiTruong.reduce((s, t) => s + t.global, 0);
      const doda = thiTruong.reduce((s, t) => s + (t.doda || 0), 0);
      const total = vn + global + doda;
      const postsVn = thiTruong.reduce((s, t) => s + t.posts_vn, 0);
      const postsGlobal = thiTruong.reduce((s, t) => s + t.posts_global, 0);
      const postsDoda = thiTruong.reduce((s, t) => s + (t.posts_doda || 0), 0);
      const totalPosts = postsVn + postsGlobal + postsDoda;

      return {
        vn,
        global,
        doda,
        total,
        postsVn,
        postsGlobal,
        postsDoda,
        totalPosts,
        ratioVn: ratio(vn, total),
        ratioGlobal: ratio(global, total),
        ratioDoda: ratio(doda, total),
      };
    }

    it('tính toán chính xác tổng lượt xem và tỷ lệ cho cả 3 phân khúc', () => {
      const sampleStats: PlatformMarketStats[] = [
        {
          platform: 'facebook',
          vn: 100_000,
          global: 40_000,
          doda: 10_000,
          posts_vn: 100,
          posts_global: 40,
          posts_doda: 10,
        },
        {
          platform: 'instagram',
          vn: 50_000,
          global: 10_000,
          doda: 40_000,
          posts_vn: 50,
          posts_global: 10,
          posts_doda: 40,
        },
      ];

      const res = computeMarketTotals(sampleStats);

      expect(res.vn).toBe(150_000);
      expect(res.global).toBe(50_000);
      expect(res.doda).toBe(50_000);
      expect(res.total).toBe(250_000);

      expect(res.postsVn).toBe(150);
      expect(res.postsGlobal).toBe(50);
      expect(res.postsDoda).toBe(50);
      expect(res.totalPosts).toBe(250);

      expect(res.ratioVn).toBe(60);
      expect(res.ratioGlobal).toBe(20);
      expect(res.ratioDoda).toBe(20);

      expect(percent(res.ratioVn)).toBe('60,0%');
      expect(percent(res.ratioGlobal)).toBe('20,0%');
      expect(percent(res.ratioDoda)).toBe('20,0%');
    });

    it('tổng tỷ lệ của 3 phân khúc đạt đúng 100%', () => {
      const sampleStats: PlatformMarketStats[] = [
        {
          platform: 'facebook',
          vn: 155_868_319,
          global: 124_693_652,
          doda: 8_014_762,
          posts_vn: 16_364,
          posts_global: 6_921,
          posts_doda: 2_396,
        },
      ];

      const res = computeMarketTotals(sampleStats);
      const sumRatio = res.ratioVn + res.ratioGlobal + res.ratioDoda;
      expect(Math.round(sumRatio)).toBe(100);
      expect(res.totalPosts).toBe(25_681);
    });

    it('xử lý an toàn khi không có dữ liệu Đồ Da hoặc tổng bằng 0', () => {
      const emptyRes = computeMarketTotals([]);
      expect(emptyRes.total).toBe(0);
      expect(emptyRes.ratioVn).toBe(0);
      expect(emptyRes.ratioGlobal).toBe(0);
      expect(emptyRes.ratioDoda).toBe(0);

      const noDodaStats: PlatformMarketStats[] = [
        {
          platform: 'tiktok',
          vn: 800,
          global: 200,
          posts_vn: 8,
          posts_global: 2,
        },
      ];
      const noDodaRes = computeMarketTotals(noDodaStats);
      expect(noDodaRes.doda).toBe(0);
      expect(noDodaRes.postsDoda).toBe(0);
      expect(noDodaRes.ratioDoda).toBe(0);
      expect(noDodaRes.ratioVn).toBe(80);
      expect(noDodaRes.ratioGlobal).toBe(20);
    });
  });
});
