import { ModelOption } from './group-models';

/**
 * Mỗi model chỉ được khai MỘT dòng trong phiếu mượn.
 *
 * Khả dụng được hỏi theo từng dòng, nên ba dòng cùng một model cùng nhận về "còn 1 máy" — không
 * dòng nào biết dòng trước đã nhận chiếc duy nhất đó — rồi cột tóm tắt cộng thành 3 máy cho model
 * chỉ có 1 chiếc. Cần nhiều máy cùng loại thì tăng số lượng của dòng, đúng ý đồ của form.
 *
 * BE cũng từ chối phiếu khai trùng model, nên đây là lớp chặn ở giao diện chứ không phải lớp duy
 * nhất: người dùng không bao giờ chọn được thứ mà server sẽ trả về lỗi.
 */

/** Model còn chọn được cho dòng thứ `lineIndex`, tính theo các model những dòng khác đã giữ. */
export function selectableModels(
  models: ModelOption[],
  lineModelIds: string[],
  lineIndex: number,
): ModelOption[] {
  const takenByOtherLines = new Set(
    lineModelIds.filter((id, i) => i !== lineIndex && !!id),
  );
  return models.filter((m) => !takenByOtherLines.has(m.id));
}

/**
 * Đã khai hết model đang có hay chưa.
 *
 * Dùng để khoá nút thêm dòng: không khoá thì người dùng bấm ra một dòng có đúng mỗi mục
 * "— Chọn model —" và không hiểu vì sao trống.
 */
export function noModelLeft(models: ModelOption[], lineModelIds: string[]): boolean {
  if (models.length === 0) return false;
  const taken = new Set(lineModelIds.filter(Boolean));
  return taken.size >= models.length;
}
