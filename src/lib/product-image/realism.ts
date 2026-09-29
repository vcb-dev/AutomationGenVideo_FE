/**
 * Chế độ "Ghép background": làm ảnh ghép giống ảnh chụp thật — bóng dưới chân sản phẩm, ánh sáng
 * khớp với nền, dịu vân ảnh sản phẩm quá sắc. Tính thẳng trên mảng điểm ảnh RGBA (ImageData.data)
 * để test được, không cần canvas; chạy trong trình duyệt nên vẫn 0đ.
 *
 * Hiệu chỉnh theo ẢNH CHỤP THẬT của media (túi đen trên hộp gỗ, túi cao 1267px): độ sáng mặt hộp
 * dưới đáy túi so với chỗ không có bóng — 15% sát đáy, 32% ở 4px, 52% ở 12px, 70% ở 20px, 84% ở
 * 32px. Người dùng xem thử và chốt (2026-09-29): độ đậm 100% (đúng ảnh thật), độ cao 1,8 lần.
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
/** ...nhưng tối đa 1,6 lần — thử trên trình duyệt: vài cột ở mép túi hơi nhấc lên, không giới hạn thì
 *  bóng của chúng kéo dài hơn 100px thành vệt tối dọc xuống dưới chân. */
const MAX_LIFT_STRETCH = 1.6;

const ALPHA_SOLID = 128;

// ─── Bóng dưới chân ────────────────────────────────────────────────────────

/**
 * Kích thước dùng để co giãn độ dài bóng: chiều cao sản phẩm, nhưng không quá 1,3 lần chiều rộng —
 * vật cao mảnh (dây chuyền dựng đứng) có chân nhỏ nên bóng không được dài như túi cùng chiều cao.
 */
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

export interface ShadowLayer {
  width: number;
  /** = chiều cao sản phẩm + phần kéo dài xuống dưới để chứa bóng */
  height: number;
  /** Độ tối 0..255 của từng điểm (lớp đen phủ lên nền: nền × (1 − alpha/255)). */
  alpha: Uint8ClampedArray;
}

/**
 * Bán kính 3 lượt hộp trượt xấp xỉ Gaussian độ lệch `sigma` (Kovesi, "Fast almost-Gaussian
 * filtering"). Gaussian trực tiếp với bóng phần nhấc lên (sigma ~19px) đo trên trình duyệt mất gần
 * 2 giây mỗi lần kéo thanh; hộp trượt tốn thời gian không phụ thuộc bán kính.
 */
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
 * Bóng dưới chân sản phẩm, trong hệ toạ độ của chính ảnh sản phẩm (không phụ thuộc vị trí/kích
 * thước đặt trên nền — kéo, thu phóng không phải tính lại).
 *
 * Mỗi cột có bóng NGAY DƯỚI mép dưới của chính nó: chạm mặt phẳng thì đúng đường cong ảnh thật;
 * nhấc lên (góc gấp, hông phình) thì nhạt và loang dần. Đặt bóng ở cao độ đáy chung cho các cột
 * nhấc lên từng tạo ra đám tối lơ lửng tách khỏi sản phẩm (đã thấy khi thử).
 */
export function buildShadowLayer(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  strength = DEFAULT_SHADOW_STRENGTH,
  heightFactor = DEFAULT_SHADOW_HEIGHT,
): ShadowLayer {
  const edges = bottomEdges(rgba, width, height);
  let bottom = -1;
  for (let x = 0; x < width; x += 1) bottom = Math.max(bottom, edges[x]);
  if (bottom < 0 || strength <= 0) return { width, height, alpha: new Uint8ClampedArray(width * height) };

  const scale = shadowSizeReference(width, height) / REAL_PROFILE_PRODUCT_HEIGHT;
  const lastDistance = REAL_SHADOW_PROFILE[REAL_SHADOW_PROFILE.length - 1][0];
  const columns: { x: number; b: number; fade: number; stretch: number; reach: number; isLifted: boolean }[] = [];
  let layerHeight = height;
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

  // Hai lớp: chỗ chạm mặt phẳng (vệt gọn, chỉ làm mềm ngang) và phần nhấc lên (bóng mềm, loang rộng
  // cả hai chiều). Gộp chung một kiểu làm mềm thì vài cột mép nhấc lên thành vệt tối hẹp kéo dọc
  // xuống — đã thấy khi thử trên trình duyệt.
  const contact = new Float32Array(width * layerHeight).fill(1);
  const lifted = new Float32Array(width * layerHeight).fill(1);
  let hasLifted = false;
  // Mép đáy sau khi tách nền là vài hàng bán trong suốt (đo: độ đặc 222 → 137 → 83 → 40). Bóng chỉ
  // bắt đầu dưới hàng đặc cuối thì mặt phẳng CHƯA có bóng lộ qua các hàng đó thành đường sáng mảnh
  // ngay dưới đáy — nên phủ độ tối sát đáy lên cả dải mép (hàng đặc hoàn toàn thì bị che, vô hại).
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
  blurRows(contact, width, layerHeight, Math.max(1, width * 0.004));
  if (hasLifted) {
    blurRows(lifted, width, layerHeight, Math.max(2, width * 0.02));
    blurColumns(lifted, width, layerHeight, Math.max(1, height * 0.01));
  }
  const factor = new Float32Array(width * layerHeight);
  for (let i = 0; i < factor.length; i += 1) factor[i] = Math.min(contact[i], lifted[i]);

  const alpha = new Uint8ClampedArray(width * layerHeight);
  for (let i = 0; i < factor.length; i += 1) alpha[i] = Math.round((1 - Math.max(0, Math.min(1, factor[i]))) * 255);
  return { width, height: layerHeight, alpha };
}

/**
 * Phần đáy sản phẩm sát mặt phẳng cũng tối lại (mặt phẳng chắn ánh sáng) — ảnh thật gần như đen ở
 * mép tiếp xúc. Cao theo cùng hệ số với bóng; sửa tại chỗ.
 */
export function applySelfOcclusion(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  strength = DEFAULT_SHADOW_STRENGTH,
  heightFactor = DEFAULT_SHADOW_HEIGHT,
) {
  const edges = bottomEdges(rgba, width, height);
  let bottom = -1;
  for (let x = 0; x < width; x += 1) bottom = Math.max(bottom, edges[x]);
  if (bottom < 0 || strength <= 0) return;
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

/**
 * rembg (naive_cutout: Image.composite(ảnh, nền trong suốt, mặt nạ)) trả màu điểm mép ĐÃ NHÂN độ
 * đặc: đo trên ảnh thử, (30,28,28) ở độ đặc 40 thực ra là (191,178,178) — khớp điểm ảnh gốc. Vẽ
 * thẳng lên canvas (hiểu là màu chưa nhân) thì mép tối đi thành đường viền đen mảnh quanh sản phẩm.
 * Chia lại cho độ đặc để lấy màu thật; sửa tại chỗ.
 */
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
 * Viền ám màu nền cũ: ảnh nhà cung cấp chụp trên nền trắng, mép sản phẩm chuyển dần sang trắng qua
 * vài điểm ảnh (đo trên ảnh thử: (80,49,50) → (146,134,133) → (225,218,215)); tách nền giữ lại cả
 * những điểm nhạt này, nhiều điểm gần như đặc. Đặt cạnh bóng tối chúng thành đường sáng mảnh viền
 * quanh sản phẩm — lộ ngay là ảnh ghép.
 *
 * Xét mọi điểm trong dải `band` px sát mép (kể cả điểm đặc); điểm nào sáng hơn hẳn thân sản phẩm
 * ngay bên trong (bán kính `sampleRadius`) thì lấy lại màu thân. Alpha giữ nguyên. Điểm không sáng
 * hơn (chi tiết tối ở mép, viền kim loại cùng tông) giữ nguyên.
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

/**
 * Mức "ánh vàng ấm" 0..1 tự suy từ màu trung bình của ảnh nền: nền càng ngả cam (đèn LED vàng) thì
 * càng kéo sản phẩm (chụp đèn studio trắng) về tông ấm. Nền của ảnh ghép mẫu có chỉ số 0,86 → 1
 * (đúng bản đã duyệt); nền trắng trung tính → 0, không nhuộm vàng sản phẩm.
 */
export function estimateWarmth(meanR: number, meanG: number, meanB: number): number {
  const total = meanR + meanG + meanB;
  if (total <= 0) return 0;
  const warmIndex = ((meanR - meanB) / total) * 3;
  return Math.min(1, Math.max(0, warmIndex / 0.8));
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
 * Kéo ánh sáng của sản phẩm về ánh sáng của cảnh (sửa tại chỗ, giữ nguyên alpha):
 * cân trắng về tông ấm → tối dần từ trên xuống (đèn chiếu từ trên) → giảm tương phản 10% →
 * dịu vân quá sắc (trộn 50% bản làm mờ nhẹ) → hạt nhiễu nhẹ như ảnh chụp.
 */
export function applyLook(rgba: Uint8ClampedArray, width: number, height: number, warmth: number, seed = 1) {
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

  const rgb = new Float32Array(width * height * 3);
  const mean = [0, 0, 0];
  let weight = 0;
  for (let y = 0; y < height; y += 1) {
    const falloff = 1.04 - 0.24 * Math.min(1, Math.max(0, (y - top) / span));
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
