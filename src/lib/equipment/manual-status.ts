import { statusLabel } from './status-label';

/**
 * Trạng thái nào đặt tay được trong form sửa thiết bị.
 *
 * Cho phép chỉnh: Sẵn sàng, Bảo trì, Hỏng, Mất.
 */
const MANUAL_TARGETS = ['AVAILABLE', 'UNDER_MAINTENANCE', 'BROKEN', 'LOST'];

/**
 * Trạng thái do quy trình đặt — rời khỏi chúng phải đi bằng màn riêng, không sửa tay.
 *
 * Phải KHỚP với `WORKFLOW_ONLY_STATUSES` bên BE. Lệch là hoặc hiện nút rồi bấm vào ăn 400,
 * hoặc giấu mất lựa chọn hợp lệ.
 */
const WORKFLOW_ONLY_STATUSES = ['ON_LOAN', 'POST_RETURN_CHECK'];

/**
 * Lối duy nhất còn lại: đánh dấu Mất.
 *
 * `ON_LOAN` rời bằng màn Nhận trả, `POST_RETURN_CHECK` rời bằng màn Kiểm tra — nhưng cả hai màn
 * đó đều không có kết luận "Mất", nên chiếc không bao giờ quay về vẫn cần lối này.
 */
const TARGETS_WHILE_IN_WORKFLOW = ['LOST'];

export interface StatusOption {
  value: string;
  label: string;
}

/**
 * Danh sách cho ô select: trạng thái ĐANG CÓ đứng đầu, rồi tới những đích đặt tay được.
 */
export function manualStatusOptionsFor(currentStatus: string): StatusOption[] {
  const targets = WORKFLOW_ONLY_STATUSES.includes(currentStatus)
    ? TARGETS_WHILE_IN_WORKFLOW
    : MANUAL_TARGETS;
  const values = [currentStatus, ...targets.filter((t) => t !== currentStatus)];

  return values.map((value) => ({ value, label: statusLabel(value).label }));
}

/**
 * Gợi ý nghiệp vụ cho các trạng thái quy trình khác.
 */
export function statusDoorHints(): string[] {
  return [
    'Sẵn sàng — thiết bị có thể cho mượn ngay.',
    'Bảo trì — thiết bị đang gửi bảo dưỡng / sửa chữa.',
    'Hỏng / Mất — ghi nhận thiết bị gặp sự cố.',
    'Đang mượn — sinh ra khi lập biên bản Bàn giao; rời trạng thái này bằng màn Nhận trả.',
    'Kiểm tra sau trả — sinh ra từ màn Nhận trả; kết luận ở màn Kiểm tra thiết bị.',
    'Đã thanh lý — dùng nút Xoá thiết bị.',
  ];
}
