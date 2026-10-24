/**
 * Chức năng: Tạo ảnh sản phẩm — ảnh trên 10MB (ảnh máy ảnh của media) tự nén trong trình duyệt cho
 * vừa giới hạn tải lên của BE thay vì bị từ chối.
 */
import {
  SHRINK_SCALES,
  SHRINK_TARGET_BYTES,
  fitProductImageFile,
  renamedForType,
  shrinkUntilFits,
} from '../shrink-image';
import { PRODUCT_IMAGE_MAX_BYTES } from '../upload-validation';

const blobOf = (bytes: number) => ({ size: bytes }) as Blob;

describe('shrinkUntilFits', () => {
  it('nén lại vừa thì giữ nguyên độ phân giải, chỉ mã hoá một lần', async () => {
    const encode = jest.fn(async () => blobOf(6_000_000));
    const fitted = await shrinkUntilFits({ width: 6000, height: 4000 }, encode);
    expect(fitted).toEqual({ blob: blobOf(6_000_000), width: 6000, height: 4000 });
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it('chưa vừa thì thu nhỏ dần tới cỡ đầu tiên vừa giới hạn', async () => {
    // Dung lượng tỉ lệ số điểm ảnh: 6000×4000 ra 14MB.
    const encode = jest.fn(async (w: number, h: number) => blobOf(Math.round((14_000_000 * w * h) / 24_000_000)));
    const fitted = await shrinkUntilFits({ width: 6000, height: 4000 }, encode);
    // 0,85² × 14MB ≈ 10,1MB vẫn quá 9,5MB; 0,7² × 14MB ≈ 6,9MB thì vừa.
    expect(fitted).toMatchObject({ width: 4200, height: 2800 });
    expect(fitted!.blob.size).toBeLessThanOrEqual(SHRINK_TARGET_BYTES);
    expect(encode).toHaveBeenCalledTimes(3);
  });

  it('thu nhỏ hết cỡ vẫn quá, hoặc trình duyệt không mã hoá được → null', async () => {
    expect(await shrinkUntilFits({ width: 100, height: 100 }, async () => blobOf(PRODUCT_IMAGE_MAX_BYTES * 2))).toBeNull();
    const encode = jest.fn(async () => null);
    expect(await shrinkUntilFits({ width: 100, height: 100 }, encode)).toBeNull();
    expect(encode).toHaveBeenCalledTimes(SHRINK_SCALES.length);
  });

  it('chừa khoảng an toàn dưới giới hạn BE', () => {
    expect(SHRINK_TARGET_BYTES).toBeLessThan(PRODUCT_IMAGE_MAX_BYTES);
    expect(SHRINK_SCALES[0]).toBe(1);
  });
});

describe('fitProductImageFile', () => {
  const fileOf = (name: string, type: string, size: number) => {
    const file = new File(['x'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  it('ảnh không quá 10MB giữ nguyên file, không thông báo', async () => {
    const file = fileOf('sp.jpg', 'image/jpeg', PRODUCT_IMAGE_MAX_BYTES);
    await expect(fitProductImageFile(file)).resolves.toEqual({ file, notice: null });
  });

  it('sai định dạng báo lỗi ngay, kể cả file nặng', async () => {
    const result = await fitProductImageFile(fileOf('anh.heic', 'image/heic', 20_000_000));
    expect(result.error).toContain('JPG, PNG hoặc WebP');
  });

  it('ảnh nặng mà trình duyệt không đọc được → lỗi dễ hiểu, không ném', async () => {
    (globalThis as { createImageBitmap?: unknown }).createImageBitmap = jest.fn(async () => {
      throw new Error('decode');
    });
    const result = await fitProductImageFile(fileOf('BH_05177.JPG', 'image/jpeg', 14_000_000));
    expect(result.error).toContain('Không đọc được ảnh "BH_05177.JPG"');
  });
});

describe('renamedForType', () => {
  it('đổi đuôi theo định dạng ra', () => {
    expect(renamedForType('BH_05177.JPG', 'image/jpeg')).toBe('BH_05177.jpg');
    expect(renamedForType('tui.webp', 'image/jpeg')).toBe('tui.jpg');
    expect(renamedForType('cat-nen.png', 'image/png')).toBe('cat-nen.png');
    expect(renamedForType('khong-duoi', 'image/jpeg')).toBe('khong-duoi.jpg');
  });
});
