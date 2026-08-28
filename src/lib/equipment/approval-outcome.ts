/**
 * Ký xong một phiếu thì màn hình nói gì và dẫn đi đâu.
 *
 * Tách khỏi trang để test được mà không dựng React. Ba kết cục rất dễ lẫn:
 *   - đủ chữ ký      → phiếu sang bước chuẩn bị máy, dẫn thẳng người ký sang đó
 *   - mới ký cấp một → KHÔNG còn việc gì cho người vừa ký, phải chờ admin
 *   - từ chối        → phiếu đóng, giữ chỗ đã nhả
 *
 * Không phân biệt được thì người ký đứng nhìn một màn hình gần như không đổi và tưởng nút
 * duyệt hỏng — đúng cái đang xảy ra trước khi có hàm này.
 */

export interface DecidedRequest {
  id: string;
  request_code: string;
  status: string;
  approved_levels: number;
  required_levels: number;
  next_approver_role: string | null;
}

export type ApprovalOutcome =
  | { kind: 'ready-to-prepare'; message: string; nextHref: string }
  | { kind: 'waiting-next-level'; message: string }
  | { kind: 'rejected'; message: string }
  | { kind: 'unknown'; message: string };

/** Phiếu đã qua cửa duyệt. `PREPARING` cũng tính: người khác ký trước và đã gán máy rồi. */
const PAST_APPROVAL = ['APPROVED', 'PREPARING'];

export function approvalOutcome(request: DecidedRequest): ApprovalOutcome {
  if (PAST_APPROVAL.includes(request.status)) {
    return {
      kind: 'ready-to-prepare',
      message: `Đã duyệt xong phiếu ${request.request_code}. Bước tiếp theo là gán máy cụ thể.`,
      // Gắn id vào đường dẫn: màn chuẩn bị mặc định lấy phiếu đầu danh sách, không gắn thì
      // người ký sang tới nơi lại đang soạn một phiếu khác.
      nextHref: `/dashboard/equipment/prepare?request=${request.id}`,
    };
  }

  if (request.status === 'REJECTED') {
    return {
      kind: 'rejected',
      message: `Đã từ chối phiếu ${request.request_code}. Giữ chỗ của phiếu đã được nhả ra.`,
    };
  }

  if (request.status === 'PENDING_APPROVAL') {
    const role = request.next_approver_role ?? 'cấp tiếp theo';
    return {
      kind: 'waiting-next-level',
      message: `Đã ký ${request.approved_levels}/${request.required_levels} cấp cho phiếu ${request.request_code}. Chờ ${role} ký nốt — bạn không còn việc gì ở phiếu này.`,
    };
  }

  return {
    kind: 'unknown',
    message: `Phiếu ${request.request_code} đang ở trạng thái ${request.status}.`,
  };
}
