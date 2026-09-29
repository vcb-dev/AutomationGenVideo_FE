/**
 * Chức năng: Tạo ảnh sản phẩm — "Chị Nhạm cầm sản phẩm" (tính phí Gemini). Kiểm đầu vào TRƯỚC
 * khi hỏi xác nhận chi phí và dựng đúng form multipart mà BE nhận.
 */
import {
  HELD_PRODUCT_FIELDS,
  HELD_PRODUCT_NOTE_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  buildHeldProductFormData,
  extensionForMime,
  validateHeldProductInput,
} from '../held-product-request';

const person = new File(['person'], 'nham.jpg', { type: 'image/jpeg' });
const product = new File(['product'], 'sp.png', { type: 'image/png' });

describe('validateHeldProductInput', () => {
  it('thiếu ảnh chị Nhạm', () => {
    expect(validateHeldProductInput({ personImage: null, productImage: product, productName: 'Nhẫn', note: '' })).toContain('chị Nhạm');
  });

  it('thiếu ảnh sản phẩm mới', () => {
    expect(validateHeldProductInput({ personImage: person, productImage: null, productName: 'Nhẫn', note: '' })).toContain('sản phẩm mới');
  });

  it('ghi chú dài quá giới hạn', () => {
    const note = 'a'.repeat(HELD_PRODUCT_NOTE_MAX_LENGTH + 1);
    expect(validateHeldProductInput({ personImage: person, productImage: product, productName: 'Nhẫn', note })).toContain(
      String(HELD_PRODUCT_NOTE_MAX_LENGTH),
    );
  });

  it('thiếu tên sản phẩm (chỉ có khoảng trắng) thì chặn — cần cho thống kê theo sản phẩm', () => {
    expect(validateHeldProductInput({ personImage: person, productImage: product, productName: '   ', note: '' })).toContain('tên sản phẩm');
  });

  it('tên sản phẩm dài quá giới hạn', () => {
    const productName = 'a'.repeat(PRODUCT_NAME_MAX_LENGTH + 1);
    expect(validateHeldProductInput({ personImage: person, productImage: product, productName, note: '' })).toContain(
      String(PRODUCT_NAME_MAX_LENGTH),
    );
  });

  it('đủ 2 ảnh + tên sản phẩm thì hợp lệ, ghi chú không bắt buộc', () => {
    expect(validateHeldProductInput({ personImage: person, productImage: product, productName: 'Nhẫn', note: '' })).toBeNull();
  });
});

describe('buildHeldProductFormData', () => {
  it('gắn đúng tên field BE nhận, tên SP và ghi chú đã cắt khoảng trắng', () => {
    const form = buildHeldProductFormData({ personImage: person, productImage: product, productName: ' Nhẫn Kim Vũ ', note: '  cao 30cm ' });
    expect((form.get(HELD_PRODUCT_FIELDS.person) as File).name).toBe('nham.jpg');
    expect((form.get(HELD_PRODUCT_FIELDS.product) as File).name).toBe('sp.png');
    expect(form.get(HELD_PRODUCT_FIELDS.productName)).toBe('Nhẫn Kim Vũ');
    expect(form.get(HELD_PRODUCT_FIELDS.note)).toBe('cao 30cm');
    expect(HELD_PRODUCT_FIELDS).toEqual({ person: 'personImage', product: 'productImage', productName: 'productName', note: 'note' });
  });

  it('ghi chú rỗng thì không gửi field note (BE chặn field lạ)', () => {
    const form = buildHeldProductFormData({ personImage: person, productImage: product, productName: 'Nhẫn', note: '   ' });
    expect(form.has(HELD_PRODUCT_FIELDS.note)).toBe(false);
  });

  it('thiếu ảnh thì ném lỗi, không dựng form', () => {
    expect(() => buildHeldProductFormData({ personImage: null, productImage: product, productName: 'Nhẫn', note: '' })).toThrow('chị Nhạm');
  });
});

describe('extensionForMime', () => {
  it('đuôi file theo mime AI trả', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('image/png')).toBe('png');
    expect(extensionForMime('image/webp')).toBe('webp');
  });
});
