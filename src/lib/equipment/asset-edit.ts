import { UpdateAssetPayload } from './api';

/**
 * Dựng payload sửa thiết bị và quyết định máy nào xoá được.
 *
 * Tách khỏi dialog để test được mà không phải dựng React: đây là chỗ dễ sai nhất của cả màn —
 * gửi thừa một trường thì ghi đè giá trị người khác vừa sửa, gửi thiếu thì người dùng bấm Lưu
 * mà không thấy gì đổi.
 */

/** Ảnh chụp máy ở mức mà form sửa cần biết. Trùng phần lõi của `Asset` trong `api.ts`. */
export interface EditableAsset {
  asset_code: string;
  serial_number: string;
  status: string;
  condition: string;
  model: { id: string };
  location: { id: string } | null;
}

export interface AssetEditForm {
  modelId: string;
  serialNumber: string;
  /** Chuỗi rỗng nghĩa là người dùng chọn "chưa xếp chỗ". */
  locationId: string;
  condition: string;
  status: string;
  note: string;
}

/**
 * Chỉ gửi những trường THẬT SỰ đổi.
 *
 * Gửi cả form thì mỗi lần bấm Lưu đều ghi đè mọi cột bằng chính giá trị cũ — vô hại khi chỉ có
 * một người sửa, nhưng hai thủ kho mở cùng một máy thì người lưu sau xoá mất sửa của người
 * lưu trước dù hai người động vào hai ô khác nhau.
 */
export function buildUpdatePayload(
  asset: EditableAsset,
  form: AssetEditForm,
): UpdateAssetPayload {
  const payload: UpdateAssetPayload = {};

  if (form.modelId && form.modelId !== asset.model.id) payload.modelId = form.modelId;

  const serial = form.serialNumber.trim();
  if (serial && serial !== asset.serial_number) payload.serialNumber = serial;

  // Vị trí so theo id hiện tại; máy chưa xếp chỗ mà vẫn để trống thì không có gì để gửi.
  const currentLocationId = asset.location?.id ?? '';
  if (form.locationId !== currentLocationId) payload.locationId = form.locationId;

  if (form.condition && form.condition !== asset.condition) payload.condition = form.condition;
  if (form.status && form.status !== asset.status) payload.status = form.status;

  const note = form.note.trim();
  if (note) payload.note = note;

  return payload;
}

/**
 * Trạng thái không cho xoá, kèm câu giải thích hiện thẳng cho người dùng.
 *
 * Cửa canh thật nằm ở BE (`deleteAsset` ném 409). Chặn thêm ở đây là để nói được LÝ DO ngay
 * lúc người ta định bấm, thay vì để họ xác nhận xong mới ăn lỗi.
 */
const DELETE_BLOCKERS: Record<string, string> = {
  ON_LOAN: 'Thiết bị đang được mượn, phải nhận lại trước khi xoá.',
  POST_RETURN_CHECK:
    'Thiết bị đang chờ kiểm tra sau trả. Kết luận kiểm tra xong mới xoá được — xoá lúc này là mất manh mối của lần hỏng gần nhất.',
  DISPOSED: 'Thiết bị đã thanh lý rồi.',
};

export function deleteBlockReason(asset: Pick<EditableAsset, 'status'>): string | null {
  return DELETE_BLOCKERS[asset.status] ?? null;
}
