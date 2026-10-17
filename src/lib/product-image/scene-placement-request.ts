/**
 * Chế độ "Đặt SP vào cảnh" (tab Tạo hàng loạt, tính phí Gemini mỗi lượt): dựng form gửi
 * POST /product-image/scene-placement cho từng SP của lô.
 */
import { HELD_PRODUCT_NOTE_MAX_LENGTH, PRODUCT_NAME_MAX_LENGTH } from './held-product-request';

/** Tên field multipart — phải khớp FileFieldsInterceptor ở ProductImageController#scenePlacement. */
export const SCENE_PLACEMENT_FIELDS = {
  product: 'productImage',
  scene: 'sceneImage',
  productName: 'productName',
  note: 'note',
} as const;

export interface ScenePlacementInput {
  productImage: File;
  sceneImage: File;
  productName: string;
  note: string;
}

/** Thông báo lỗi tiếng Việt, hoặc null nếu đủ điều kiện gửi. */
export function validateScenePlacementInput(input: Pick<ScenePlacementInput, 'productName' | 'note'>): string | null {
  const productName = input.productName.trim();
  if (!productName) return 'Nhập tên sản phẩm — dùng để thống kê chi phí theo từng sản phẩm.';
  if (productName.length > PRODUCT_NAME_MAX_LENGTH) return `Tên sản phẩm tối đa ${PRODUCT_NAME_MAX_LENGTH} ký tự.`;
  if (input.note.trim().length > HELD_PRODUCT_NOTE_MAX_LENGTH) return `Ghi chú tối đa ${HELD_PRODUCT_NOTE_MAX_LENGTH} ký tự.`;
  return null;
}

/**
 * Form multipart cho một SP. Ghi chú rỗng thì KHÔNG gửi field `note` (ValidationPipe của BE bật
 * forbidNonWhitelisted — chỉ được gửi đúng các field DTO khai báo).
 */
export function buildScenePlacementFormData(input: ScenePlacementInput): FormData {
  const error = validateScenePlacementInput(input);
  if (error) throw new Error(error);
  const form = new FormData();
  form.append(SCENE_PLACEMENT_FIELDS.product, input.productImage);
  form.append(SCENE_PLACEMENT_FIELDS.scene, input.sceneImage);
  form.append(SCENE_PLACEMENT_FIELDS.productName, input.productName.trim());
  const note = input.note.trim();
  if (note) form.append(SCENE_PLACEMENT_FIELDS.note, note);
  return form;
}
