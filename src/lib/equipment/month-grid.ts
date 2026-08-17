/**
 * Lưới ngày của một tháng, dùng cho bộ chọn ngày tự viết.
 *
 * Tuần bắt đầu từ THỨ HAI theo lịch Việt Nam. `Date.getDay()` của JavaScript trả 0 cho Chủ nhật,
 * dùng thẳng con số đó là cả tháng lệch đi một cột — đây là lỗi kinh điển của lịch tự viết và
 * nhìn bằng mắt rất khó phát hiện.
 *
 * Ô của tháng trước/sau vẫn mang số ngày thật (hiện mờ) chứ không để trống: người dùng định vị
 * bằng chúng, bảng trống trơn ở hai đầu nhìn rời rạc.
 */

export interface MonthCell {
  day: number;
  inMonth: boolean;
  /** Dạng YYYY-MM-DD để gán thẳng vào giá trị bộ lọc, khỏi tự ghép chuỗi ở nơi dùng. */
  iso: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Thứ trong tuần theo kiểu Việt Nam: thứ Hai = 0 … Chủ nhật = 6. */
function mondayFirstIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * @param year năm đầy đủ, ví dụ 2026
 * @param month tháng theo cách người đọc hiểu: 1 = tháng Một (KHÔNG phải 0 như Date của JS)
 */
export function buildMonthGrid(year: number, month: number): MonthCell[][] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const lead = mondayFirstIndex(first);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const cells: MonthCell[] = [];

  for (let i = lead; i > 0; i--) {
    const day = daysInPrevMonth - i + 1;
    cells.push({ day, inMonth: false, iso: iso(prevYear, prevMonth, day) });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, inMonth: true, iso: iso(year, month, day) });
  }
  // Bù cho đủ tuần cuối — thiếu ô thì bảng vỡ hàng.
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay, inMonth: false, iso: iso(nextYear, nextMonth, nextDay) });
    nextDay += 1;
  }

  const weeks: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
