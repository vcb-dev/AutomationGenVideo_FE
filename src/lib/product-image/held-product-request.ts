/**
 * Chế độ "Chị Nhạm cầm SP" (tính phí Gemini mỗi lượt): dựng form gửi BE và kiểm đầu vào trước
 * khi hỏi xác nhận chi phí — thiếu ảnh thì chặn ngay, không để người dùng bấm xác nhận rồi mới
 * bị BE từ chối.
 */

/** Khớp HELD_PRODUCT_NOTE_MAX_LENGTH ở BE (dto/held-product.dto.ts) và AI service. */
export const HELD_PRODUCT_NOTE_MAX_LENGTH = 500;

/** Tên field multipart — phải khớp FileFieldsInterceptor ở ProductImageController. */
export const HELD_PRODUCT_FIELDS = {
  person: 'personImage',
  product: 'productImage',
  note: 'note',
} as const;

export interface HeldProductInput {
  personImage: File | null;
  productImage: File | null;
  note: string;
}

/** Thông báo lỗi tiếng Việt, hoặc null nếu đủ điều kiện gửi. */
export function validateHeldProductInput(input: HeldProductInput): string | null {
  if (!input.personImage) return 'Chưa chọn ảnh chị Nhạm đang cầm sản phẩm.';
  if (!input.productImage) return 'Chưa chọn ảnh sản phẩm mới.';
  if (input.note.trim().length > HELD_PRODUCT_NOTE_MAX_LENGTH) {
    return `Ghi chú tối đa ${HELD_PRODUCT_NOTE_MAX_LENGTH} ký tự.`;
  }
  return null;
}

/**
 * Form multipart gửi POST /product-image/held-product. Ghi chú rỗng thì KHÔNG gửi field `note`
 * (ValidationPipe của BE bật forbidNonWhitelisted — chỉ được gửi đúng các field DTO khai báo).
 */
export function buildHeldProductFormData(input: HeldProductInput): FormData {
  const error = validateHeldProductInput(input);
  if (error) throw new Error(error);
  const form = new FormData();
  form.append(HELD_PRODUCT_FIELDS.person, input.personImage as File);
  form.append(HELD_PRODUCT_FIELDS.product, input.productImage as File);
  const note = input.note.trim();
  if (note) form.append(HELD_PRODUCT_FIELDS.note, note);
  return form;
}

/** Phần mở rộng file tải về theo mime ảnh AI trả (Gemini có thể trả JPEG, không chỉ PNG). */
export function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'png';
  }
}
