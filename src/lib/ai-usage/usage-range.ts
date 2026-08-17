/**
 * Khoảng ngày lọc của trang Tổng quan Tiện ích AI.
 *
 * Tách khỏi component vì mốc ngày phải theo lịch địa phương: toISOString() trả giờ UTC,
 * nên ở VN mọi thời điểm trước 07:00 sáng sẽ bị lùi mất một ngày.
 */

export type RangePresetId = 'today' | 'last7' | 'last30' | 'this_month';

export interface DateRange {
    from: string;
    to: string;
}

/** YYYY-MM-DD theo lịch máy người dùng — KHÔNG dùng toISOString(). */
export function toDateInput(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

export const RANGE_PRESETS: { id: RangePresetId; label: string }[] = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'last7', label: '7 ngày' },
    { id: 'last30', label: '30 ngày' },
    { id: 'this_month', label: 'Tháng này' },
];

/** `now` truyền vào được để test không phụ thuộc ngày chạy. */
export function resolvePreset(preset: RangePresetId, now: Date = new Date()): DateRange {
    const to = toDateInput(now);
    switch (preset) {
        case 'today':
            return { from: to, to };
        case 'last7': {
            const from = new Date(now);
            // Tính cả hôm nay nên lùi 6 ngày, không phải 7.
            from.setDate(from.getDate() - 6);
            return { from: toDateInput(from), to };
        }
        case 'last30': {
            const from = new Date(now);
            from.setDate(from.getDate() - 29);
            return { from: toDateInput(from), to };
        }
        case 'this_month':
            return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to };
    }
}

/** Preset khớp với khoảng đang chọn, để tô sáng đúng nút; tự nhập tay thì trả null. */
export function matchPreset(range: DateRange, now: Date = new Date()): RangePresetId | null {
    return (
        RANGE_PRESETS.find((preset) => {
            const resolved = resolvePreset(preset.id, now);
            return resolved.from === range.from && resolved.to === range.to;
        })?.id ?? null
    );
}

/** Người nhập ngược thì đảo lại, để không gửi khoảng rỗng lên API. */
export function normalizeRange(range: DateRange): DateRange {
    if (range.from && range.to && range.from > range.to) {
        return { from: range.to, to: range.from };
    }
    return range;
}

export function formatRangeLabel(range: DateRange): string {
    const vn = (value: string) => value.split('-').reverse().join('/');
    if (!range.from && !range.to) return 'toàn bộ';
    if (range.from === range.to) return vn(range.from);
    return `${vn(range.from)} – ${vn(range.to)}`;
}
