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
  USED: { label: 'Tốt', tone: 'good' },
  NEEDS_CHECK: { label: 'Bảo trì', tone: 'check' },
  BROKEN: { label: 'Hỏng', tone: 'broken' },
  IN_MAINTENANCE: { label: 'Bảo trì', tone: 'check' },
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

/**
 * Ba mức người dùng CHỌN được. Enum của BE có năm giá trị nhưng `USED` và `IN_MAINTENANCE` được
 * gộp nhãn với `GOOD` và `NEEDS_CHECK` cho gọn — kho không cần phân biệt ở mức thao tác.
 */
export const CONDITION_OPTIONS = [
  { value: 'GOOD', label: 'Tốt' },
  { value: 'NEEDS_CHECK', label: 'Bảo trì' },
  { value: 'BROKEN', label: 'Hỏng' },
];

/**
 * Lựa chọn cho ô Tình trạng ở form sửa, có tính tới giá trị máy ĐANG mang.
 *
 * Ba mức chọn được không phủ hết enum: màn Bàn giao luôn ghi `USED`, còn màn Kiểm tra ghi được
 * `IN_MAINTENANCE`. Đưa thẳng `CONDITION_OPTIONS` vào ô select thì một chiếc máy vừa bàn giao
 * xong mở form ra sẽ không có option nào khớp — trình duyệt hiện ô trống hoặc nhảy về mục đầu,
 * và người dùng đọc sai tình trạng thật của máy.
 *
 * Cùng một luật với `manualStatusOptionsFor`: giá trị ĐANG CÓ đứng đầu, rồi tới những đích
 * chọn được.
 */
export function conditionOptionsFor(currentCondition: string): { value: string; label: string }[] {
  const targets = CONDITION_OPTIONS.filter((o) => o.value !== currentCondition);
  if (!currentCondition) return targets;
  return [{ value: currentCondition, label: conditionLabel(currentCondition).label }, ...targets];
}
