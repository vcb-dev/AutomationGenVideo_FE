/**
 * Khoảng ngày cho bộ lọc "Thống kê theo ngày": mọi giá trị là "YYYY-MM-DD" theo lịch máy người xem
 * (không qua toISOString — mốc 00:00 giờ VN là 17:00Z hôm trước, sẽ lùi 1 ngày). Tuần tính Thứ 2 → CN.
 */
export interface DayRange {
  from: string;
  to: string;
}

export interface MonthWeek {
  /** 1-based: Tuần 1 là tuần chứa ngày 1 của tháng (có thể ngắn hơn 7 ngày). */
  index: number;
  from: string;
  to: string;
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** Thứ 2 của tuần chứa ngày `s`. */
export function mondayOf(s: string): string {
  const dow = parseYmd(s).getDay(); // 0 = CN
  return addDays(s, dow === 0 ? -6 : 1 - dow);
}

/** Tuần này tính tới hôm nay (không kéo sang các ngày chưa tới). */
export function thisWeekRange(today: string): DayRange {
  return { from: mondayOf(today), to: today };
}

export function lastWeekRange(today: string): DayRange {
  const from = addDays(mondayOf(today), -7);
  return { from, to: addDays(from, 6) };
}

/** Các tuần (T2 → CN) của tháng "YYYY-MM", cắt theo ranh giới tháng — tuần đầu/cuối có thể ngắn. */
export function weeksOfMonth(month: string): MonthWeek[] {
  const [y, m] = month.split("-").map(Number);
  const first = ymd(new Date(y, m - 1, 1));
  const last = ymd(new Date(y, m, 0));
  const weeks: MonthWeek[] = [];
  let from = first;
  while (from <= last) {
    const sunday = addDays(mondayOf(from), 6);
    const to = sunday < last ? sunday : last;
    weeks.push({ index: weeks.length + 1, from, to });
    from = addDays(to, 1);
  }
  return weeks;
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function dmy(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

/** "Ngày 03/10/2026" | "29/09 – 03/10/2026" | "29/12/2025 – 04/01/2026". */
export function formatRangeLabel({ from, to }: DayRange): string {
  if (from === to) return `Ngày ${dmy(from)}`;
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${sameYear ? dmy(from).slice(0, 5) : dmy(from)} – ${dmy(to)}`;
}
