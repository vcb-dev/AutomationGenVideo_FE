/**
 * Chức năng: Tạo ảnh sản phẩm — nền có sẵn. Chọn nền có sẵn thì SP tự đứng lên mặt hộp gỗ: chân SP
 * đúng chỗ đã đo trên ảnh, cao đúng tỉ lệ, SP bề ngang quá khổ thì thu nhỏ cho vừa mặt hộp.
 */
import fs from 'fs';
import path from 'path';
import { PLACEMENT_SCALE_MIN, computeDrawRect, type DrawRect, type Size } from '../background-placement';
import {
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND_PRESET_ID,
  findBackgroundPreset,
  placementForPreset,
  type BackgroundPreset,
} from '../background-presets';

const PUBLIC_DIR = path.join(__dirname, '../../../../public');

/** Kích thước ảnh gốc lúc đo chỗ đặt SP — đổi ảnh khác cỡ thì phải đo lại số trong background-presets. */
const MEASURED_SIZES: Record<string, Size> = {
  'shelf-box-portrait': { width: 1707, height: 2560 },
  'shelf-box-landscape': { width: 2560, height: 1707 },
};

/** Đọc kích thước từ khung SOF của file JPEG, khỏi cần thư viện ảnh. */
function jpegSize(buffer: Buffer): Size {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) throw new Error('File JPEG hỏng');
    const marker = buffer[offset + 1];
    const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrameHeader) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  throw new Error('Không thấy khung ảnh JPEG');
}

const footOf = (rect: DrawRect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height });

const place = (preset: BackgroundPreset, product: Size) => {
  const background = MEASURED_SIZES[preset.id];
  return { background, rect: computeDrawRect(background, product, placementForPreset(preset, background, product)) };
};

describe('BACKGROUND_PRESETS', () => {
  it('mở trang là chọn sẵn nền dọc; id không trùng; tìm được theo id', () => {
    expect(DEFAULT_BACKGROUND_PRESET_ID).toBe('shelf-box-portrait');
    expect(new Set(BACKGROUND_PRESETS.map((p) => p.id)).size).toBe(BACKGROUND_PRESETS.length);
    expect(findBackgroundPreset(DEFAULT_BACKGROUND_PRESET_ID)?.label).toBe('Hộp gỗ · dọc');
    expect(findBackgroundPreset('upload')).toBeUndefined();
    expect(findBackgroundPreset(null)).toBeUndefined();
  });

  it.each(BACKGROUND_PRESETS.map((p) => [p.id, p] as const))(
    '%s: ảnh gốc đúng cỡ lúc đo, ảnh nhỏ cho ô chọn không quá 400px',
    (id, preset) => {
      const original = jpegSize(fs.readFileSync(path.join(PUBLIC_DIR, preset.src)));
      expect(original).toEqual(MEASURED_SIZES[id]);
      const thumbnail = jpegSize(fs.readFileSync(path.join(PUBLIC_DIR, preset.thumbnailSrc)));
      expect(Math.max(thumbnail.width, thumbnail.height)).toBeLessThanOrEqual(400);
      // Ảnh nhỏ cùng tỉ lệ ảnh gốc để ô chọn cắt giống ảnh thật.
      expect(thumbnail.width / thumbnail.height).toBeCloseTo(original.width / original.height, 1);
    },
  );

  it.each(BACKGROUND_PRESETS.map((p) => [p.id, p] as const))('%s: SP mặc định nằm trọn trong ảnh', (_id, preset) => {
    expect(preset.foot.y - preset.productHeight).toBeGreaterThan(0);
    expect(preset.foot.y).toBeLessThan(1);
    expect(preset.foot.x - preset.maxProductWidth / 2).toBeGreaterThan(0);
    expect(preset.foot.x + preset.maxProductWidth / 2).toBeLessThan(1);
  });
});

describe('placementForPreset', () => {
  it.each(BACKGROUND_PRESETS.map((p) => [p.id, p] as const))(
    '%s: túi gần vuông đứng chân đúng mặt hộp, cao đúng tỉ lệ đã đo',
    (_id, preset) => {
      const { background, rect } = place(preset, { width: 900, height: 860 });
      const foot = footOf(rect);
      expect(foot.x).toBeCloseTo(preset.foot.x * background.width, 6);
      expect(foot.y).toBeCloseTo(preset.foot.y * background.height, 6);
      expect(rect.height).toBeCloseTo(preset.productHeight * background.height, 6);
    },
  );

  it('nền ngang: túi mẫu của người dùng về đúng chỗ họ tự đặt (lệch dưới 1% ảnh)', () => {
    // Ảnh ghép người dùng tự làm trên nền này: túi 1114×1067px, khung x 741→1855, y 402→1469.
    const { background, rect } = place(findBackgroundPreset('shelf-box-landscape')!, { width: 1114, height: 1067 });
    expect(Math.abs(rect.x - 741)).toBeLessThan(background.width * 0.01);
    expect(Math.abs(rect.x + rect.width - 1855)).toBeLessThan(background.width * 0.01);
    expect(Math.abs(rect.y - 402)).toBeLessThan(background.height * 0.01);
    expect(Math.abs(rect.y + rect.height - 1469)).toBeLessThan(background.height * 0.01);
  });

  it.each(BACKGROUND_PRESETS.map((p) => [p.id, p] as const))(
    '%s: SP bề ngang (ví dài 3:1) thu nhỏ vừa mặt hộp, chân vẫn đúng chỗ',
    (_id, preset) => {
      const { background, rect } = place(preset, { width: 1500, height: 500 });
      expect(rect.width).toBeCloseTo(preset.maxProductWidth * background.width, 6);
      expect(rect.height).toBeLessThan(preset.productHeight * background.height);
      const foot = footOf(rect);
      expect(foot.x).toBeCloseTo(preset.foot.x * background.width, 6);
      expect(foot.y).toBeCloseTo(preset.foot.y * background.height, 6);
    },
  );

  it.each(BACKGROUND_PRESETS.map((p) => [p.id, p] as const))(
    '%s: SP cao mảnh (chai 1:4) giữ đủ chiều cao, không bị thu theo bề ngang',
    (_id, preset) => {
      const { background, rect } = place(preset, { width: 250, height: 1000 });
      expect(rect.height).toBeCloseTo(preset.productHeight * background.height, 6);
      expect(footOf(rect).y).toBeCloseTo(preset.foot.y * background.height, 6);
    },
  );

  it('scale bị kẹp ở mức nhỏ nhất thì vẫn tính lại để chân SP nằm đúng chỗ', () => {
    const tiny: BackgroundPreset = { ...BACKGROUND_PRESETS[0], productHeight: 0.01 };
    const background = MEASURED_SIZES[tiny.id];
    const placement = placementForPreset(tiny, background, { width: 400, height: 400 });
    expect(placement.scale).toBe(PLACEMENT_SCALE_MIN);
    const rect = computeDrawRect(background, { width: 400, height: 400 }, placement);
    expect(footOf(rect).y).toBeCloseTo(tiny.foot.y * background.height, 6);
  });
});
