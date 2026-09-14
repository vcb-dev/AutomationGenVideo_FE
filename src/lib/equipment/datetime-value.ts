/**
 * Tách và ghép giá trị `YYYY-MM-DDTHH:mm` — đúng định dạng của `<input type="datetime-local">`.
 *
 * Giữ nguyên định dạng đó là có chủ đích: phần còn lại của màn Tạo phiếu đã dựng trên nó
 * (`new Date(fromTime)` để so khoảng, `.toISOString()` lúc gửi). Đổi định dạng ở đây là phải sửa
 * theo cả chuỗi, và mỗi chỗ quên sửa là một lỗi múi giờ lệch đúng 7 tiếng — thứ chỉ lộ ra khi có
 * người mượn máy lúc sáng sớm.
 *
 * Cố ý KHÔNG dùng `new Date()` để tách: `new Date('2026-09-10T08:00')` hiểu theo giờ máy, rồi
 * `getHours()` trả về giờ máy — vòng qua Date là mở đường cho lệch múi giờ ở chỗ không cần thiết.
 * Chuỗi vào, chuỗi ra, không đụng tới Date.
 */

export interface DateTimeParts {
  /** `YYYY-MM-DD`, rỗng nghĩa là chưa chọn ngày. */
  date: string;
  /** `HH:mm`, rỗng nghĩa là chưa chọn giờ. */
  time: string;
}

export function splitDateTime(value: string | undefined | null): DateTimeParts {
  if (!value) return { date: '', time: '' };

  const [date = '', rest = ''] = value.split('T');
  // Cắt bỏ giây nếu có: vài trình duyệt trả `HH:mm:ss` khi người dùng gõ tay.
  const time = rest.slice(0, 5);
  return { date, time };
}

/**
 * Ghép lại thành giá trị hoàn chỉnh.
 *
 * Thiếu một trong hai thì trả chuỗi rỗng chứ không ghép nửa vời: `2026-09-10T` là giá trị mà
 * `new Date()` đọc ra `Invalid Date`, và cái đó chảy thẳng vào `toISOString()` lúc gửi phiếu rồi
 * nổ ở chỗ không liên quan gì tới ô nhập.
 */
export function joinDateTime(date: string, time: string): string {
  if (!date || !time) return '';
  return `${date}T${time}`;
}

/**
 * Danh sách giờ cho ô chọn, cách nhau `stepMinutes` phút.
 *
 * 30 phút là bước mặc định: kho giao nhận máy theo ca chứ không theo phút, mà 15 phút thì danh
 * sách dài gấp đôi và người dùng phải cuộn lâu hơn để tới giờ mình cần.
 */
export function timeOptions(stepMinutes = 30): string[] {
  const options: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    options.push(`${hh}:${mm}`);
  }
  return options;
}

/**
 * Giờ đang chọn có nằm ngoài danh sách không.
 *
 * Phiếu cũ hoặc người dùng gõ tay có thể cho ra `08:17`. Không nhận ra ca đó thì ô select rơi về
 * lựa chọn đầu danh sách và **âm thầm đổi giờ của phiếu** ngay khi mở form ra xem.
 */
export function isOffGridTime(time: string, stepMinutes = 30): boolean {
  if (!time) return false;
  return !timeOptions(stepMinutes).includes(time);
}
