/**
 * Ghép background giống ảnh chụp thật: bóng dưới chân, ánh sáng khớp nền, dịu vân quá sắc. Tính trên mảng RGBA để
 * test được không cần canvas. Số đo bóng hiệu chỉnh theo ảnh chụp thật của media.
 */

// ─── Tham số đã chốt ───────────────────────────────────────────────────────

export const DEFAULT_SHADOW_STRENGTH = 1;
export const DEFAULT_SHADOW_HEIGHT = 1.8;

/** (khoảng cách px dưới đáy khi sản phẩm cao 1267px, độ sáng còn lại của mặt phẳng). */
export const REAL_SHADOW_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0, 0.15],
  [4, 0.32],
  [8, 0.36],
  [12, 0.52],
  [16, 0.63],
  [20, 0.7],
  [24, 0.78],
  [32, 0.84],
  [48, 1],
];
export const REAL_PROFILE_PRODUCT_HEIGHT = 1267;

/** Mép đáy nhìn nghiêng hơi cong theo phối cảnh: lệch trong 2,5% chiều cao vẫn là đang chạm mặt phẳng. */
const CONTACT_TOLERANCE = 0.025;
/** Phần nhấc cao thêm 3% chiều cao → bóng còn ~37%; hông túi phình hẳn lên thì gần như không có bóng. */
const LIFT_FADE = 0.03;
/** Càng nhấc cao bóng càng loang rộng... */
const LIFT_STRETCH = 0.015;
/** ...nhưng tối đa 1,6 lần — tránh vệt tối dọc dưới mép túi nhấc lên. */
const MAX_LIFT_STRETCH = 1.6;

const ALPHA_SOLID = 128;

/** Bóng lan sang hai bên đáy, nhạt dần theo khoảng cách tới mép — ảnh thật có bóng rộng hơn đáy một chút. */
const SIDE_SPREAD = 0.09;
/** Ở mép đáy bóng lan còn bằng độ tối sát đáy × hệ số này. */
const SIDE_STRENGTH = 0.7;

// ─── Bóng dưới chân ────────────────────────────────────────────────────────

/** Kích thước co giãn độ dài bóng: chiều cao SP, không quá 1,3 lần chiều rộng (vật cao mảnh có chân nhỏ). */
export function shadowSizeReference(width: number, height: number): number {
  return Math.min(height, width * 1.3);
}

/** Độ sáng còn lại ở khoảng cách `d` px dưới đáy, với `scale` = kích thước tham chiếu / 1267. */
export function shadowProfileAt(d: number, scale: number): number {
  const points = REAL_SHADOW_PROFILE;
  if (d <= points[0][0] * scale) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [d1, v1] = points[i];
    const [d0, v0] = points[i - 1];
    if (d <= d1 * scale) return v0 + ((v1 - v0) * (d - d0 * scale)) / ((d1 - d0) * scale);
  }
  return 1;
}

/** Hàng thấp nhất có điểm ảnh đặc (alpha ≥ 128) của từng cột; -1 nếu cột trong suốt hoàn toàn. */
export function bottomEdges(rgba: ArrayLike<number>, width: number, height: number): Int32Array {
  const edges = new Int32Array(width).fill(-1);
  for (let x = 0; x < width; x += 1) {
    for (let y = height - 1; y >= 0; y -= 1) {
      if (rgba[(y * width + x) * 4 + 3] >= ALPHA_SOLID) {
        edges[x] = y;
        break;
      }
    }
  }
  return edges;
}

/** Hàng đáy chạm mặt phẳng: đáy thân túi (`baseline`) nếu có, không thì hàng thấp nhất có điểm đặc. */
function contactRow(lowest: number, baseline?: number | null): number {
  return baseline !== undefined && baseline !== null && baseline >= 0 ? Math.min(lowest, Math.round(baseline)) : lowest;
}

/** Phần đáy chạm mặt phẳng: cột trái/phải và hàng đáy (cột lệch khỏi hàng đáy quá CONTACT_TOLERANCE không tính). */
export function footprint(
  rgba: ArrayLike<number>, width: number, height: number, baseline?: number | null,
): { left: number; right: number; bottom: number } | null {
  const edges = bottomEdges(rgba, width, height);
  let lowest = -1;
  for (let x = 0; x < width; x += 1) lowest = Math.max(lowest, edges[x]);
  if (lowest < 0) return null;
  const bottom = contactRow(lowest, baseline);
  let left = -1;
  let right = -1;
  for (let x = 0; x < width; x += 1) {
    if (edges[x] >= 0 && Math.abs(bottom - edges[x]) <= height * CONTACT_TOLERANCE) {
      if (left < 0) left = x;
      right = x;
    }
  }
  return { left, right, bottom };
}

export interface ShadowLayer {
  /** = chiều rộng sản phẩm + 2 × padX */
  width: number;
  /** Lề thêm mỗi bên (px, theo ảnh sản phẩm) để bóng lan ra ngoài hai mép đáy không bị cắt thẳng. */
  padX: number;
  /** = chiều cao sản phẩm + phần kéo dài xuống dưới để chứa bóng */
  height: number;
  /** Độ tối 0..255 của từng điểm (lớp đen phủ lên nền: nền × (1 − alpha/255)). */
  alpha: Uint8ClampedArray;
}

/** Bán kính 3 lượt hộp trượt xấp xỉ Gaussian `sigma` (Kovesi) — nhanh, không phụ thuộc bán kính. */
function boxRadiiForGauss(sigma: number, passes = 3): number[] {
  const ideal = Math.sqrt((12 * sigma * sigma) / passes + 1);
  let lower = Math.floor(ideal);
  if (lower % 2 === 0) lower -= 1;
  const upper = lower + 2;
  const m = Math.round((12 * sigma * sigma - passes * lower * lower - 4 * passes * lower - 3 * passes) / (-4 * lower - 4));
  return Array.from({ length: passes }, (_, i) => ((i < m ? lower : upper) - 1) / 2);
}

/** Một lượt hộp trượt trên `count` phần tử cách nhau `stride` từ `offset`; ngoài biên lặp giá trị mép. */
function boxPass(src: Float32Array, dst: Float32Array, offset: number, stride: number, count: number, radius: number) {
  if (radius <= 0) {
    for (let i = 0; i < count; i += 1) dst[offset + i * stride] = src[offset + i * stride];
    return;
  }
  const at = (i: number) => src[offset + Math.min(count - 1, Math.max(0, i)) * stride];
  const scale = 1 / (radius * 2 + 1);
  let acc = 0;
  for (let i = -radius; i <= radius; i += 1) acc += at(i);
  for (let i = 0; i < count; i += 1) {
    dst[offset + i * stride] = acc * scale;
    acc += at(i + radius + 1) - at(i - radius);
  }
}

function blurAxis(values: Float32Array, width: number, height: number, sigma: number, axis: 'rows' | 'columns') {
  let src: Float32Array = values;
  let dst: Float32Array = new Float32Array(values.length);
  for (const radius of boxRadiiForGauss(sigma)) {
    if (axis === 'rows') for (let y = 0; y < height; y += 1) boxPass(src, dst, y * width, 1, width, radius);
    else for (let x = 0; x < width; x += 1) boxPass(src, dst, x, width, height, radius);
    [src, dst] = [dst, src];
  }
  if (src !== values) values.set(src);
}

/** Làm mờ theo chiều NGANG từng hàng (tại chỗ). Không làm mờ dọc — sẽ xoá mất vệt đen sát đáy. */
function blurRows(values: Float32Array, width: number, height: number, sigma: number) {
  blurAxis(values, width, height, sigma, 'rows');
}

/** Làm mờ theo chiều DỌC từng cột (tại chỗ) — chỉ dùng cho bóng của phần nhấc lên. */
function blurColumns(values: Float32Array, width: number, height: number, sigma: number) {
  blurAxis(values, width, height, sigma, 'columns');
}

/**
 * Bóng dưới chân SP, theo toạ độ ảnh SP. Mỗi cột có bóng ngay dưới mép dưới của nó: chạm mặt phẳng thì theo đường cong
 * ảnh thật; nhấc lên thì nhạt và loang dần.
 */
export function buildShadowLayer(
  rgba: ArrayLike<number>,
  productWidth: number,
  height: number,
  strength = DEFAULT_SHADOW_STRENGTH,
  heightFactor = DEFAULT_SHADOW_HEIGHT,
  baseline?: number | null,
): ShadowLayer {
  // Lớp bóng rộng hơn ảnh SP mỗi bên padX để bóng lan ra ngoài mép đáy không bị cắt thẳng.
  const padX = Math.ceil(productWidth * (SIDE_SPREAD * 2 + 0.02)) + 2;
  const width = productWidth + 2 * padX;
  const padded = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < productWidth; x += 1) {
      const from = (y * productWidth + x) * 4;
      const to = (y * width + x + padX) * 4;
      padded[to] = rgba[from];
      padded[to + 1] = rgba[from + 1];
      padded[to + 2] = rgba[from + 2];
      padded[to + 3] = rgba[from + 3];
    }
  }
  rgba = padded;
  const edges = bottomEdges(rgba, width, height);
  let lowest = -1;
  for (let x = 0; x < width; x += 1) lowest = Math.max(lowest, edges[x]);
  if (lowest < 0 || strength <= 0) return { width, padX, height, alpha: new Uint8ClampedArray(width * height) };
  // Cột thấp hơn hàng đáy (dây/khoá thòng xuống) có bóng sát mép dưới của chính nó như phần chạm mặt phẳng.
  const bottom = contactRow(lowest, baseline);

  const scale = shadowSizeReference(productWidth, height) / REAL_PROFILE_PRODUCT_HEIGHT;
  const lastDistance = REAL_SHADOW_PROFILE[REAL_SHADOW_PROFILE.length - 1][0];
  const columns: { x: number; b: number; fade: number; stretch: number; reach: number; isLifted: boolean }[] = [];
  let layerHeight = height;
  // Phần đáy chạm mặt phẳng (cột không nhấc lên) — nơi bóng lan sang hai bên.
  const foot = footprint(rgba, width, height, bottom);
  const footLeft = foot ? foot.left : -1;
  const footRight = foot ? foot.right : -1;
  const footWidth = footRight - footLeft + 1;
  for (let x = 0; x < width; x += 1) {
    const b = edges[x];
    if (b < 0) continue;
    const lift = Math.max(0, bottom - b - height * CONTACT_TOLERANCE);
    const fade = Math.exp(-lift / (height * LIFT_FADE));
    if (fade < 0.03) continue;
    const stretch = Math.min(MAX_LIFT_STRETCH, 1 + lift / (height * LIFT_STRETCH)) * heightFactor;
    const reach = Math.ceil(lastDistance * scale * stretch) + 2;
    columns.push({ x, b, fade, stretch, reach, isLifted: lift > 0 });
    layerHeight = Math.max(layerHeight, b + 1 + reach);
  }

  // Hai lớp: chỗ chạm mặt phẳng (chỉ làm mềm ngang) và phần nhấc lên (loang cả hai chiều).
  const contact = new Float32Array(width * layerHeight).fill(1);
  const lifted = new Float32Array(width * layerHeight).fill(1);
  let hasLifted = false;
  // Phủ độ tối sát đáy lên cả dải mép bán trong suốt — không thì lộ đường sáng mảnh ngay dưới đáy.
  const underPad = Math.max(3, Math.round(height * 0.006));
  for (const { x, b, fade, stretch, reach, isLifted } of columns) {
    const target = isLifted ? lifted : contact;
    if (isLifted) hasLifted = true;
    const contactValue = 1 - strength * fade * (1 - shadowProfileAt(0, scale));
    for (let y = Math.max(0, b - underPad); y <= b; y += 1) {
      const index = y * width + x;
      if (contactValue < target[index]) target[index] = contactValue;
    }
    for (let d = 0; d < reach; d += 1) {
      const index = (b + 1 + d) * width + x;
      const value = 1 - strength * fade * (1 - shadowProfileAt(d / stretch, scale));
      if (value < target[index]) target[index] = value;
    }
  }
  blurRows(contact, width, layerHeight, Math.max(1, productWidth * 0.004));
  if (hasLifted) {
    blurRows(lifted, width, layerHeight, Math.max(2, productWidth * 0.02));
    blurColumns(lifted, width, layerHeight, Math.max(1, height * 0.01));
  }
  const factor = new Float32Array(width * layerHeight);
  for (let i = 0; i < factor.length; i += 1) factor[i] = Math.min(contact[i], lifted[i]);
  // Bóng lan ra ngoài hai mép đáy; lấy min để dưới đáy vẫn đúng số đo ảnh thật.
  if (footLeft >= 0) {
    const spread = Math.max(2, footWidth * SIDE_SPREAD);
    const stretch = heightFactor;
    const reach = Math.ceil(lastDistance * scale * stretch) + 2;
    layerHeight = Math.max(layerHeight, bottom + 1 + reach);
    const grown = new Float32Array(width * layerHeight).fill(1);
    grown.set(factor.subarray(0, Math.min(factor.length, grown.length)));
    for (let x = Math.max(0, Math.floor(footLeft - spread * 2)); x < Math.min(width, Math.ceil(footRight + spread * 2)); x += 1) {
      const gap = x < footLeft ? footLeft - x : x > footRight ? x - footRight : 0;
      if (gap === 0) continue;
      const side = SIDE_STRENGTH * Math.exp(-((gap / spread) ** 2));
      for (let d = -1; d < reach; d += 1) {
        const index = (bottom + 1 + d) * width + x;
        const value = 1 - strength * side * (1 - shadowProfileAt(Math.max(0, d) / stretch, scale));
        if (value < grown[index]) grown[index] = value;
      }
    }
    blurRows(grown, width, layerHeight, Math.max(1, productWidth * 0.004));
    for (let i = 0; i < Math.min(factor.length, grown.length); i += 1) grown[i] = Math.min(grown[i], factor[i]);
    const alpha = new Uint8ClampedArray(width * layerHeight);
    for (let i = 0; i < grown.length; i += 1) alpha[i] = Math.round((1 - Math.max(0, Math.min(1, grown[i]))) * 255);
    return { width, padX, height: layerHeight, alpha };
  }

  const alpha = new Uint8ClampedArray(width * layerHeight);
  for (let i = 0; i < factor.length; i += 1) alpha[i] = Math.round((1 - Math.max(0, Math.min(1, factor[i]))) * 255);
  return { width, padX, height: layerHeight, alpha };
}

/** Phần đáy SP sát mặt phẳng tối lại (mặt phẳng chắn sáng). Sửa tại chỗ. */
export function applySelfOcclusion(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  strength = DEFAULT_SHADOW_STRENGTH,
  heightFactor = DEFAULT_SHADOW_HEIGHT,
  baseline?: number | null,
) {
  const edges = bottomEdges(rgba, width, height);
  let lowest = -1;
  for (let x = 0; x < width; x += 1) lowest = Math.max(lowest, edges[x]);
  if (lowest < 0 || strength <= 0) return;
  const bottom = contactRow(lowest, baseline);
  const band = height * 0.07 * heightFactor;
  const contactBand = height * 0.012;
  for (let y = 0; y <= bottom; y += 1) {
    const broad = 1 - 0.35 * strength * Math.min(1, Math.max(0, (y - (bottom - band)) / band));
    const contact = 1 - 0.6 * strength * Math.min(1, Math.max(0, (y - (bottom - contactBand)) / contactBand));
    const k = Math.max(0, broad * contact);
    if (k >= 1) continue;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      rgba[i] *= k;
      rgba[i + 1] *= k;
      rgba[i + 2] *= k;
    }
  }
}

// ─── Khử viền ──────────────────────────────────────────────────────────────

/** Độ đặc dưới mức này mà nằm xa mọi phần rõ nét của sản phẩm thì là cặn nền rembg để sót. */
export const RESIDUE_MAX_ALPHA = 48;

/** Khoảng giữ lại quanh phần rõ nét — theo độ phóng mặt nạ rembg. */
export function residueReach(width: number, height: number): number {
  return Math.max(2, Math.ceil((3 * Math.max(width, height)) / 1024));
}

/**
 * Xoá lớp nền rất mờ rembg để sót trong khoảng hở (lỗ quai): điểm độ đặc < RESIDUE_MAX_ALPHA cách mọi điểm rõ nét
 * quá `reach` px. Sửa tại chỗ.
 */
export function clearMatteResidue(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  reach = residueReach(width, height),
) {
  const count = width * height;
  const clear = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) clear[i] = rgba[i * 4 + 3] >= RESIDUE_MAX_ALPHA ? 1 : 0;
  // Dãn vùng rõ nét ra `reach` px (ô vuông) bằng tổng cộng dồn: theo hàng rồi theo cột.
  const near = new Uint8Array(count);
  const prefix = new Int32Array(Math.max(width, height) + 1);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) prefix[x + 1] = prefix[x] + clear[y * width + x];
    for (let x = 0; x < width; x += 1) {
      near[y * width + x] = prefix[Math.min(width, x + reach + 1)] - prefix[Math.max(0, x - reach)] > 0 ? 1 : 0;
    }
  }
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) prefix[y + 1] = prefix[y] + near[y * width + x];
    for (let y = 0; y < height; y += 1) {
      const i = y * width + x;
      const a = rgba[i * 4 + 3];
      if (a === 0 || a >= RESIDUE_MAX_ALPHA) continue;
      if (prefix[Math.min(height, y + reach + 1)] - prefix[Math.max(0, y - reach)] > 0) continue;
      rgba[i * 4] = 0;
      rgba[i * 4 + 1] = 0;
      rgba[i * 4 + 2] = 0;
      rgba[i * 4 + 3] = 0;
    }
  }
}

/** rembg trả màu mép đã nhân độ đặc → chia lại để lấy màu thật (tránh viền đen mảnh). Sửa tại chỗ. */
export function unpremultiplyEdges(rgba: Uint8ClampedArray) {
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a === 0 || a === 255) continue;
    const k = 255 / a;
    rgba[i] = Math.min(255, Math.round(rgba[i] * k));
    rgba[i + 1] = Math.min(255, Math.round(rgba[i + 1] * k));
    rgba[i + 2] = Math.min(255, Math.round(rgba[i + 2] * k));
  }
}

/**
 * Khử viền ám màu nền cũ: trong dải `band` px sát mép, điểm sáng hơn hẳn thân SP ngay bên trong thì lấy lại màu thân.
 * Alpha giữ nguyên.
 */
export function defringeEdges(rgba: Uint8ClampedArray, width: number, height: number, band = 2, sampleRadius = 6) {
  const source = new Uint8ClampedArray(rgba);
  const count = width * height;
  const solid = (i: number) => source[i * 4 + 3] >= ALPHA_SOLID;
  const edge = new Uint8Array(count);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (source[i * 4 + 3] === 0) continue;
      search: for (let dy = -band; dy <= band; dy += 1) {
        for (let dx = -band; dx <= band; dx += 1) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height || !solid(yy * width + xx)) {
            edge[i] = 1;
            break search;
          }
        }
      }
    }
  }
  const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (!edge[i]) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let dy = -sampleRadius; dy <= sampleRadius; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -sampleRadius; dx <= sampleRadius; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          const j = yy * width + xx;
          if (edge[j] || source[j * 4 + 3] < 250) continue;
          r += source[j * 4];
          g += source[j * 4 + 1];
          b += source[j * 4 + 2];
          n += 1;
        }
      }
      if (n === 0) continue;
      r /= n;
      g /= n;
      b /= n;
      const p = i * 4;
      if (luminance(source[p], source[p + 1], source[p + 2]) <= luminance(r, g, b) + 20) continue;
      rgba[p] = Math.round(r);
      rgba[p + 1] = Math.round(g);
      rgba[p + 2] = Math.round(b);
    }
  }
}

// ─── Ánh sáng khớp với nền ─────────────────────────────────────────────────

/** Mức ánh vàng ấm 0..1 suy từ màu trung bình ảnh nền (nền ngả cam → nhuộm ấm SP). */
export function estimateWarmth(meanR: number, meanG: number, meanB: number): number {
  const total = meanR + meanG + meanB;
  if (total <= 0) return 0;
  const warmIndex = ((meanR - meanB) / total) * 3;
  return Math.min(1, Math.max(0, warmIndex / 0.8));
}

/** Mức nhuộm ấm cần thêm cho SP: chỉ phần nền ấm hơn nơi chụp SP (không nhuộm chồng ảnh đã chụp dưới đèn vàng). */
export function addedWarmth(sceneWarmth: number, sourceWarmth: number): number {
  return Math.min(1, Math.max(0, sceneWarmth - sourceWarmth));
}

/** Nơi chụp SP ấm ít nhất tỉ lệ này của độ ấm nền = chụp dưới cùng kiểu đèn. */
export const SAME_LIGHT_MIN_FRACTION = 0.4;

/** SP chụp dưới cùng kiểu đèn với nền: giữ ánh sáng gốc, không chỉnh đèn studio / làm sáng / nhuộm ấm. */
export function sameLightAsScene(sceneWarmth: number, sourceWarmth: number): boolean {
  return sceneWarmth > 0 && sourceWarmth >= sceneWarmth * SAME_LIGHT_MIN_FRACTION;
}

// ─── Số đo ánh sáng từ ảnh chụp thật (thang L*) ─────────────────────────────

/** Ảnh thật: thân túi phần trên sáng hơn phần dưới chừng này (trung vị L*). */
export const REAL_TOP_LIGHT_DIFF = 10.7;
/** Khoảng độ tối dần từ đỉnh xuống đáy được chọn (nhân vào màu) — ngoài khoảng này đổi màu SP quá tay. */
export const FALLOFF_MIN = 0.12;
export const FALLOFF_MAX = 0.42;
/** Ảnh thật: mặt đặt dưới chân sáng hơn vùng quanh túi chừng này (trung vị L*). */
export const REAL_SURFACE_ABOVE_SURROUND = 2.6;
/** Vùng tối loang dưới chân đậm nhất bấy nhiêu ở giữa — đậm hơn thì thành vệt đen rõ, nhìn giả. */
export const SURFACE_POOL_MAX = 0.35;

function srgbToLinear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Độ sáng cảm nhận L* (CIELAB, 0–100) của màu sRGB 0–255. */
export function lightness(r: number, g: number, b: number): number {
  const y = 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
}

// ─── Đèn studio trên thân túi, độ sáng SP theo cảnh ──────────────────────────
// Đèn chính diện, mềm: không đánh sáng lệch trái/phải; đưa phân bố sáng trên→dưới của thân SP về kiểu studio.

/** Kiểu đèn studio: độ sáng (L*) 6 dải ngang của thân túi từ trên xuống, so với trung vị cả thân (đo trên ảnh thật). */
export const STUDIO_BODY_PROFILE: readonly number[] = [3.0, 2.2, 1.2, 0.4, -0.9, -5.4];
/** Bù chừng này phần khoảng thiếu so với kiểu studio — giữ một phần đèn gốc của SP cho tự nhiên. */
export const STUDIO_STRENGTH = 0.7;
/** Mỗi dải đổi nhiều nhất ± chừng này L* — tránh đổi hẳn sắc độ của SP. */
export const STUDIO_MAX_SHIFT = 10;

/** Ánh sáng cảnh của ảnh nền. */
export interface SceneLight {
  /** Độ sáng trung vị của cả ảnh nền (L*). */
  lightness: number;
}

/** SP sáng lên ×1,2 (ánh sáng tuyến tính) ở cảnh sáng cỡ nền mẫu; cảnh sáng hơn/tối hơn thì theo cảnh. */
export const PRODUCT_EXPOSURE = 1.2;
export const PRODUCT_EXPOSURE_MIN = 1.05;
export const PRODUCT_EXPOSURE_MAX = 1.35;
/** Độ sáng cảnh (L*) ứng với PRODUCT_EXPOSURE — ≈ 2 nền mẫu (33 và 30). */
export const REFERENCE_SCENE_L = 30;

/** Độ sáng cảnh = trung vị L* cả ảnh nền. */
export function analyzeSceneLight(data: ArrayLike<number>, width: number, height: number): SceneLight {
  return { lightness: medianLightness(data, width, height, 0, 0, width, height, 8) ?? REFERENCE_SCENE_L };
}

/** Mức sáng lên của SP theo độ sáng cảnh: cảnh càng sáng SP càng cần sáng theo (kẹp MIN..MAX). */
export function productExposureFor(sceneLightness: number): number {
  const ratio = luminanceOf(sceneLightness) / luminanceOf(REFERENCE_SCENE_L);
  return Math.min(PRODUCT_EXPOSURE_MAX, Math.max(PRODUCT_EXPOSURE_MIN, PRODUCT_EXPOSURE * ratio ** 0.3));
}

/**
 * Hệ số nhân cho từng hàng ảnh SP để phân bố sáng trên thân về kiểu studio (đo lưới 6×6 khung thân, bù một phần, kẹp
 * ±STUDIO_MAX_SHIFT). Không đủ điểm thân → null.
 */
export function studioRowFactors(
  rgba: ArrayLike<number>, width: number, height: number, body: readonly number[], gains: readonly number[],
): Float32Array | null {
  const N = STUDIO_BODY_PROFILE.length;
  const x0 = Math.max(0, Math.floor(body[0]));
  const y0 = Math.max(0, Math.floor(body[1]));
  const x1 = Math.min(width, Math.ceil(body[2]));
  const y1 = Math.min(height, Math.ceil(body[3]));
  if (x1 - x0 < N || y1 - y0 < N) return null;
  const cells: number[][] = Array.from({ length: N * N }, () => []);
  const all: number[] = [];
  const step = Math.max(1, Math.floor(Math.min(x1 - x0, y1 - y0) / 120));
  for (let y = y0; y < y1; y += step) {
    const row = Math.min(N - 1, Math.floor(((y - y0) * N) / (y1 - y0)));
    for (let x = x0; x < x1; x += step) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] < 200) continue;
      const l = lightness(
        Math.min(255, rgba[i] * gains[0]), Math.min(255, rgba[i + 1] * gains[1]), Math.min(255, rgba[i + 2] * gains[2]),
      );
      cells[row * N + Math.min(N - 1, Math.floor(((x - x0) * N) / (x1 - x0)))].push(l);
      all.push(l);
    }
  }
  if (all.length < 50) return null;
  const median = (values: number[]) => { const s = [...values].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const bodyL = median(all);
  const shift = new Array<number>(N).fill(0);
  for (let r = 0; r < N - 1; r += 1) {
    const rowValues = [];
    for (let c = 0; c < N; c += 1) if (cells[r * N + c].length >= 5) rowValues.push(median(cells[r * N + c]) - bodyL);
    if (!rowValues.length) continue;
    const gap = STUDIO_BODY_PROFILE[r] - median(rowValues);
    shift[r] = STUDIO_STRENGTH * Math.max(-STUDIO_MAX_SHIFT, Math.min(STUDIO_MAX_SHIFT, gap));
  }
  shift[N - 1] = shift[N - 2];
  const reference = luminanceOf(bodyL);
  const factors = new Float32Array(height);
  for (let y = 0; y < height; y += 1) {
    // Toạ độ theo tâm từng dải; ngoài khung thân thì giữ mức của dải đầu/cuối.
    const t = Math.max(0, Math.min(N - 1, ((y - y0) * N) / (y1 - y0) - 0.5));
    const r0 = Math.floor(t);
    const r1 = Math.min(N - 1, r0 + 1);
    const delta = shift[r0] + (shift[r1] - shift[r0]) * (t - r0);
    const k = luminanceOf(Math.max(0, bodyL + delta)) / Math.max(1e-6, reference);
    factors[y] = k ** (1 / 2.2);
  }
  return factors;
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

/** SP sáng lên `gain` lần (ánh sáng tuyến tính) có "vai" để chỗ gần trắng không cháy. Giữ alpha và tỉ lệ màu. */
export function brightenProduct(rgba: Uint8ClampedArray, gain = PRODUCT_EXPOSURE) {
  if (gain <= 1) return;
  const table = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v += 1) {
    const y = srgbToLinear(v);
    table[v] = linearToSrgb((y * gain) / (1 + (gain - 1) * y));
  }
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    rgba[i] = table[rgba[i]];
    rgba[i + 1] = table[rgba[i + 1]];
    rgba[i + 2] = table[rgba[i + 2]];
  }
}

/** Ngược của `lightness` cho xám: L* → độ chói tuyến tính Y (0–1). */
function luminanceOf(l: number): number {
  return l > 8 ? ((l + 16) / 116) ** 3 : l / (24389 / 27);
}

/** Trung vị L* của vùng chữ nhật trong ảnh RGBA (lấy mẫu cách `step` điểm; bỏ điểm trong suốt). */
export function medianLightness(
  data: ArrayLike<number>, width: number, height: number,
  x0: number, y0: number, x1: number, y1: number, step = 3,
): number | null {
  const values: number[] = [];
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(height, Math.ceil(y1)); y += step) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(width, Math.ceil(x1)); x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue;
      values.push(lightness(data[i], data[i + 1], data[i + 2]));
    }
  }
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

/** Độ đậm vùng tối dưới chân: mặt đặt càng sáng hơn quanh túi so với ảnh thật thì càng tối lại. */
export function surfacePoolStrength(surfaceL: number | null, surroundL: number | null): number {
  if (surfaceL === null || surroundL === null) return 0;
  const target = surroundL + REAL_SURFACE_ABOVE_SURROUND;
  if (surfaceL <= target) return 0;
  return Math.min(SURFACE_POOL_MAX, 1 - luminanceOf(target) / luminanceOf(surfaceL));
}

/** Độ tối dần từ đỉnh xuống đáy để phần trên SP sáng hơn phần dưới như ảnh thật. */
export function chooseFalloff(
  rgba: ArrayLike<number>, width: number, height: number, top: number, bottom: number, gains: readonly number[],
): number {
  const span = Math.max(1, bottom - top);
  const third = span / 3;
  const samples: { t: number; r: number; g: number; b: number }[] = [];
  for (let y = top; y <= bottom; y += 2) {
    const t = (y - top) / span;
    if (y > top + third && y < bottom - third) continue;
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] < ALPHA_SOLID) continue;
      samples.push({ t, r: rgba[i] * gains[0], g: rgba[i + 1] * gains[1], b: rgba[i + 2] * gains[2] });
    }
  }
  let best = FALLOFF_MIN;
  let bestError = Infinity;
  for (let range = FALLOFF_MIN; range <= FALLOFF_MAX + 1e-9; range += 0.02) {
    let topSum = 0, topCount = 0, bottomSum = 0, bottomCount = 0;
    for (const { t, r, g, b } of samples) {
      const k = 1.04 - range * t;
      const l = lightness(Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k));
      if (t <= 1 / 3) { topSum += l; topCount += 1; } else { bottomSum += l; bottomCount += 1; }
    }
    if (!topCount || !bottomCount) return 0.24;
    const error = Math.abs(topSum / topCount - bottomSum / bottomCount - REAL_TOP_LIGHT_DIFF);
    if (error < bestError) { bestError = error; best = range; }
  }
  return best;
}

/** PRNG có seed — hạt nhiễu giống hệt nhau giữa xem trước và ảnh xuất, test lặp lại được. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Làm mờ Gaussian 2 chiều cho 3 kênh màu (ảnh sản phẩm nhỏ, chạy một lần mỗi khi đổi tham số). */
function blurRgb(src: Float32Array, width: number, height: number, sigma: number): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel: number[] = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i += 1) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(v);
    sum += v;
  }
  const k = kernel.map((v) => v / sum);
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        let acc = 0;
        for (let j = -radius; j <= radius; j += 1) {
          const xx = Math.min(width - 1, Math.max(0, x + j));
          acc += src[(y * width + xx) * 3 + c] * k[j + radius];
        }
        tmp[(y * width + x) * 3 + c] = acc;
      }
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        let acc = 0;
        for (let j = -radius; j <= radius; j += 1) {
          const yy = Math.min(height - 1, Math.max(0, y + j));
          acc += tmp[(yy * width + x) * 3 + c] * k[j + radius];
        }
        out[(y * width + x) * 3 + c] = acc;
      }
    }
  }
  return out;
}

/**
 * Kéo ánh sáng SP về ánh sáng cảnh (sửa tại chỗ, giữ alpha): nhuộm ấm → phân bố sáng kiểu studio → giảm tương phản
 * → dịu vân quá sắc → hạt nhiễu nhẹ.
 */
export function applyLook(
  rgba: Uint8ClampedArray, width: number, height: number, warmth: number, seed = 1, body?: readonly number[] | null,
) {
  const w = Math.min(1, Math.max(0, warmth));
  const gains = [1 + 0.06 * w, 1 - 0.01 * w, 1 - 0.14 * w];

  let top = -1;
  let bottom = -1;
  for (let y = 0; y < height && top < 0; y += 1) {
    for (let x = 0; x < width; x += 1) if (rgba[(y * width + x) * 4 + 3] >= ALPHA_SOLID) { top = y; break; }
  }
  const edges = bottomEdges(rgba, width, height);
  for (let x = 0; x < width; x += 1) bottom = Math.max(bottom, edges[x]);
  if (top < 0 || bottom < 0) return;
  const span = Math.max(1, bottom - top);
  // Có khung thân: phân bố sáng kiểu studio; không có: tối dần tuyến tính.
  const studio = body ? studioRowFactors(rgba, width, height, body, gains) : null;
  const range = studio ? 0 : chooseFalloff(rgba, width, height, top, bottom, gains);

  const rgb = new Float32Array(width * height * 3);
  const mean = [0, 0, 0];
  let weight = 0;
  for (let y = 0; y < height; y += 1) {
    const falloff = studio ? studio[y] : 1.04 - range * Math.min(1, Math.max(0, (y - top) / span));
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const a = rgba[i * 4 + 3] / 255;
      for (let c = 0; c < 3; c += 1) {
        const v = (rgba[i * 4 + c] / 255) * gains[c] * falloff;
        rgb[i * 3 + c] = v;
        mean[c] += v * a;
      }
      weight += a;
    }
  }
  if (weight <= 0) return;
  for (let c = 0; c < 3; c += 1) mean[c] /= weight;
  for (let i = 0; i < width * height; i += 1) {
    for (let c = 0; c < 3; c += 1) rgb[i * 3 + c] = mean[c] + (rgb[i * 3 + c] - mean[c]) * 0.9;
  }

  const soft = blurRgb(rgb, width, height, 0.9);
  const random = mulberry32(seed);
  for (let i = 0; i < width * height; i += 1) {
    // Tổng 3 số ngẫu nhiên đều ≈ phân phối chuẩn; lệch chuẩn ~0,012 (≈3/255) như bản đã duyệt.
    const noise = (random() + random() + random() - 1.5) * 0.024;
    for (let c = 0; c < 3; c += 1) {
      const v = rgb[i * 3 + c] * 0.5 + soft[i * 3 + c] * 0.5 + noise;
      rgba[i * 4 + c] = Math.round(Math.min(1, Math.max(0, v)) * 255);
    }
  }
}
