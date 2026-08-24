/**
 * Enum `position` khớp đúng `IdPhotoPosition` bên BE (prisma/schema.prisma) — 5 giá trị theo
 * Ý NGHĨA NGHIỆP VỤ, không phải tên màu. Màu khung chỉ là dữ liệu HIỂN THỊ ở tầng FE này,
 * KHÔNG lưu xuống DB (đổi màu sau này chỉ cần sửa file này, không cần migration).
 */
export type IdPhotoPosition = 'NEW_STAFF_1_3M' | 'STAFF_OVER_3M' | 'LEADER' | 'MANAGER' | 'BOD';

export type IdPhotoStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface PositionOption {
  value: IdPhotoPosition;
  label: string;
  /** Màu khung/nền thẻ khi xuất PDF — khớp đúng FRAME_COLOR_BY_POSITION bên
   * AutomationGenVideo_BE/src/modules/id-photo/id-photo.service.ts, sửa 1 bên nhớ sửa bên kia. */
  color: string;
}

/**
 * Thứ tự đúng do nghiệp vụ chốt: Trắng / Vàng / Xanh / Đỏ / Đen theo đúng thứ tự cấp bậc
 * bên dưới. ĐỪNG suy mapping này ra từ dải màu trang trí trong mockup thiết kế — đã từng
 * đảo nhầm STAFF_OVER_3M ↔ LEADER vì đọc theo mockup, phải sửa lại sau khi test thật.
 * Bản sao ở BE: id-photo.service.ts#FRAME_COLOR_BY_POSITION — sửa 1 bên phải sửa bên kia.
 */
export const POSITION_OPTIONS: PositionOption[] = [
  { value: 'NEW_STAFF_1_3M', label: 'Nhân viên chính thức (1-3 tháng)', color: '#FFFFFF' },
  { value: 'STAFF_OVER_3M', label: 'Nhân viên chính thức (trên 3 tháng)', color: '#F5C518' },
  { value: 'LEADER', label: 'Leader', color: '#2563EB' },
  { value: 'MANAGER', label: 'Quản lý', color: '#DC2626' },
  { value: 'BOD', label: 'BOD', color: '#111827' },
];

export function getPositionOption(value: IdPhotoPosition | string): PositionOption {
  return POSITION_OPTIONS.find((p) => p.value === value) ?? POSITION_OPTIONS[0];
}

/**
 * Pha màu sáng/tối để dựng gradient nền thẻ. `ratio` > 0 kéo về trắng, < 0 kéo về đen.
 *
 * BẢN SAO CÓ CHỦ Ý của IdPhotoService.shadeHex bên BE (id-photo.service.ts) — preview và PDF
 * phải ra đúng cùng một dải màu, nên công thức bắt buộc giống hệt. Sửa một bên thì phải sửa
 * bên kia, cùng nguyên tắc đã áp dụng cho hệ toạ độ 420×669.
 */
export function shadeHex(hex: string, ratio: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (c: number) =>
    Math.round(ratio >= 0 ? c + (255 - c) * ratio : c * (1 + ratio))
      .toString(16)
      .padStart(2, '0');
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

/** Cặp màu gradient nền theo cấp bậc: sáng ở đỉnh, đậm dần xuống đáy (khớp gradientStops ở BE). */
export function getGradientStops(base: string): { top: string; bottom: string } {
  // Nền Trắng không sáng hơn được nữa — đổi hướng sang trắng → xám rất nhạt, nếu không thì
  // hai điểm dừng trùng nhau và gradient mất tác dụng.
  if (base.toUpperCase() === '#FFFFFF') return { top: '#FFFFFF', bottom: '#ECEDEF' };
  return { top: shadeHex(base, 0.18), bottom: shadeHex(base, -0.16) };
}

// Giới hạn ảnh gốc — phải khớp đúng limits.fileSize của FileInterceptor ở BE
// (id-photo.controller.ts). Lệch nhau sẽ dẫn tới FE cho qua nhưng BE vẫn từ chối.
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export interface IdPhotoHistoryItem {
  id: string;
  created_by: string;
  employee_name: string;
  employee_team: string;
  employee_id: string;
  position: IdPhotoPosition;
  status: IdPhotoStatus;
  error_message: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  createdByUser?: { id: string; full_name: string | null; email: string } | null;
}

/**
 * Payload của GET /id-photo/:id — dùng cho modal "Xem chi tiết" ở tab Lịch sử.
 *
 * Khác IdPhotoHistoryItem đúng một field: `processed_image_data` (ảnh đã ghép áo, base64 data
 * URI) để dựng lại khung thẻ ngay trong modal. BE cố ý KHÔNG trả ảnh gốc — tối đa 10MB, base64
 * hoá thành ~13MB, mà modal không dùng đến. Null với bản ghi chưa ghép áo xong (FAILED/PENDING).
 */
export interface IdPhotoDetailItem extends IdPhotoHistoryItem {
  employee_title_prefix: string | null;
  processed_image_data: string | null;
}

export interface IdPhotoHistoryDetail extends IdPhotoHistoryItem {
  raw_image_data: string;
  processed_image_data: string | null;
}
