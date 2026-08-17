import { UsageByUser, rankUsage } from '../usage-ranking';

function user(overrides: Partial<UsageByUser> & { user_id: string }): UsageByUser {
    return {
        full_name: overrides.user_id,
        email: `${overrides.user_id}@vcbi.vn`,
        characters: 0,
        tts_count: 0,
        clone_count: 0,
        last_used_at: '2026-08-16T00:00:00.000Z',
        ...overrides,
    };
}

describe('rankUsage', () => {
    it('xếp từ dùng nhiều nhất xuống ít nhất kể cả khi API trả lộn xộn', () => {
        const ranked = rankUsage([
            user({ user_id: 'b', full_name: 'Bình', characters: 1000 }),
            user({ user_id: 'a', full_name: 'An', characters: 3000 }),
            user({ user_id: 'c', full_name: 'Cường', characters: 2000 }),
        ]);
        expect(ranked.map((r) => r.user_id)).toEqual(['a', 'c', 'b']);
        expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    });

    it('tính tỉ trọng theo tổng cả kỳ', () => {
        const ranked = rankUsage([
            user({ user_id: 'a', full_name: 'An', characters: 750 }),
            user({ user_id: 'b', full_name: 'Bình', characters: 250 }),
        ]);
        expect(ranked[0].share_percent).toBeCloseTo(75);
        expect(ranked[1].share_percent).toBeCloseTo(25);
    });

    it('bằng điểm thì cùng hạng, hạng kế tiếp bị nhảy số', () => {
        const ranked = rankUsage([
            user({ user_id: 'a', full_name: 'An', characters: 500 }),
            user({ user_id: 'b', full_name: 'Bình', characters: 500 }),
            user({ user_id: 'c', full_name: 'Cường', characters: 100 }),
        ]);
        expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
    });

    it('giữ nguyên tiền của từng người để bảng hiện đúng cột chi phí', () => {
        const ranked = rankUsage([
            user({ user_id: 'a', full_name: 'An', characters: 2000, cost_vnd: 1200 }),
        ]);
        expect(ranked[0].cost_vnd).toBe(1200);
    });

    it('không chia cho 0 khi cả kỳ chưa ai tiêu điểm', () => {
        const ranked = rankUsage([
            user({ user_id: 'a', full_name: 'An', characters: 0, clone_count: 2 }),
        ]);
        expect(ranked[0].share_percent).toBe(0);
    });

    it('trả mảng rỗng khi kỳ không có dữ liệu', () => {
        expect(rankUsage([])).toEqual([]);
    });

    it('không sửa mảng gốc', () => {
        const input = [
            user({ user_id: 'a', full_name: 'An', characters: 1 }),
            user({ user_id: 'b', full_name: 'Bình', characters: 9 }),
        ];
        rankUsage(input);
        expect(input.map((u) => u.user_id)).toEqual(['a', 'b']);
    });
});
