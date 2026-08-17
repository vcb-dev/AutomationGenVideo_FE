/**
 * Dịch một lượt mượn thành dòng chữ thủ kho đọc được.
 *
 * Hai ca dễ lẫn mà hậu quả ngược hẳn nhau, nên cố ý cho KHÁC tông màu:
 *   - `RETURNED` kèm trễ → chuyện đã qua, máy đã về kho, chỉ để đánh giá ý thức giữ đồ
 *   - `OVERDUE`          → máy CÒN Ở NGOÀI và đã quá hạn, phải đi đòi ngay
 *
 * Cho chúng cùng một tông đỏ thì thủ kho hoặc bỏ sót máy đang mất, hoặc mất công đi đòi máy đã
 * nằm sẵn trên kệ.
 */

import type { StatusTone } from './status-label';

export interface BorrowHistoryLabelInput {
  status: 'HOLDING' | 'OVERDUE' | 'RETURNED' | 'UNKNOWN';
  heldDays: number | null;
  lateDays: number | null;
}

export interface BorrowHistoryLabel {
  text: string;
  tone: StatusTone;
}

export function borrowHistoryLabel(input: BorrowHistoryLabelInput): BorrowHistoryLabel {
  const { status, heldDays, lateDays } = input;

  // Thiếu mốc giao thì không bịa số ngày — thà nói không rõ còn hơn để người ta tin một con số sai.
  if (status === 'UNKNOWN' || heldDays === null) {
    return { text: 'Không rõ thời gian giữ', tone: 'wait' };
  }

  const held = `${heldDays} ngày`;

  if (status === 'OVERDUE') {
    return { text: `Quá hạn ${lateDays} ngày · đang giữ ${held}`, tone: 'bad' };
  }

  if (status === 'HOLDING') {
    return { text: `Đang giữ ${held}`, tone: 'busy' };
  }

  // Đã trả. Có trễ thì nêu, nhưng dùng tông nhắc nhở chứ không phải báo động.
  if (lateDays !== null && lateDays > 0) {
    return { text: `Đã trả sau ${held} · trễ ${lateDays} ngày`, tone: 'maint' };
  }

  return { text: `Đã trả sau ${held}`, tone: 'ok' };
}
