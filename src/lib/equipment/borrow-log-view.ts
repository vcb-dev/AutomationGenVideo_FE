import { apiErrorMessage } from './api-error';

export type BorrowLogView = 'ASSET' | 'REQUEST';

/**
 * Bấm một nút lọc nhanh thì về bảng PHIẾU — mọi nút lọc nhanh, kể cả "Tất cả", đều đếm phiếu.
 *
 * Khi đi từ bảng thiết bị sang phải xoá luôn bộ lọc trạng thái: hai bảng dùng hai bộ trạng thái
 * khác nhau (thiết bị: HOLDING/OVERDUE/RETURNED, phiếu: PENDING_APPROVAL/CLOSED…). Giữ lại
 * `HOLDING` thì bảng phiếu lọc theo một trạng thái phiếu không hề có → trống trơn, trong khi ô
 * chọn lại hiện "Tất cả trạng thái".
 */
export function viewForQuickFilter(current: BorrowLogView): {
  viewMode: BorrowLogView;
  resetStatus: boolean;
} {
  return { viewMode: 'REQUEST', resetStatus: current !== 'REQUEST' };
}

/**
 * Câu báo lỗi khi tải màn Nhật ký mượn.
 *
 * - 403: quản lý kho thì nhắc mục này dành cho ai; thành viên thường đang ở chính trang "Phiếu
 *   của tôi" nên câu "chỉ dành cho Leader Media" là sai và gây hoảng.
 * - Không tới được máy chủ: nói đúng là mất kết nối (câu sẵn có của `apiErrorMessage`).
 * - Còn lại: câu chung theo từng loại dữ liệu.
 */
export function borrowLogLoadError(
  error: unknown,
  opts: { isManager: boolean; fallback: string },
): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) {
    return opts.isManager
      ? 'Mục này chỉ dành cho quản trị viên và Leader Media.'
      : 'Bạn không có quyền xem danh sách phiếu mượn. Đăng nhập lại hoặc liên hệ quản trị viên.';
  }
  if (status === undefined) return apiErrorMessage(error, opts.fallback);
  return opts.fallback;
}
