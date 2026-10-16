/**
 * Chức năng: Tạo ảnh sản phẩm — tab "Chị Nhạm cầm sản phẩm", cách tạo ĐỔI SP 0đ (model tự huấn luyện + SAM + LaMa).
 * Kiểm đầu vào trước khi gửi (không có ghi chú — model không đọc chữ), dựng đúng form multipart BE nhận (chỉ 3 field
 * DTO khai báo, BE bật forbidNonWhitelisted) và đúng route theo cách tạo.
 */
import {
  HELD_PRODUCT_ENDPOINTS,
  HELD_PRODUCT_FIELDS,
  PRODUCT_NAME_MAX_LENGTH,
  buildHeldSwapFormData,
  validateHeldSwapInput,
} from '../held-product-request';

const person = new File(['person'], 'nham.jpg', { type: 'image/jpeg' });
const product = new File(['product'], 'sp.png', { type: 'image/png' });

describe('HELD_PRODUCT_ENDPOINTS', () => {
  it('đổi SP 0đ và Gemini gọi 2 route BE khác nhau', () => {
    expect(HELD_PRODUCT_ENDPOINTS.swap).toBe('/product-image/held-swap');
    expect(HELD_PRODUCT_ENDPOINTS.gemini).toBe('/product-image/held-product');
  });
});

describe('validateHeldSwapInput', () => {
  it('thiếu ảnh chị Nhạm / ảnh SP mới / tên SP thì báo đúng chỗ thiếu', () => {
    expect(validateHeldSwapInput({ personImage: null, productImage: product, productName: 'Túi' })).toContain('chị Nhạm');
    expect(validateHeldSwapInput({ personImage: person, productImage: null, productName: 'Túi' })).toContain('sản phẩm mới');
    expect(validateHeldSwapInput({ personImage: person, productImage: product, productName: '   ' })).toContain('tên sản phẩm');
  });

  it('tên SP quá dài thì báo giới hạn', () => {
    const productName = 'a'.repeat(PRODUCT_NAME_MAX_LENGTH + 1);
    expect(validateHeldSwapInput({ personImage: person, productImage: product, productName })).toContain(String(PRODUCT_NAME_MAX_LENGTH));
  });

  it('đủ 2 ảnh + tên SP thì hợp lệ', () => {
    expect(validateHeldSwapInput({ personImage: person, productImage: product, productName: 'Túi Thiên Vân' })).toBeNull();
  });
});

describe('buildHeldSwapFormData', () => {
  it('chỉ gửi 2 ảnh + tên SP đã cắt khoảng trắng, KHÔNG có field ghi chú', () => {
    const form = buildHeldSwapFormData({ personImage: person, productImage: product, productName: '  Túi Thiên Vân ' });
    expect(form.get(HELD_PRODUCT_FIELDS.person)).toBe(person);
    expect(form.get(HELD_PRODUCT_FIELDS.product)).toBe(product);
    expect(form.get(HELD_PRODUCT_FIELDS.productName)).toBe('Túi Thiên Vân');
    expect(form.has(HELD_PRODUCT_FIELDS.note)).toBe(false);
    expect([...form.keys()]).toHaveLength(3);
  });

  it('đầu vào thiếu thì ném lỗi tiếng Việt, không dựng form', () => {
    expect(() => buildHeldSwapFormData({ personImage: null, productImage: product, productName: 'Túi' })).toThrow('chị Nhạm');
  });
});
