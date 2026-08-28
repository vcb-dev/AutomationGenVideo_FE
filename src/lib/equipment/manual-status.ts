import { statusLabel } from './status-label';

/**
 * Trạng thái nào đặt tay được trong form sửa thiết bị.
 *
 * Bản sao của `asset-status-rules.ts` bên BE (`mems-catalog`). Cửa canh thật nằm ở đó — hàm này
 * chỉ để người dùng không chọn được thứ chắc chắn bị từ chối.
 *
 * Luật: sửa tay chỉ được SIẾT, không được NỚI. Ba đích dưới đây đều làm máy KÉM khả dụng đi,
 * nên siết nhầm thì bước kiểm tra gỡ lại được.
 */
const MANUAL_TARGETS = ['PENDING_INSPECTION', 'BROKEN', 'LOST'];

/** Máy đang ở ngoài thì chỉ đánh dấu Mất — thứ duy nhất xảy ra với chiếc không bao giờ quay về. */
const TARGETS_WHILE_ON_LOAN = ['LOST'];

export interface StatusOption {
  value: string;
  label: string;
}

/**
 * Danh sách cho ô select: trạng thái ĐANG CÓ đứng đầu, rồi tới những đích đặt tay được.
 *
 * Vế đầu bắt buộc phải có. Thiếu nó thì ô select nhảy về giá trị đầu danh sách, và người dùng
 * mở form ra sửa mỗi cái serial cũng vô tình lưu kèm một thay đổi trạng thái họ không hề chọn.
 */
export function manualStatusOptionsFor(currentStatus: string): StatusOption[] {
  const targets = currentStatus === 'ON_LOAN' ? TARGETS_WHILE_ON_LOAN : MANUAL_TARGETS;
  const values = [currentStatus, ...targets.filter((t) => t !== currentStatus)];

  return values.map((value) => ({ value, label: statusLabel(value).label }));
}

/**
 * Chỉ đúng cửa cho bốn trạng thái không đặt tay được.
 *
 * Nói "không được phép" mà không nói đi đâu thì người dùng đứng im rồi nhắn hỏi thủ kho — đúng
 * cái cảnh MEMS sinh ra để dẹp.
 */
export function statusDoorHints(): string[] {
  return [
    'Sẵn sàng — kết luận ở màn Kiểm tra.',
    'Đang mượn — lập biên bản ở màn Bàn giao.',
    'Bảo trì — đặt Chờ kiểm tra rồi kết luận ở màn Kiểm tra, đó là chỗ duy nhất sinh kèm lệnh bảo trì.',
    'Kiểm tra sau trả — sinh ra từ màn Nhận trả.',
    'Đã thanh lý — dùng nút Xoá thiết bị.',
  ];
}
