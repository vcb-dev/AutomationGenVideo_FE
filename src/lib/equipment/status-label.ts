/**
 * Bảng dịch enum của BE sang nhãn tiếng Việt, kèm tông màu.
 *
 * Trạng thái và Tình trạng là HAI trục khác nhau và phải hiện bằng hai kiểu khác nhau:
 * Trạng thái nói máy đang ở đâu trong quy trình, Tình trạng nói chất lượng vật lý của máy.
 * Trộn chúng vào một cột từng làm thủ kho hiểu nhầm máy "Bảo trì" là máy "Hỏng".
 */

export type StatusTone = 'ok' | 'busy' | 'maint' | 'bad' | 'wait';
export type ConditionTone = 'good' | 'used' | 'check' | 'broken';

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  AVAILABLE: { label: 'Sẵn sàng', tone: 'ok' },
  ON_LOAN: { label: 'Đang mượn', tone: 'busy' },
  PENDING_INSPECTION: { label: 'Chờ kiểm tra', tone: 'wait' },
  POST_RETURN_CHECK: { label: 'Kiểm tra sau trả', tone: 'wait' },
  UNDER_MAINTENANCE: { label: 'Bảo trì', tone: 'maint' },
  BROKEN: { label: 'Hỏng', tone: 'bad' },
  LOST: { label: 'Mất', tone: 'bad' },
  DISPOSED: { label: 'Đã thanh lý', tone: 'bad' },
};

const CONDITION: Record<string, { label: string; tone: ConditionTone }> = {
  GOOD: { label: 'Tốt', tone: 'good' },
  USED: { label: 'Có dấu hiệu sử dụng', tone: 'used' },
  NEEDS_CHECK: { label: 'Cần kiểm tra', tone: 'check' },
  BROKEN: { label: 'Hỏng', tone: 'broken' },
  // Máy đang nằm ở xưởng: tình trạng vật lý chưa kết luận được cho tới khi thợ trả lời.
  IN_MAINTENANCE: { label: 'Đang sửa chữa', tone: 'check' },
};

/** Enum lạ vẫn phải hiện ra được: thà thấy mã thô còn hơn thấy ô trống. */
export function statusLabel(status: string): { label: string; tone: StatusTone } {
  return STATUS[status] ?? { label: status, tone: 'wait' };
}

export function conditionLabel(condition: string): { label: string; tone: ConditionTone } {
  return CONDITION[condition] ?? { label: condition, tone: 'used' };
}

/** Danh sách cho dropdown lọc — giữ đúng thứ tự vòng đời của máy, không xếp theo bảng chữ cái. */
export const STATUS_OPTIONS = Object.keys(STATUS).map((value) => ({
  value,
  label: STATUS[value].label,
}));

export const CONDITION_OPTIONS = Object.keys(CONDITION).map((value) => ({
  value,
  label: CONDITION[value].label,
}));
