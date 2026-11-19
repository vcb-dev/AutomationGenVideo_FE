/**
 * Chức năng: Tạo ảnh sản phẩm — dựng lớp SP và lớp bóng ngoài luồng giao diện.
 */
import { BRIGHTNESS_FEATURE_COUNT, type BrightnessModel } from '../brightness-model';
import { buildRealismLayers, type RealismSettings } from '../realism-layers';

const list = (first: number, rest = 0) => [first, ...Array(BRIGHTNESS_FEATURE_COUNT - 1).fill(rest)];
const model: BrightnessModel = {
  ready: true, samples: 200, humanSamples: 70, minSamples: 150, minHumanSamples: 60,
  intercept: 10, means: list(0), scales: list(1, 1), weights: list(0),
};

function pixels(width = 40, height = 60) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([120, 110, 100, 255], i);
  return { width, height, data };
}

const settings: RealismSettings = { shadow: true, shadowStrength: 0.7, shadowHeight: 1.8, look: false, warmth: 0, body: [0, 20, 40, 60] };
const same = { width: 40, height: 60 };

describe('buildRealismLayers', () => {
  it('lớp SP đúng cỡ đích, ảnh gốc giữ nguyên để ghép lại', () => {
    const base = pixels();
    const before = Array.from(base.data.slice(0, 4));
    const layers = buildRealismLayers(base, { ...settings, brightness: 20 }, { width: 80, height: 120 });
    expect(layers.product.width).toBe(80);
    expect(layers.product.data).toHaveLength(80 * 120 * 4);
    expect(Array.from(base.data.slice(0, 4))).toEqual(before);
  });

  it('chưa chỉnh tay thì theo đề xuất, chỉnh tay thì đè, không model thì 0', () => {
    expect(buildRealismLayers(pixels(), { ...settings, model }, same)).toMatchObject({ brightness: 10, suggested: 10 });
    expect(buildRealismLayers(pixels(), { ...settings, model, brightness: -5 }, same)).toMatchObject({ brightness: -5, suggested: 10 });
    expect(buildRealismLayers(pixels(), settings, same)).toMatchObject({ brightness: 0, suggested: null });
  });

  it('số đo lấy trước khi áp độ sáng, chỉnh sáng không làm đổi mẫu', () => {
    const plain = buildRealismLayers(pixels(), settings, same);
    const lifted = buildRealismLayers(pixels(), { ...settings, brightness: 30 }, same);
    expect(lifted.features).toEqual(plain.features);
    expect(lifted.product.data[0]).toBeGreaterThan(plain.product.data[0]);
  });

  it('tắt bóng thì không có lớp bóng', () => {
    expect(buildRealismLayers(pixels(), { ...settings, shadow: false }, same)).toMatchObject({ shadow: null, foot: null });
  });

  it('có bóng thì lớp bóng dài hơn SP và biết chỗ chân', () => {
    const layers = buildRealismLayers(pixels(), settings, same);
    expect(layers.shadowHeightRatio).toBeGreaterThan(1);
    expect(layers.foot?.bottom).toBeCloseTo(1, 1);
  });

  it('khung thân cao hơn đáy thật không tạo dải tối giữa thân túi', () => {
    const base = { width: 40, height: 200, data: new Uint8ClampedArray(40 * 200 * 4) };
    for (let i = 0; i < base.data.length; i += 4) base.data.set([200, 200, 200, 255], i);
    const layers = buildRealismLayers(base, { ...settings, body: [0, 0, 40, 160] }, { width: 40, height: 200 });
    const column = Array.from({ length: 200 }, (_, y) => layers.product.data[(y * 40 + 20) * 4]);
    for (let y = 1; y < 200; y += 1) expect(column[y]).toBeLessThanOrEqual(column[y - 1]);
  });
});
