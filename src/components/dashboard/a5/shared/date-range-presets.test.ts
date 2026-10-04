import {
  addMonths,
  formatRangeLabel,
  lastWeekRange,
  mondayOf,
  thisWeekRange,
  weeksOfMonth,
} from './date-range-presets';

describe('date-range-presets — chọn nhanh theo tuần (T2 → CN)', () => {
  it('mondayOf: thứ 7 và chủ nhật đều thuộc tuần bắt đầu từ thứ 2 trước đó', () => {
    expect(mondayOf('2026-10-03')).toBe('2026-09-28'); // thứ 7
    expect(mondayOf('2026-10-04')).toBe('2026-09-28'); // chủ nhật
    expect(mondayOf('2026-10-05')).toBe('2026-10-05'); // thứ 2
  });

  it('tuần này chỉ tính tới hôm nay; tuần trước đủ T2 → CN, kể cả khi xuyên tháng', () => {
    expect(thisWeekRange('2026-10-03')).toEqual({ from: '2026-09-28', to: '2026-10-03' });
    expect(lastWeekRange('2026-10-03')).toEqual({ from: '2026-09-21', to: '2026-09-27' });
    expect(lastWeekRange('2026-01-05')).toEqual({ from: '2025-12-29', to: '2026-01-04' });
  });

  it('weeksOfMonth: tuần đầu/cuối cắt theo ranh giới tháng', () => {
    // 1/10/2026 là thứ 5.
    expect(weeksOfMonth('2026-10')).toEqual([
      { index: 1, from: '2026-10-01', to: '2026-10-04' },
      { index: 2, from: '2026-10-05', to: '2026-10-11' },
      { index: 3, from: '2026-10-12', to: '2026-10-18' },
      { index: 4, from: '2026-10-19', to: '2026-10-25' },
      { index: 5, from: '2026-10-26', to: '2026-10-31' },
    ]);
  });

  it('weeksOfMonth: tháng bắt đầu chủ nhật có tới 6 tuần, tuần 1 chỉ 1 ngày', () => {
    // 1/3/2026 là chủ nhật.
    const weeks = weeksOfMonth('2026-03');
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual({ index: 1, from: '2026-03-01', to: '2026-03-01' });
    expect(weeks[5]).toEqual({ index: 6, from: '2026-03-30', to: '2026-03-31' });
  });

  it('addMonths qua năm', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2025-12', 1)).toBe('2026-01');
  });

  it('formatRangeLabel: 1 ngày / cùng năm / khác năm', () => {
    expect(formatRangeLabel({ from: '2026-10-03', to: '2026-10-03' })).toBe('Ngày 03/10/2026');
    expect(formatRangeLabel({ from: '2026-09-28', to: '2026-10-03' })).toBe('28/09 – 03/10/2026');
    expect(formatRangeLabel({ from: '2025-12-29', to: '2026-01-04' })).toBe('29/12/2025 – 04/01/2026');
  });
});
