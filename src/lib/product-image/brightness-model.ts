/** Tự học độ sáng SP: đo ảnh, đoán mức từ model BE trả về, gom mẫu khi tải ảnh. */
import type { BatchItemStatus, BatchMode } from './batch';
import { PRODUCT_BRIGHTNESS_MAX, PRODUCT_BRIGHTNESS_MIN, lightness } from './realism';

export interface BrightnessModel {
  /** true = đủ mẫu và đoán đủ sát để tự chỉnh. */
  ready: boolean;
  samples: number;
  minSamples: number;
  /** Sai số trung bình khi tự kiểm trên mẫu đã có; null = chưa học được. */
  error: number | null;
  intercept: number;
  means: number[];
  scales: number[];
  weights: number[];
}

const SOLID_ALPHA = 200;
/** Lấy mẫu khoảng từng này điểm mỗi cạnh thân — đủ ổn định mà không chậm. */
const SAMPLE_GRID = 120;

const round2 = (value: number) => Math.round(value * 100) / 100;

/** 6 số đo trên thân SP trước khi áp độ sáng: trung vị, p10, p90 L*, độ rực màu, độ sáng nền, có tự chỉnh ánh sáng hay không. */
export function measureBrightnessFeatures(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  body: readonly number[] | null | undefined,
  sceneLightness: number,
  autoLight: boolean,
): number[] {
  const [x0, y0, x1, y1] = body && body.length === 4 ? body : [0, 0, width, height];
  const left = Math.max(0, Math.floor(x0));
  const top = Math.max(0, Math.floor(y0));
  const right = Math.min(width, Math.ceil(x1));
  const bottom = Math.min(height, Math.ceil(y1));
  const step = Math.max(1, Math.floor(Math.min(right - left, bottom - top) / SAMPLE_GRID));
  const values: number[] = [];
  let chroma = 0;
  for (let y = top; y < bottom; y += step) {
    for (let x = left; x < right; x += step) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] < SOLID_ALPHA) continue;
      const [r, g, b] = [rgba[i], rgba[i + 1], rgba[i + 2]];
      values.push(lightness(r, g, b));
      chroma += ((Math.max(r, g, b) - Math.min(r, g, b)) / 255) * 100;
    }
  }
  const sorted = values.sort((a, b) => a - b);
  const at = (fraction: number) => sorted[Math.floor((sorted.length - 1) * fraction)] ?? 0;
  return [at(0.5), at(0.1), at(0.9), sorted.length ? chroma / sorted.length : 0, sceneLightness, autoLight ? 1 : 0].map(round2);
}

/** Mức đề xuất theo model; model chưa đủ tin thì 0 (giữ nguyên). */
export function predictBrightness(model: BrightnessModel, features: readonly number[]): number {
  if (!model.ready) return 0;
  const raw = features.reduce((sum, value, i) => sum + (model.weights[i] * (value - model.means[i])) / model.scales[i], model.intercept);
  return Math.round(Math.min(PRODUCT_BRIGHTNESS_MAX, Math.max(PRODUCT_BRIGHTNESS_MIN, raw)));
}

/** Mẫu học từ các ảnh vừa tải: chỉ ảnh ghép đã xong, không chỉnh gì cũng tính là mức đó đã ổn. */
export function brightnessSamples(
  items: readonly { status: BatchItemStatus; result: { mode: BatchMode; brightness: number; features: number[] | null } | null }[],
): { features: number[]; brightness: number }[] {
  return items.flatMap((item) =>
    item.status === 'done' && item.result?.mode === 'cutout' && item.result.features
      ? [{ features: item.result.features, brightness: item.result.brightness }]
      : [],
  );
}

/** Dòng tiến độ dưới thanh kéo. */
export function brightnessModelHint(model: BrightnessModel | null): string | null {
  if (!model) return null;
  if (model.ready) return `AI đã học ${model.samples} ảnh, đang tự chỉnh, sai khoảng ${Math.round(model.error ?? 0)} mức.`;
  if (model.samples < model.minSamples) return `AI đang học: ${model.samples}/${model.minSamples} ảnh.`;
  return `AI đã có ${model.samples} ảnh nhưng chưa đoán đủ sát để tự chỉnh.`;
}
