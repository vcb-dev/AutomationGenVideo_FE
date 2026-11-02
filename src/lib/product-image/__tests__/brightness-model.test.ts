/**
 * Chức năng: Tạo ảnh sản phẩm — tự học độ sáng: đo ảnh, đoán mức từ model BE trả về, gom mẫu khi tải ảnh.
 */
import {
  type BrightnessModel,
  brightnessModelHint,
  brightnessSamples,
  measureBrightnessFeatures,
  predictBrightness,
} from '../brightness-model';
import { PRODUCT_BRIGHTNESS_MAX, PRODUCT_BRIGHTNESS_MIN } from '../realism';

function flat(width: number, height: number, color: number[], alpha = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...color, alpha], i);
  return data;
}

const model = (patch: Partial<BrightnessModel> = {}): BrightnessModel => ({
  ready: true,
  samples: 60,
  minSamples: 50,
  error: 4.2,
  intercept: 10,
  means: [40, 0, 0, 0, 0, 0],
  scales: [10, 1, 1, 1, 1, 1],
  weights: [-5, 0, 0, 0, 0, 0],
  ...patch,
});

describe('measureBrightnessFeatures', () => {
  it('đủ 6 số, túi tối cho L* thấp, túi xám không có độ rực', () => {
    const features = measureBrightnessFeatures(flat(20, 20, [40, 40, 40]), 20, 20, null, 33, true);
    expect(features).toHaveLength(6);
    expect(features[0]).toBeLessThan(30);
    expect(features[0]).toBe(features[1]);
    expect(features[0]).toBe(features[2]);
    expect(features[3]).toBe(0);
    expect(features.slice(4)).toEqual([33, 1]);
  });

  it('chỉ đo trong khung thân, bỏ quai ngoài khung và điểm trong suốt', () => {
    const data = flat(20, 20, [240, 240, 240]);
    for (let y = 10; y < 20; y += 1) for (let x = 0; x < 20; x += 1) data.set([30, 30, 30, 255], (y * 20 + x) * 4);
    const dark = measureBrightnessFeatures(flat(20, 20, [30, 30, 30]), 20, 20, null, 33, false);
    expect(measureBrightnessFeatures(data, 20, 20, [0, 10, 20, 20], 33, false)).toEqual(dark);
  });

  it('cùng ảnh cho cùng số đo; ảnh trong suốt không lỗi', () => {
    const data = flat(30, 30, [120, 90, 60]);
    expect(measureBrightnessFeatures(data, 30, 30, null, 30, true)).toEqual(measureBrightnessFeatures(data, 30, 30, null, 30, true));
    expect(measureBrightnessFeatures(flat(5, 5, [0, 0, 0], 0), 5, 5, null, 30, true)).toEqual([0, 0, 0, 0, 30, 1]);
  });
});

describe('predictBrightness', () => {
  it('đoán theo trọng số: túi tối lên, túi sáng xuống', () => {
    expect(predictBrightness(model(), [20, 0, 0, 0, 0, 0])).toBe(20);
    expect(predictBrightness(model(), [60, 0, 0, 0, 0, 0])).toBe(0);
    expect(predictBrightness(model(), [80, 0, 0, 0, 0, 0])).toBe(-10);
  });

  it('không vượt khoảng thanh kéo', () => {
    expect(predictBrightness(model({ intercept: 500 }), [40, 0, 0, 0, 0, 0])).toBe(PRODUCT_BRIGHTNESS_MAX);
    expect(predictBrightness(model({ intercept: -500 }), [40, 0, 0, 0, 0, 0])).toBe(PRODUCT_BRIGHTNESS_MIN);
  });

  it('model chưa đủ tin thì giữ nguyên', () => {
    expect(predictBrightness(model({ ready: false }), [20, 0, 0, 0, 0, 0])).toBe(0);
  });
});

describe('brightnessSamples', () => {
  const done = (mode: 'cutout' | 'gemini', brightness: number, features: number[] | null) => ({
    status: 'done' as const,
    result: { mode, brightness, features },
  });

  it('lấy mức cuối cùng của ảnh ghép, kể cả ảnh không chỉnh', () => {
    expect(brightnessSamples([done('cutout', 12, [1]), done('cutout', 0, [2])])).toEqual([
      { features: [1], brightness: 12 },
      { features: [2], brightness: 0 },
    ]);
  });

  it('bỏ ảnh Gemini, ảnh chưa xong, ảnh chưa có số đo', () => {
    expect(
      brightnessSamples([
        done('gemini', 0, null),
        done('cutout', 5, null),
        { status: 'pending', result: { mode: 'cutout', brightness: 5, features: [1] } },
        { status: 'error', result: null },
      ]),
    ).toEqual([]);
  });
});

describe('brightnessModelHint', () => {
  it('báo đúng tiến độ từng giai đoạn', () => {
    expect(brightnessModelHint(null)).toBeNull();
    expect(brightnessModelHint(model({ ready: false, samples: 12 }))).toBe('AI đang học: 12/50 ảnh.');
    expect(brightnessModelHint(model({ ready: false, samples: 70 }))).toContain('chưa đoán đủ sát');
    expect(brightnessModelHint(model())).toContain('đã học 60 ảnh');
  });
});
