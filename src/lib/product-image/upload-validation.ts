/**
 * Kiểm file ảnh ngay khi người dùng chọn — khớp bộ lọc multer của BE
 * (product-image-upload.util.ts: JPG/PNG/WebP, tối đa 10MB mỗi ảnh). Chặn sớm ở đây để không
 * phải chờ tải lên xong mới bị BE từ chối.
 */

export const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const PRODUCT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** Giá trị cho thuộc tính `accept` của <input type="file">. */
export const PRODUCT_IMAGE_ACCEPT = PRODUCT_IMAGE_MIME_TYPES.join(',');

/** Trả về thông báo lỗi tiếng Việt, hoặc null nếu file hợp lệ. */
export function validateProductImageFile(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  if (!PRODUCT_IMAGE_MIME_TYPES.includes(file.type)) {
    return `Chỉ nhận ảnh JPG, PNG hoặc WebP. File "${file.name}" có định dạng ${file.type || 'không xác định'}.`;
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return `File "${file.name}" nặng ${(file.size / (1024 * 1024)).toFixed(1)}MB, vượt giới hạn 10MB.`;
  }
  return null;
}
