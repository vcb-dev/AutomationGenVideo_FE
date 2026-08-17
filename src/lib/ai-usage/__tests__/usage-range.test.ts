import {
    formatRangeLabel,
    matchPreset,
    normalizeRange,
    resolvePreset,
    toDateInput,
} from '../usage-range';

/** Cố định "hôm nay" để test không đổi kết quả theo ngày chạy CI. */
const NOW = new Date(2026, 7, 16, 3, 0, 0); // 16/08/2026, 03:00 sáng giờ máy

describe('toDateInput', () => {
    it('lấy ngày theo lịch máy, không lệch sang hôm trước như toISOString', () => {
        // 03:00 giờ VN = 20:00 hôm trước theo UTC — toISOString() sẽ trả 2026-08-15.
        expect(toDateInput(NOW)).toBe('2026-08-16');
    });

    it('đệm 0 cho tháng và ngày một chữ số', () => {
        expect(toDateInput(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
});

describe('resolvePreset', () => {
    it('Hôm nay trả về khoảng một ngày', () => {
        expect(resolvePreset('today', NOW)).toEqual({ from: '2026-08-16', to: '2026-08-16' });
    });

    it('7 ngày tính cả hôm nay nên lùi 6 ngày', () => {
        expect(resolvePreset('last7', NOW)).toEqual({ from: '2026-08-10', to: '2026-08-16' });
    });

    it('30 ngày tính cả hôm nay nên lùi 29 ngày, bắc qua đầu tháng', () => {
        expect(resolvePreset('last30', NOW)).toEqual({ from: '2026-07-18', to: '2026-08-16' });
    });

    it('Tháng này bắt đầu từ mùng 1', () => {
        expect(resolvePreset('this_month', NOW)).toEqual({ from: '2026-08-01', to: '2026-08-16' });
    });
});

describe('matchPreset', () => {
    it('nhận ra khoảng đang chọn trùng một preset', () => {
        expect(matchPreset({ from: '2026-08-01', to: '2026-08-16' }, NOW)).toBe('this_month');
    });

    it('trả null khi người dùng tự nhập khoảng khác', () => {
        expect(matchPreset({ from: '2026-08-03', to: '2026-08-09' }, NOW)).toBeNull();
    });
});

describe('normalizeRange', () => {
    it('đảo lại khi người dùng chọn ngày bắt đầu sau ngày kết thúc', () => {
        expect(normalizeRange({ from: '2026-08-20', to: '2026-08-01' })).toEqual({
            from: '2026-08-01',
            to: '2026-08-20',
        });
    });

    it('giữ nguyên khoảng đã đúng thứ tự', () => {
        const range = { from: '2026-08-01', to: '2026-08-20' };
        expect(normalizeRange(range)).toEqual(range);
    });
});

describe('formatRangeLabel', () => {
    it('gộp lại thành một ngày khi from trùng to', () => {
        expect(formatRangeLabel({ from: '2026-08-16', to: '2026-08-16' })).toBe('16/08/2026');
    });

    it('hiển thị kiểu ngày/tháng/năm cho khoảng nhiều ngày', () => {
        expect(formatRangeLabel({ from: '2026-08-01', to: '2026-08-16' })).toBe(
            '01/08/2026 – 16/08/2026',
        );
    });
});
