/**
 * Chức năng: Tạo ảnh sản phẩm — kiểm file ảnh ngay khi chọn, khớp bộ lọc multer của BE
 * (JPG/PNG/WebP, tối đa 10MB).
 */
import { PRODUCT_IMAGE_ACCEPT, PRODUCT_IMAGE_MAX_BYTES, validateProductImageFile } from '../upload-validation';

const file = (type: string, size = 1024, name = 'sp') => ({ name, type, size });

describe('validateProductImageFile', () => {
  it.each(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])('nhận %s', (type) => {
    expect(validateProductImageFile(file(type))).toBeNull();
  });

  it.each(['image/gif', 'image/heic', 'application/pdf', ''])('từ chối định dạng "%s"', (type) => {
    expect(validateProductImageFile(file(type))).toContain('JPG, PNG hoặc WebP');
  });

  it('nhận đúng 10MB, từ chối vượt 10MB', () => {
    expect(PRODUCT_IMAGE_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(validateProductImageFile(file('image/png', PRODUCT_IMAGE_MAX_BYTES))).toBeNull();
    expect(validateProductImageFile(file('image/png', PRODUCT_IMAGE_MAX_BYTES + 1, 'to.png'))).toContain('vượt giới hạn 10MB');
  });

  it('accept của input liệt kê đủ định dạng', () => {
    expect(PRODUCT_IMAGE_ACCEPT).toBe('image/jpeg,image/jpg,image/png,image/webp');
  });
});
