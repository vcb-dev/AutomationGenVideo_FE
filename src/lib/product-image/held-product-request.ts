/**
 * Chế độ "Chị Nhạm cầm SP" (tính phí Gemini mỗi lượt): dựng form gửi BE và kiểm đầu vào trước
 * khi hỏi xác nhận chi phí — thiếu ảnh thì chặn ngay, không để người dùng bấm xác nhận rồi mới
 * bị BE từ chối.
 */

/** Khớp HELD_PRODUCT_NOTE_MAX_LENGTH ở BE (dto/held-product.dto.ts) và AI service. */
export const HELD_PRODUCT_NOTE_MAX_LENGTH = 500;

/** Khớp PRODUCT_NAME_MAX_LENGTH ở BE — bắt buộc để tab Chi phí đếm lượt/tiền theo từng sản phẩm. */
export const PRODUCT_NAME_MAX_LENGTH = 200;

/** Tên field multipart — phải khớp FileFieldsInterceptor ở ProductImageController. */
export const HELD_PRODUCT_FIELDS = {
  person: 'personImage',
  product: 'productImage',
  productName: 'productName',
  note: 'note',
  widthCm: 'widthCm',
} as const;

/**
 * Bề ngang thật thân túi (cm) bắt buộc ở chế độ tự chọn tư thế — AI lấy bàn tay chị Nhạm làm thước để ghép túi đúng cỡ
 * (người dùng 15/10: "kích thước túi cần nhập mới biết được"). Khớp HELD_WIDTH_CM_MIN/MAX bên BE (dto/held-auto.dto.ts)
 * và SIZE_CM_RANGE của tab Ghép background.
 */
export const HELD_WIDTH_CM_RANGE = [6, 60] as const;

export interface HeldProductInput {
  personImage: File | null;
  productImage: File | null;
  productName: string;
  note: string;
}

/** Thông báo lỗi tiếng Việt, hoặc null nếu đủ điều kiện gửi. */
export function validateHeldProductInput(input: HeldProductInput): string | null {
  if (!input.personImage) return 'Chưa chọn ảnh chị Nhạm đang cầm sản phẩm.';
  if (!input.productImage) return 'Chưa chọn ảnh sản phẩm mới.';
  const productName = input.productName.trim();
  if (!productName) return 'Nhập tên sản phẩm — dùng để thống kê chi phí theo từng sản phẩm.';
  if (productName.length > PRODUCT_NAME_MAX_LENGTH) return `Tên sản phẩm tối đa ${PRODUCT_NAME_MAX_LENGTH} ký tự.`;
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
  form.append(HELD_PRODUCT_FIELDS.productName, input.productName.trim());
  const note = input.note.trim();
  if (note) form.append(HELD_PRODUCT_FIELDS.note, note);
  return form;
}

/**
 * Cách tạo ảnh ở tab "Chị Nhạm cầm SP":
 *  - auto (mặc định, 0đ): chỉ gửi ảnh SP mới — AI tự chọn các tư thế chị Nhạm hợp với dáng SP trong thư viện tư thế
 *    dựng sẵn rồi ghép, trả vài ảnh để chọn (người dùng 13/10).
 *  - swap (0đ): đổi SP trên MỘT ảnh chị Nhạm người dùng tự chọn.
 *  - gemini: tính phí mỗi lượt, có ghi chú cho AI và nút "Đạt".
 */
export type HeldProductMode = 'auto' | 'swap' | 'gemini';

/** Route BE theo cách tạo. */
export const HELD_PRODUCT_ENDPOINTS: Record<HeldProductMode, string> = {
  auto: '/product-image/held-auto',
  swap: '/product-image/held-swap',
  gemini: '/product-image/held-product',
};

/** Đổi SP 0đ chỉ cần 2 ảnh + tên SP (không có ghi chú — model đặt SP theo cỡ thân SP cũ, không đọc chữ). */
export function validateHeldSwapInput(input: Omit<HeldProductInput, 'note'>): string | null {
  return validateHeldProductInput({ ...input, note: '' });
}

/** Form multipart gửi POST /product-image/held-swap — đúng 3 field DTO khai báo (forbidNonWhitelisted). */
export function buildHeldSwapFormData(input: Omit<HeldProductInput, 'note'>): FormData {
  const error = validateHeldSwapInput(input);
  if (error) throw new Error(error);
  const form = new FormData();
  form.append(HELD_PRODUCT_FIELDS.person, input.personImage as File);
  form.append(HELD_PRODUCT_FIELDS.product, input.productImage as File);
  form.append(HELD_PRODUCT_FIELDS.productName, input.productName.trim());
  return form;
}

/** Tự chọn tư thế chỉ cần ảnh SP mới + tên SP. */
export type HeldAutoInput = Pick<HeldProductInput, 'productImage' | 'productName'> & { widthCm: number | null };

export function validateHeldAutoInput(input: HeldAutoInput): string | null {
  if (!input.productImage) return 'Chưa chọn ảnh sản phẩm mới.';
  const [min, max] = HELD_WIDTH_CM_RANGE;
  if (input.widthCm === null || !Number.isFinite(input.widthCm)) {
    return 'Nhập bề ngang túi (cm) — cần để ghép túi đúng cỡ vào tay chị Nhạm.';
  }
  if (input.widthCm < min || input.widthCm > max) return `Bề ngang túi phải từ ${min} đến ${max}cm.`;
  const productName = input.productName.trim();
  if (!productName) return 'Nhập tên sản phẩm — dùng để thống kê chi phí theo từng sản phẩm.';
  if (productName.length > PRODUCT_NAME_MAX_LENGTH) return `Tên sản phẩm tối đa ${PRODUCT_NAME_MAX_LENGTH} ký tự.`;
  return null;
}

/** Form multipart gửi POST /product-image/held-auto — đúng 3 field DTO khai báo (forbidNonWhitelisted). */
export function buildHeldAutoFormData(input: HeldAutoInput): FormData {
  const error = validateHeldAutoInput(input);
  if (error) throw new Error(error);
  const form = new FormData();
  form.append(HELD_PRODUCT_FIELDS.product, input.productImage as File);
  form.append(HELD_PRODUCT_FIELDS.productName, input.productName.trim());
  form.append(HELD_PRODUCT_FIELDS.widthCm, String(input.widthCm));
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
