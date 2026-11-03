/** Tự học độ sáng SP: đo ảnh, đoán mức từ model BE trả về, gom mẫu khi tải ảnh. */
import type { BatchItemStatus, BatchMode } from './batch';
import { PRODUCT_BRIGHTNESS_MAX, PRODUCT_BRIGHTNESS_MIN, lightness } from './realism';

export const BRIGHTNESS_FEATURE_COUNT = 11;
/** Số mẫu mỗi lần gửi, khớp giới hạn của BE. */
export const BRIGHTNESS_SAMPLE_BATCH = 200;

export type BrightnessSource = 'human' | 'accepted' | 'default';

export interface BrightnessModel {
  /** true = đủ mẫu và đoán đủ sát để tự chỉnh. */
  ready: boolean;
  samples: number;
  humanSamples: number;
  minSamples: number;
  minHumanSamples: number;
  intercept: number;
  means: number[];
  scales: number[];
  weights: number[];
}

export interface BrightnessSample {
  features: number[];
  brightness: number;
  source: BrightnessSource;
  suggested?: number;
  background: string;
}

const SOLID_ALPHA = 200;
/** Lấy mẫu khoảng từng này điểm mỗi cạnh thân — đủ ổn định mà không chậm. */
const SAMPLE_GRID = 120;
/** L* dưới/trên mức này là vùng gần đen, gần trắng. */
const DARK_L = 12;
const BRIGHT_L = 88;
/** Điểm gãy theo L50: người chỉnh túi đen, túi trắng khác hẳn túi tầm trung. */
const LIGHTNESS_KNOTS = [20, 35, 65, 80];

const round2 = (value: number) => Math.round(value * 100) / 100;

/** 11 số đo trên thân SP trước khi áp độ sáng, thang 0..100: L50, p10, p90, độ rực, %gần đen, %gần trắng, cờ tự chỉnh, 4 đoạn gãy. */
export function measureBrightnessFeatures(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  body: readonly number[] | null | undefined,
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
  const count = sorted.length;
  const at = (fraction: number) => sorted[Math.floor((count - 1) * fraction)] ?? 0;
  const share = (test: (value: number) => boolean) => (count ? (sorted.filter(test).length / count) * 100 : 0);
  const median = at(0.5);
  return [
    median,
    at(0.1),
    at(0.9),
    count ? chroma / count : 0,
    share((value) => value < DARK_L),
    share((value) => value > BRIGHT_L),
    autoLight ? 100 : 0,
    ...LIGHTNESS_KNOTS.map((knot) => Math.max(0, median - knot)),
  ].map((value) => Math.min(100, Math.max(0, round2(value))));
}

/** Phản hồi BE đủ dạng để đoán; thiếu thì coi như chưa có model. */
export function isUsableBrightnessModel(model: BrightnessModel | null | undefined): model is BrightnessModel {
  if (!model || typeof model.samples !== 'number') return false;
  if (!model.ready) return true;
  return [model.means, model.scales, model.weights].every(
    (values) => Array.isArray(values) && values.length === BRIGHTNESS_FEATURE_COUNT && values.every(Number.isFinite),
  ) && Number.isFinite(model.intercept) && model.scales.every((value) => value !== 0);
}

/** Mức đề xuất theo model; null = chưa có đề xuất. */
export function predictBrightness(model: BrightnessModel, features: readonly number[]): number | null {
  if (!model.ready) return null;
  const raw = features.reduce((sum, value, i) => sum + (model.weights[i] * (value - model.means[i])) / model.scales[i], model.intercept);
  if (!Number.isFinite(raw)) return null;
  return Math.round(Math.min(PRODUCT_BRIGHTNESS_MAX, Math.max(PRODUCT_BRIGHTNESS_MIN, raw)));
}

/** Nguồn của mẫu; null = không học từ ảnh này (không biết model lúc ghép, hoặc nền tự tải lên). */
export function brightnessSource(
  manual: number | null,
  suggested: number | null,
  modelKnown: boolean,
  background: string | null,
): BrightnessSource | null {
  if (!background) return null;
  if (manual !== null) return 'human';
  if (suggested !== null) return 'accepted';
  return modelKnown ? 'default' : null;
}

interface SampleSource {
  status: BatchItemStatus;
  result: {
    mode: BatchMode;
    brightness: number;
    features: number[] | null;
    source: BrightnessSource | null;
    suggested: number | null;
    background: string | null;
  } | null;
}

/** Mẫu học từ các ảnh vừa tải: chỉ ảnh ghép đã xong và có nguồn rõ. */
export function brightnessSamples(items: readonly SampleSource[]): BrightnessSample[] {
  return items.flatMap((item) => {
    const result = item.status === 'done' ? item.result : null;
    if (result?.mode !== 'cutout' || !result.features || !result.source || !result.background) return [];
    return [{
      features: result.features,
      brightness: result.brightness,
      source: result.source,
      background: result.background,
      ...(result.suggested === null ? {} : { suggested: result.suggested }),
    }];
  });
}

/** Dòng tiến độ dưới thanh kéo. */
export function brightnessModelHint(model: BrightnessModel | null): string | null {
  if (!model) return null;
  if (model.ready) return `AI đang tự chỉnh, đã học ${model.samples} ảnh. Kéo tay để sửa, AI sẽ học theo.`;
  return `AI đang học: ${model.samples}/${model.minSamples} ảnh, ${model.humanSamples}/${model.minHumanSamples} ảnh chỉnh tay.`;
}
