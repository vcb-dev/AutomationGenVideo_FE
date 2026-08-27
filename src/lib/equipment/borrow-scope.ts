import type { BorrowPurpose } from './api';

/**
 * Phạm vi mượn mà người dùng chọn trên form tạo phiếu.
 *
 * Ba lựa chọn ở form nhưng chỉ hai mục đích ở BE: `OUTSIDE` và `INTERNAL` đều là việc công ty,
 * chúng chỉ khác nhau ở chỗ có phải nhập địa điểm hay không. Thứ đổi luật duyệt là `PERSONAL`.
 */
export type BorrowScope = 'INTERNAL' | 'OUTSIDE' | 'PERSONAL';

export function scopeToPurpose(scope: BorrowScope): BorrowPurpose {
  return scope === 'PERSONAL' ? 'PERSONAL' : 'WORK';
}

/**
 * Phiếu có phải qua hai cấp (leader rồi admin) không.
 *
 * Dùng để báo trước cho người tạo phiếu. BE vẫn là nơi quyết định thật sự — xem
 * `planApprovals` trong approval-rules.ts.
 */
export function needsTwoApprovals(purpose: BorrowPurpose | undefined | null): boolean {
  return purpose === 'PERSONAL';
}
