/**
 * Chức năng: Tạo ảnh sản phẩm — tự học độ sáng: đo ảnh, đoán mức từ model BE trả về, gom mẫu khi tải ảnh.
 */
import {
  BRIGHTNESS_FEATURE_COUNT,
  type BrightnessModel,
  brightnessModelHint,
  brightnessSamples,
  brightnessSource,
  isUsableBrightnessModel,
  measureBrightnessFeatures,
  predictBrightness,
} from '../brightness-model';
import { PRODUCT_BRIGHTNESS_MAX, PRODUCT_BRIGHTNESS_MIN } from '../realism';

function flat(width: number, height: number, color: number[], alpha = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...color, alpha], i);
  return data;
}

const list = (first: number, rest = 0) => [first, ...Array(BRIGHTNESS_FEATURE_COUNT - 1).fill(rest)];

const model = (patch: Partial<BrightnessModel> = {}): BrightnessModel => ({
  ready: true,
  samples: 200,
  humanSamples: 70,
  minSamples: 150,
  minHumanSamples: 60,
  intercept: 10,
  means: list(40),
  scales: list(10, 1),
  weights: list(-5),
  ...patch,
});

describe('measureBrightnessFeatures', () => {
  it('đủ 11 số trong thang 0..100, túi đen có phần trăm gần đen cao', () => {
    const features = measureBrightnessFeatures(flat(20, 20, [10, 10, 10]), 20, 20, null, true);
    expect(features).toHaveLength(BRIGHTNESS_FEATURE_COUNT);
    expect(features.every((value) => value >= 0 && value <= 100)).toBe(true);
    expect(features[4]).toBe(100);
    expect(features[5]).toBe(0);
    expect(features[6]).toBe(100);
  });

  it('túi trắng có phần trăm gần trắng cao và các đoạn gãy lớn dần', () => {
    const features = measureBrightnessFeatures(flat(20, 20, [250, 250, 250]), 20, 20, null, false);
    expect(features[5]).toBe(100);
    expect(features[6]).toBe(0);
    expect(features[7]).toBeGreaterThan(features[8]);
    expect(features[10]).toBeGreaterThan(0);
  });

  it('chỉ đo trong khung thân, bỏ quai ngoài khung', () => {
    const data = flat(20, 20, [240, 240, 240]);
    for (let y = 10; y < 20; y += 1) for (let x = 0; x < 20; x += 1) data.set([30, 30, 30, 255], (y * 20 + x) * 4);
    const dark = measureBrightnessFeatures(flat(20, 20, [30, 30, 30]), 20, 20, null, false);
    expect(measureBrightnessFeatures(data, 20, 20, [0, 10, 20, 20], false)).toEqual(dark);
  });

  it('ảnh trong suốt không lỗi', () => {
    expect(measureBrightnessFeatures(flat(5, 5, [0, 0, 0], 0), 5, 5, null, false).every((value) => value === 0)).toBe(true);
  });
});

describe('isUsableBrightnessModel', () => {
  it('nhận model đang học chưa có trọng số và model đủ dạng', () => {
    expect(isUsableBrightnessModel(model({ ready: false, means: [], scales: [], weights: [] }))).toBe(true);
    expect(isUsableBrightnessModel(model())).toBe(true);
  });

  it.each([
    ['null', null],
    ['thiếu số mẫu', {}],
    ['trọng số rỗng', model({ weights: [] })],
    ['sai độ dài', model({ means: [1, 2] })],
    ['thang bằng 0', model({ scales: list(0, 1) })],
    ['NaN', model({ weights: list(NaN) })],
  ])('từ chối %s', (_, value) => {
    expect(isUsableBrightnessModel(value as BrightnessModel)).toBe(false);
  });
});

describe('predictBrightness', () => {
  it('đoán theo trọng số: túi tối lên, túi sáng xuống', () => {
    expect(predictBrightness(model(), list(20))).toBe(20);
    expect(predictBrightness(model(), list(80))).toBe(-10);
  });

  it('không vượt khoảng thanh kéo', () => {
    expect(predictBrightness(model({ intercept: 500 }), list(40))).toBe(PRODUCT_BRIGHTNESS_MAX);
    expect(predictBrightness(model({ intercept: -500 }), list(40))).toBe(PRODUCT_BRIGHTNESS_MIN);
  });

  it('chưa đủ tin hoặc kết quả không hữu hạn thì không có đề xuất', () => {
    expect(predictBrightness(model({ ready: false }), list(20))).toBeNull();
    expect(predictBrightness(model({ intercept: NaN }), list(20))).toBeNull();
  });
});

describe('brightnessSource', () => {
  it('chỉnh tay là human, giữ đề xuất là accepted, chưa có đề xuất là default', () => {
    expect(brightnessSource(12, 5, true, 'nen')).toBe('human');
    expect(brightnessSource(null, 5, true, 'nen')).toBe('accepted');
    expect(brightnessSource(null, null, true, 'nen')).toBe('default');
  });

  it('không biết model hoặc nền tự tải lên thì không học', () => {
    expect(brightnessSource(null, null, false, 'nen')).toBeNull();
    expect(brightnessSource(12, null, true, null)).toBeNull();
  });
});

describe('brightnessSamples', () => {
  const done = (patch = {}) => ({
    status: 'done' as const,
    result: { mode: 'cutout' as const, brightness: 12, features: [1], source: 'human' as const, suggested: 5, background: 'nen', ...patch },
  });

  it('gửi mức cuối, nguồn, nền và đề xuất; bỏ đề xuất khi không có', () => {
    expect(brightnessSamples([done(), done({ suggested: null, source: 'default' })])).toEqual([
      { features: [1], brightness: 12, source: 'human', suggested: 5, background: 'nen' },
      { features: [1], brightness: 12, source: 'default', background: 'nen' },
    ]);
  });

  it('bỏ ảnh Gemini, ảnh chưa xong, ảnh không có nguồn', () => {
    expect(
      brightnessSamples([
        done({ mode: 'gemini' }),
        done({ features: null }),
        done({ source: null }),
        { ...done(), status: 'pending' },
        { status: 'error', result: null },
      ]),
    ).toEqual([]);
  });
});

describe('brightnessModelHint', () => {
  it('báo tiến độ, không hiện số sai tự kiểm', () => {
    expect(brightnessModelHint(null)).toBeNull();
    expect(brightnessModelHint(model({ ready: false, samples: 12, humanSamples: 3 }))).toBe('AI đang học: 12/150 ảnh, 3/60 ảnh chỉnh tay.');
    expect(brightnessModelHint(model())).toContain('đang tự chỉnh');
    expect(brightnessModelHint(model())).not.toContain('sai');
  });
});
