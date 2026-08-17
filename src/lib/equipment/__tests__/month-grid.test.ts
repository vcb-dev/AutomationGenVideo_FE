import { buildMonthGrid } from '../month-grid';

/**
 * Chức năng: dựng lưới ngày của một tháng cho bộ chọn ngày.
 *
 * Vì sao đáng một file test riêng: lưới lịch sai một ô là người dùng bấm nhầm ngày, mà nhìn
 * bằng mắt rất khó phát hiện. Ba chỗ dễ sai nhất:
 *   1. Tuần bắt đầu THỨ HAI (lịch Việt Nam), không phải Chủ nhật như mặc định của JavaScript
 *      — `getDay()` trả 0 cho Chủ nhật, dùng thẳng là lệch cả tháng đi một cột.
 *   2. Tháng 2 năm nhuận.
 *   3. Tháng bắt đầu đúng thứ Hai thì KHÔNG được chèn thừa một tuần trống ở đầu.
 */
describe('buildMonthGrid', () => {
  it('tuần bắt đầu từ thứ Hai, không phải Chủ nhật', () => {
    // 01/08/2026 là thứ Bảy → phải có 5 ô đệm trước nó (T2..T6)
    const grid = buildMonthGrid(2026, 8);

    expect(grid[0].slice(0, 5).every((cell) => cell.inMonth === false)).toBe(true);
    expect(grid[0][5]).toMatchObject({ day: 1, inMonth: true });
  });

  it('ngày cuối tháng nằm đúng chỗ', () => {
    const grid = buildMonthGrid(2026, 8);
    const all = grid.flat().filter((c) => c.inMonth);

    expect(all).toHaveLength(31);
    expect(all[all.length - 1].day).toBe(31);
  });

  it('tháng 2 năm nhuận có đủ 29 ngày', () => {
    const grid = buildMonthGrid(2024, 2);

    expect(grid.flat().filter((c) => c.inMonth)).toHaveLength(29);
  });

  it('tháng 2 năm thường có 28 ngày', () => {
    const grid = buildMonthGrid(2026, 2);

    expect(grid.flat().filter((c) => c.inMonth)).toHaveLength(28);
  });

  it('tháng bắt đầu đúng thứ Hai thì không chèn thừa tuần trống', () => {
    // 01/06/2026 là thứ Hai
    const grid = buildMonthGrid(2026, 6);

    expect(grid[0][0]).toMatchObject({ day: 1, inMonth: true });
  });

  it('mỗi tuần luôn đủ 7 ô để bảng không vỡ', () => {
    for (const [y, m] of [[2026, 1], [2026, 2], [2026, 8], [2024, 2]]) {
      const grid = buildMonthGrid(y, m);
      expect(grid.every((week) => week.length === 7)).toBe(true);
    }
  });

  it('ô đệm mang đúng ngày của tháng trước và tháng sau, không phải ô rỗng', () => {
    // Hiện ngày mờ giúp người dùng định vị, hơn là để trống trơn.
    const grid = buildMonthGrid(2026, 8);
    const before = grid[0].filter((c) => !c.inMonth);

    expect(before[0].day).toBe(27); // 27/07/2026 là thứ Hai
    expect(before.every((c) => c.day > 0)).toBe(true);
  });

  it('mỗi ô kèm chuỗi ngày dạng YYYY-MM-DD để gán thẳng vào giá trị lọc', () => {
    const grid = buildMonthGrid(2026, 8);
    const first = grid.flat().find((c) => c.inMonth && c.day === 1);

    expect(first?.iso).toBe('2026-08-01');
  });
});
