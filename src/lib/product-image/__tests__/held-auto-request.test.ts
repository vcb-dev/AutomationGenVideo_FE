/**
 * Chức năng: Tạo ảnh sản phẩm — tab "Chị Nhạm cầm SP", chế độ tự chọn tư thế (0đ): gửi ảnh SP mới + tên SP + bề ngang
 * thật của túi (cm, bắt buộc — người dùng 15/10: "kích thước túi cần nhập mới biết được"), AI chọn tư thế chị Nhạm hợp
 * dáng + cỡ SP và ghép túi đúng cỡ so với bàn tay chị. Khoá: endpoint, kiểm đầu vào, form đúng 3 field DTO (BE
 * forbidNonWhitelisted).
 */
import {
  HELD_PRODUCT_ENDPOINTS,
  HELD_WIDTH_CM_RANGE,
  PRODUCT_NAME_MAX_LENGTH,
  buildHeldAutoFormData,
  validateHeldAutoInput,
} from '../held-product-request';

const file = (name: string) => new File(['x'], name, { type: 'image/png' });

describe('held-auto request', () => {
  it('gọi đúng route BE', () => {
    expect(HELD_PRODUCT_ENDPOINTS.auto).toBe('/product-image/held-auto');
  });

  it('cần ảnh SP + bề ngang túi + tên SP — không đòi ảnh chị Nhạm', () => {
    const ok = { productImage: file('tui.png'), productName: ' Túi Mộc Vân ', widthCm: 24 };
    expect(validateHeldAutoInput(ok)).toBeNull();
    expect(validateHeldAutoInput({ ...ok, productImage: null })).toContain('ảnh sản phẩm mới');
    expect(validateHeldAutoInput({ ...ok, productName: '   ' })).toContain('tên sản phẩm');
    expect(validateHeldAutoInput({ ...ok, productName: 'x'.repeat(PRODUCT_NAME_MAX_LENGTH + 1) })).toContain(`${PRODUCT_NAME_MAX_LENGTH}`);
  });

  it('bề ngang túi bắt buộc và phải trong khoảng hợp lý (khớp BE 6–60cm)', () => {
    const base = { productImage: file('tui.png'), productName: 'Túi' };
    expect(HELD_WIDTH_CM_RANGE).toEqual([6, 60]);
    expect(validateHeldAutoInput({ ...base, widthCm: null })).toContain('bề ngang túi');
    expect(validateHeldAutoInput({ ...base, widthCm: Number.NaN })).toContain('bề ngang túi');
    expect(validateHeldAutoInput({ ...base, widthCm: 3 })).toContain('6 đến 60');
    expect(validateHeldAutoInput({ ...base, widthCm: 75 })).toContain('6 đến 60');
    expect(validateHeldAutoInput({ ...base, widthCm: 6 })).toBeNull();
  });

  it('form có productImage + productName đã cắt khoảng trắng + widthCm', () => {
    const image = file('tui.png');
    const form = buildHeldAutoFormData({ productImage: image, productName: ' Túi Mộc Vân ', widthCm: 24.5 });
    expect(Array.from(form.keys()).sort()).toEqual(['productImage', 'productName', 'widthCm']);
    expect(form.get('productImage')).toBe(image);
    expect(form.get('productName')).toBe('Túi Mộc Vân');
    expect(form.get('widthCm')).toBe('24.5');
  });

  it('đầu vào thiếu thì không dựng form', () => {
    expect(() => buildHeldAutoFormData({ productImage: null, productName: 'Túi', widthCm: 24 })).toThrow();
    expect(() => buildHeldAutoFormData({ productImage: file('tui.png'), productName: 'Túi', widthCm: null })).toThrow();
  });
});
