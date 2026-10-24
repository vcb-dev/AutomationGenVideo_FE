/**
 * Chức năng: Tạo ảnh sản phẩm — tab Tạo hàng loạt, chế độ Gemini đặt SP vào cảnh: form gửi BE đúng
 * tên field (khớp FileFieldsInterceptor), tên SP bắt buộc và bị cắt khoảng trắng, ghi chú rỗng thì
 * không gửi (BE bật forbidNonWhitelisted), chặn độ dài trước khi tốn lượt Gemini.
 */
import { HELD_PRODUCT_NOTE_MAX_LENGTH, PRODUCT_NAME_MAX_LENGTH } from '../held-product-request';
import { SCENE_PLACEMENT_FIELDS, buildScenePlacementFormData, validateScenePlacementInput } from '../scene-placement-request';

const product = new File(['bag'], 'bag.png', { type: 'image/png' });
const scene = new File(['scene'], 'scene.jpg', { type: 'image/jpeg' });

describe('validateScenePlacementInput', () => {
  it('đủ tên SP thì hợp lệ', () => {
    expect(validateScenePlacementInput({ productName: 'Túi Hermes', note: '' })).toBeNull();
  });

  it('thiếu tên SP thì báo', () => {
    expect(validateScenePlacementInput({ productName: '   ', note: '' })).toContain('tên sản phẩm');
  });

  it('tên SP hoặc ghi chú quá dài thì báo', () => {
    expect(validateScenePlacementInput({ productName: 'a'.repeat(PRODUCT_NAME_MAX_LENGTH + 1), note: '' })).toContain(
      `${PRODUCT_NAME_MAX_LENGTH}`,
    );
    expect(validateScenePlacementInput({ productName: 'Túi', note: 'a'.repeat(HELD_PRODUCT_NOTE_MAX_LENGTH + 1) })).toContain(
      `${HELD_PRODUCT_NOTE_MAX_LENGTH}`,
    );
  });
});

describe('buildScenePlacementFormData', () => {
  it('gửi ảnh SP, ảnh cảnh, tên SP đã cắt khoảng trắng và ghi chú', () => {
    const form = buildScenePlacementFormData({ productImage: product, sceneImage: scene, productName: ' Túi Hermes ', note: ' cao 25cm ' });
    expect(form.get(SCENE_PLACEMENT_FIELDS.product)).toBeInstanceOf(File);
    expect((form.get(SCENE_PLACEMENT_FIELDS.product) as File).name).toBe('bag.png');
    expect((form.get(SCENE_PLACEMENT_FIELDS.scene) as File).name).toBe('scene.jpg');
    expect(form.get(SCENE_PLACEMENT_FIELDS.productName)).toBe('Túi Hermes');
    expect(form.get(SCENE_PLACEMENT_FIELDS.note)).toBe('cao 25cm');
  });

  it('ghi chú rỗng thì không có field note', () => {
    const form = buildScenePlacementFormData({ productImage: product, sceneImage: scene, productName: 'Túi', note: '  ' });
    expect(form.has(SCENE_PLACEMENT_FIELDS.note)).toBe(false);
  });

  it('tên field khớp controller BE', () => {
    expect(SCENE_PLACEMENT_FIELDS).toEqual({ product: 'productImage', scene: 'sceneImage', productName: 'productName', note: 'note' });
  });

  it('đầu vào sai thì ném lỗi, không dựng form', () => {
    expect(() => buildScenePlacementFormData({ productImage: product, sceneImage: scene, productName: '', note: '' })).toThrow('tên sản phẩm');
  });
});
