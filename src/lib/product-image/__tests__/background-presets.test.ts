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
  BOX_WIDTH_CM,
  UPLOADED_BACKGROUND_LAYOUT,
  findBackgroundPreset,
  placementForBody,
  placementForPreset,
  type BackgroundPreset,
  type BodyBox,
} from '../background-presets';

const PUBLIC_DIR = path.join(__dirname, '../../../../public');

/** Kích thước ảnh gốc lúc đo chỗ đặt SP — đổi ảnh khác cỡ thì phải đo lại số trong background-presets. */
const MEASURED_SIZES: Record<string, Size> = {
  'shelf-box-portrait': { width: 1707, height: 2560 },
  // Ảnh thay 13/10, đo lại chỗ đặt SP theo ảnh này.
  'shelf-box-landscape': { width: 2540, height: 1694 },
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

describe('UPLOADED_BACKGROUND_LAYOUT — ảnh nền tự tải lên, không chỉnh tay', () => {
  const background: Size = { width: 1080, height: 1920 };

  it('SP đứng giữa ảnh, chân ở 85% chiều cao, cao một nửa ảnh', () => {
    // Túi cao 960px thì rộng 480px = 44% ảnh — chưa chạm trần bề ngang 60%.
    const product = { width: 400, height: 800 };
    const rect = computeDrawRect(background, product, placementForPreset(UPLOADED_BACKGROUND_LAYOUT, background, product));
    expect(footOf(rect).x).toBeCloseTo(background.width / 2, 0);
    expect(footOf(rect).y).toBeCloseTo(background.height * 0.85, 0);
    expect(rect.height).toBeCloseTo(background.height * 0.5, 0);
  });

  it('SP bề ngang quá khổ thu nhỏ cho rộng tối đa 60% ảnh, vẫn nằm trong khung', () => {
    const product = { width: 2000, height: 500 };
    const rect = computeDrawRect(background, product, placementForPreset(UPLOADED_BACKGROUND_LAYOUT, background, product));
    expect(rect.width).toBeCloseTo(background.width * 0.6, 0);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(background.width);
    expect(footOf(rect).y).toBeCloseTo(background.height * 0.85, 0);
  });
});

describe('placementForBody — mọi túi cùng cỡ thân, đáy thân đứng đúng mặt hộp', () => {
  const preset = findBackgroundPreset('shelf-box-portrait') as BackgroundPreset;
  const background = MEASURED_SIZES['shelf-box-portrait'];
  const bodyRect = (product: Size, body: BodyBox) => {
    const rect = computeDrawRect(background, product, placementForBody(preset, background, product, body));
    const f = rect.width / product.width;
    return { rect, f, x0: rect.x + body[0] * f, y0: rect.y + body[1] * f, x1: rect.x + body[2] * f, y1: rect.y + body[3] * f };
  };
  const size = (b: { x0: number; y0: number; x1: number; y1: number }) => Math.sqrt((b.x1 - b.x0) * (b.y1 - b.y0));

  // Hai ảnh thật người dùng thử (kích thước ảnh tách nền đo trong log): túi quai dựng cao và túi dây trải ngang.
  const tall = { product: { width: 768, height: 1193 }, body: [0, 520, 768, 1193] as BodyBox };
  const wide = { product: { width: 1984, height: 832 }, body: [600, 250, 1384, 832] as BodyBox };

  it('túi quai cao và túi dây ngang có cùng độ lớn thân (trước đây chênh gấp đôi)', () => {
    const a = bodyRect(tall.product, tall.body);
    const b = bodyRect(wide.product, wide.body);
    expect(size(a)).toBeCloseTo(preset.bodySize * background.height, 0);
    expect(size(b)).toBeCloseTo(preset.bodySize * background.height, 0);
  });

  it('đáy thân túi (không phải đáy dây/quai) nằm đúng chỗ đo trên mặt hộp, giữa thân đúng tâm', () => {
    for (const { product, body } of [tall, wide]) {
      const b = bodyRect(product, body);
      expect(b.y1).toBeCloseTo(preset.foot.y * background.height, 0);
      expect((b.x0 + b.x1) / 2).toBeCloseTo(preset.foot.x * background.width, 0);
    }
  });

  it('thân quá rộng thì thu lại cho vừa mặt hộp', () => {
    const b = bodyRect({ width: 3000, height: 600 }, [0, 100, 3000, 600]);
    expect(b.x1 - b.x0).toBeCloseTo(preset.maxProductWidth * background.width, 0);
  });

  it('quai rất cao thì thu lại để không trồi khỏi mép trên ảnh', () => {
    const b = bodyRect({ width: 400, height: 4000 }, [0, 3600, 400, 4000]);
    expect(b.rect.y).toBeGreaterThanOrEqual(-0.5);
  });
});


describe('placementForBody theo bề ngang thật (cm) — túi đúng cỡ so với hộp gỗ BOX_WIDTH_CM', () => {
  // Túi dẹt quai thấp — không chạm luật "quai không trồi khỏi mép trên" (túi to quai cao trên nền ngang thì chạm, đúng
  // như khung hình thật chỉ cao ~40cm phía trên mặt hộp).
  const body = [100, 100, 700, 400] as BodyBox;
  const product = { width: 800, height: 420 };
  it.each(BACKGROUND_PRESETS.map((p) => [p.id, p] as const))('%s: thân rộng đúng cm/BOX_WIDTH_CM bề ngang hộp ở hàng chân', (id, preset) => {
    const background = MEASURED_SIZES[id];
    const widthOf = (cm: number) => {
      const rect = computeDrawRect(background, product, placementForBody(preset, background, product, body, cm));
      return ((body[2] - body[0]) * rect.width) / product.width;
    };
    const box = preset.boxWidth * background.width;
    expect(widthOf(22) / box).toBeCloseTo(22 / BOX_WIDTH_CM, 2);
    expect(widthOf(11) / box).toBeCloseTo(11 / BOX_WIDTH_CM, 2);
    expect(widthOf(22) / widthOf(11)).toBeCloseTo(2, 2);             // túi 22cm rộng gấp đôi ví 11cm
  });

  it('hộp gỗ trong nền rộng 37cm (người dùng đo thước: dài 37 × rộng 34 × cao 19,5cm, mặt có khoá là cạnh 37)', () => {
    expect(BOX_WIDTH_CM).toBe(37);
  });

  it('không biết cm hoặc nền tự tải lên (không số đo hộp) → cách đặt cũ, mọi túi cùng độ lớn thân', () => {
    const preset = findBackgroundPreset('shelf-box-portrait') as BackgroundPreset;
    const background = MEASURED_SIZES['shelf-box-portrait'];
    expect(placementForBody(preset, background, product, body, null)).toEqual(placementForBody(preset, background, product, body));
    expect(placementForBody(UPLOADED_BACKGROUND_LAYOUT, background, product, body, 25))
      .toEqual(placementForBody(UPLOADED_BACKGROUND_LAYOUT, background, product, body));
  });
});
