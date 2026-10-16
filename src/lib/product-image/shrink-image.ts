/**
 * Ảnh chụp máy ảnh của media thường 12–20MB, vượt giới hạn 10MB mỗi ảnh của BE (người dùng 13/10:
 * "thật sự không có ảnh nào dưới 10MB"). Thay vì bắt người dùng tự nén, trình duyệt nén lại ngay khi
 * chọn: giữ nguyên độ phân giải nếu được (chỉ nén lại JPEG), chưa vừa mới thu nhỏ dần. BE/AI giữ
 * nguyên giới hạn, tải lên cũng nhanh hơn.
 */
import { PRODUCT_IMAGE_MAX_BYTES, validateProductImageFile } from './upload-validation';

/** Chừa 5% so với giới hạn BE — multipart thêm vài trăm byte đầu/cuối. */
export const SHRINK_TARGET_BYTES = Math.floor(PRODUCT_IMAGE_MAX_BYTES * 0.95);

/** Hệ số cạnh lần lượt thử; 1 = giữ nguyên độ phân giải, chỉ nén lại. */
export const SHRINK_SCALES = [1, 0.85, 0.7, 0.6, 0.5, 0.4, 0.3] as const;

/** Chất lượng JPEG khi nén lại — mắt thường không phân biệt với ảnh gốc của máy ảnh. */
export const SHRINK_JPEG_QUALITY = 0.92;

export interface Size {
  width: number;
  height: number;
}

/**
 * Thử từng hệ số trong SHRINK_SCALES, trả bản mã hoá đầu tiên không quá `maxBytes` (null nếu thu
 * nhỏ hết cỡ vẫn không vừa). Tách khỏi canvas để test được.
 */
export async function shrinkUntilFits(
  size: Size,
  encode: (width: number, height: number) => Promise<Blob | null>,
  maxBytes = SHRINK_TARGET_BYTES,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  for (const scale of SHRINK_SCALES) {
    const width = Math.max(1, Math.round(size.width * scale));
    const height = Math.max(1, Math.round(size.height * scale));
    const blob = await encode(width, height);
    if (blob && blob.size <= maxBytes) return { blob, width, height };
  }
  return null;
}

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

/** PNG giữ PNG (có thể là ảnh đã tách nền, cần nền trong suốt); JPEG/WebP ra JPEG. */
const outputTypeFor = (type: string) => (type === 'image/png' ? 'image/png' : 'image/jpeg');

export function renamedForType(name: string, type: string): string {
  const base = name.replace(/\.[^./\\]+$/, '') || 'anh';
  return `${base}.${type === 'image/png' ? 'png' : 'jpg'}`;
}

export type FitImageResult =
  | { file: File; notice: string | null; error?: undefined }
  | { error: string; file?: undefined; notice?: undefined };

/**
 * File hợp lệ để gửi BE: sai định dạng → lỗi; không quá 10MB → giữ nguyên; nặng hơn → nén lại
 * trong trình duyệt và trả kèm thông báo để người dùng biết ảnh đã được nén.
 */
export async function fitProductImageFile(file: File): Promise<FitImageResult> {
  const typeError = validateProductImageFile({ name: file.name, type: file.type, size: 0 });
  if (typeError) return { error: typeError };
  if (file.size <= PRODUCT_IMAGE_MAX_BYTES) return { file, notice: null };

  let bitmap: ImageBitmap;
  try {
    // createImageBitmap xoay ảnh theo EXIF (mặc định 'from-image') → ảnh dọc chụp máy ảnh không bị nằm ngang.
    bitmap = await createImageBitmap(file);
  } catch {
    return { error: `Không đọc được ảnh "${file.name}" để nén — thử xuất lại ảnh JPG.` };
  }
  const type = outputTypeFor(file.type);
  const canvas = document.createElement('canvas');
  try {
    const fitted = await shrinkUntilFits({ width: bitmap.width, height: bitmap.height }, (width, height) => {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return Promise.resolve(null);
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      return new Promise((resolve) => canvas.toBlob(resolve, type, SHRINK_JPEG_QUALITY));
    });
    if (!fitted) {
      return { error: `Ảnh "${file.name}" nặng ${formatMb(file.size)}, nén mãi vẫn quá 10MB — thử xuất lại ảnh JPG.` };
    }
    const resized = fitted.width !== bitmap.width;
    return {
      file: new File([fitted.blob], renamedForType(file.name, type), { type, lastModified: file.lastModified }),
      notice:
        `Ảnh "${file.name}" nặng ${formatMb(file.size)} — đã tự nén còn ${formatMb(fitted.blob.size)}` +
        (resized ? ` (${fitted.width}×${fitted.height}).` : ', giữ nguyên độ phân giải.'),
    };
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
