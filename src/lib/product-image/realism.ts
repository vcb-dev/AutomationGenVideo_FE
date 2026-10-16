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

/**
 * Bóng lan sang hai bên đáy: mặt hộp ngay cạnh đáy SP cũng bị chính SP che bớt ánh đèn trần — ảnh chụp
 * thật có bóng rộng hơn đáy một chút, còn bóng theo từng cột chỉ nằm đúng dưới đáy nên túi trông như
 * "đặt hờ" (người dùng thấy ảnh ghép giả, 10/10). Dưới đáy giữ nguyên số đo ảnh thật; chỉ phần lan ra
 * ngoài mép đáy là mới, nhạt dần theo khoảng cách tới mép.
 */
const SIDE_SPREAD = 0.09;
/** Ở mép đáy bóng lan còn bằng độ tối sát đáy × hệ số này. */
const SIDE_STRENGTH = 0.7;

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

/**
 * Hàng đáy chạm mặt phẳng: đáy THÂN túi (`baseline`, từ khung thân AI trả) nếu có, không thì hàng thấp nhất có điểm đặc.
 * Lấy hàng thấp nhất khi có dây/khoá thòng thấp hơn thân (soát 15/10: khoá Picotin, dây đeo trải phía trước) thì thân
 * túi bị coi là "nhấc lên" → gần như không có bóng sát đáy → túi trông lơ lửng.
 */
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
  productWidth: number,
  height: number,
  strength = DEFAULT_SHADOW_STRENGTH,
  heightFactor = DEFAULT_SHADOW_HEIGHT,
  baseline?: number | null,
): ShadowLayer {
  // Lớp bóng rộng hơn ảnh SP mỗi bên padX: bóng lan ra ngoài mép đáy (SIDE_SPREAD, tới 2 lần độ lan + phần làm mềm)
  // từng bị cắt đúng mép ảnh SP thành 2 cạnh dọc — trên hộp gỗ trông như tấm kính dưới đáy túi (soát 15/10, lộ ra khi
  // ảnh tách nền được cắt sát túi).
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
  blurRows(contact, width, layerHeight, Math.max(1, productWidth * 0.004));
  if (hasLifted) {
    blurRows(lifted, width, layerHeight, Math.max(2, productWidth * 0.02));
    blurColumns(lifted, width, layerHeight, Math.max(1, height * 0.01));
  }
  const factor = new Float32Array(width * layerHeight);
  for (let i = 0; i < factor.length; i += 1) factor[i] = Math.min(contact[i], lifted[i]);
  // Bóng lan ra ngoài hai mép đáy: cùng đường cong độ sâu như ảnh thật, nhạt dần theo khoảng cách tới mép.
  // Lấy min với bóng đã có nên dưới đáy vẫn đúng số đo ảnh thật.
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

/**
 * Khoảng giữ lại quanh phần rõ nét: dải khử răng cưa ở mép rộng theo độ phóng mặt nạ của rembg
 * (mô hình chạy ở 1024px) — ảnh SP 426px còn ~1px, ảnh 2000px rộng tới 4–5px.
 */
export function residueReach(width: number, height: number): number {
  return Math.max(2, Math.ceil((3 * Math.max(width, height)) / 1024));
}

/**
 * rembg hay để sót một lớp nền rất mờ trong khoảng hở kín như lỗ quai túi — đo trên ảnh túi nhà
 * cung cấp người dùng gửi (2026-09-29): gần hết lỗ quai có độ đặc 6–20/255 chứ không phải 0. Lớp này
 * mang màu nền trắng của ảnh gốc; sau khi `unpremultiplyEdges` chia lại màu nó thành mảng mờ sáng như
 * kính trên nền tối (người dùng thấy "cái gì bóng bóng" giữa quai).
 *
 * Điểm có độ đặc < RESIDUE_MAX_ALPHA mà cách mọi điểm ≥ RESIDUE_MAX_ALPHA quá `reach` px thì xoá
 * hẳn. Điểm sát phần rõ nét giữ nguyên: dải khử răng cưa ở mép, rìa mờ của dây chuyền mảnh (lõi dây
 * đặc hơn 48 nên chính nó cũng được giữ). Sửa tại chỗ.
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

/**
 * Mức nhuộm ấm cần thêm cho SP: chỉ phần nền ẤM HƠN nơi chụp SP. Kiểm chứng 15/10 trên 15 ảnh túi chụp thật trong phòng
 * media (cắt túi ra ghép lại lên nền trống, so với chính ảnh chụp đó): nhuộm theo nền mà không trừ ánh sáng nơi chụp thì
 * túi đã chụp dưới đèn vàng bị nhuộm lần nữa — kênh xanh tụt ~25%, túi be thành vàng đậm. Ảnh catalog phông trắng (nơi
 * chụp trung tính) vẫn nhuộm đủ.
 */
export function addedWarmth(sceneWarmth: number, sourceWarmth: number): number {
  return Math.min(1, Math.max(0, sceneWarmth - sourceWarmth));
}

/**
 * Nơi chụp SP ấm ít nhất tỉ lệ này của độ ấm nền = chụp dưới cùng kiểu đèn — xem sameLightAsScene. Đo 15/10: viền ảnh túi
 * chụp trong phòng media ấm 0,46–1,0 (nền mẫu 1,0); ảnh catalog/Google/Pexels phông trắng đều 0.
 */
export const SAME_LIGHT_MIN_FRACTION = 0.4;

/**
 * SP chụp dưới cùng kiểu đèn với nền (ảnh chụp sẵn trong phòng media): giữ nguyên ánh sáng gốc, KHÔNG chỉnh kiểu đèn
 * studio / làm sáng / nhuộm ấm. Kiểm chứng 15/10 (15 túi chụp thật, ghép lại lên nền trống, so chính ảnh chụp): các bước
 * đó vốn để đưa ảnh catalog về đèn studio, áp lên ảnh đã chụp đúng đèn thì kéo mất vùng sáng bóng phía trên thân (tới
 * −6 L*), túi tối và vàng hơn ảnh thật.
 */
export function sameLightAsScene(sceneWarmth: number, sourceWarmth: number): boolean {
  return sceneWarmth > 0 && sourceWarmth >= sceneWarmth * SAME_LIGHT_MIN_FRACTION;
}

// ─── Số đo ánh sáng từ ảnh chụp thật ───────────────────────────────────────
//
// Đo 10/10 trên 100 ảnh túi trên hộp/kệ của phòng media và 8 ảnh ghép, cùng một cách đo (thang L* 0–100):
// độ sáng và tương phản thân túi khớp nhau (38 vs 35; 14,6 vs 14,6), nhưng (1) túi thật sáng hơn ở trên
// so với dưới +10,7 (đèn trần), túi ghép chỉ +7,8; (2) mặt đặt ngay dưới chân túi thật chỉ sáng hơn vùng
// quanh túi +2,6 (túi che đèn trần), còn ảnh ghép +18 (mặt hộp nền mẫu sáng trưng ngay sát chân túi).

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
//
// Phân tích đèn 10/10 trên 100 ảnh chụp thật của phòng media (túi trên hộp gỗ): đèn chính là nguồn lớn, mềm,
// đặt CHÍNH DIỆN hơi cao hơn máy — trái/phải gần đối xứng (chênh trung vị +1,8 L*, so với ~18 trên↔dưới), mép
// trên thân sáng nhất, giữa thân phẳng, đáy tối nhanh; đèn LED vàng trên kệ chỉ là đèn trang trí phía sau. Ảnh
// SP người dùng thì chụp đủ kiểu đèn. Nên: KHÔNG đánh sáng lệch trái/phải; đưa phân bố sáng từ trên xuống của
// thân SP về đúng kiểu studio (STUDIO_BODY_PROFILE), chỉ bù phần thiếu để túi đã có đèn trên mạnh không bị
// sáng chồng; dải đáy để lớp bóng sát đáy (applySelfOcclusion, đã hiệu chỉnh theo ảnh thật) lo.

/**
 * Kiểu đèn studio: độ sáng (L*) 6 dải ngang của thân túi, từ trên xuống, so với trung vị cả thân. Đo lại 12/10
 * trên 457 ảnh túi chụp thật Tháng 7–9 (43 mẫu), đúng cách hàm dưới đo SP (lưới 6×6, trung vị ô, trung vị theo
 * hàng): các đợt chụp gần đây đèn mềm hơn — mép trên chỉ +3,0 (khoảng tin cậy 95% +1,9..+4,0), bộ ảnh cũ +6,6;
 * số cũ 10/10 là [8.6, 2.4, 1.2, 0.3, -1.9, -8.4] làm phần trên túi ghép sáng gắt hơn ảnh thật hiện nay.
 */
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
 * Hệ số nhân (theo giá trị sRGB) cho từng hàng ảnh SP để phân bố sáng trên thân về kiểu studio. Đo phân bố
 * sẵn có của SP trên lưới 6×6 khung thân (trung vị từng ô, trung vị theo hàng — hoa văn/màu da lệch một vài
 * ô không kéo lệch cả hàng), bù STUDIO_STRENGTH phần chênh với STUDIO_BODY_PROFILE (kẹp ±STUDIO_MAX_SHIFT)
 * cho 5 dải trên; dải đáy giữ mức bù của dải trên nó. Quai phía trên thân theo dải trên cùng, phần dưới đáy
 * theo dải dưới cùng. Không đủ điểm thân → null.
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

/**
 * SP sáng lên `gain` lần theo ánh sáng tuyến tính, kèm "vai" y·g / (1 + (g − 1)·y): chỗ tối/vừa sáng lên
 * gần đủ `gain`, chỗ đã gần trắng thì gần như giữ nguyên — không cháy chữ thêu, khoá kim loại. Giữ alpha
 * và tỉ lệ màu (không làm lệch màu da). Sửa tại chỗ.
 */
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

/**
 * Độ đậm vùng tối loang dưới chân (0..SURFACE_POOL_MAX): mặt đặt sáng hơn vùng quanh túi càng nhiều so
 * với ảnh thật thì càng tối lại; mặt đặt vốn đã tối (nền tự tải lên) thì không cần.
 */
export function surfacePoolStrength(surfaceL: number | null, surroundL: number | null): number {
  if (surfaceL === null || surroundL === null) return 0;
  const target = surroundL + REAL_SURFACE_ABOVE_SURROUND;
  if (surfaceL <= target) return 0;
  return Math.min(SURFACE_POOL_MAX, 1 - luminanceOf(target) / luminanceOf(surfaceL));
}

/**
 * Độ tối dần từ đỉnh xuống đáy (FALLOFF_MIN..FALLOFF_MAX) để phần trên SP sáng hơn phần dưới đúng như
 * ảnh thật (REAL_TOP_LIGHT_DIFF). SP chụp đã có sẵn độ chuyển sáng mạnh thì chỉ thêm ít.
 */
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
 * Kéo ánh sáng của sản phẩm về ánh sáng của cảnh (sửa tại chỗ, giữ nguyên alpha):
 * cân trắng về tông ấm → phân bố sáng từ trên xuống theo kiểu đèn studio (studioRowFactors; thiếu khung thân thì
 * tối dần tuyến tính — chooseFalloff) → giảm tương phản 10% →
 * dịu vân quá sắc (trộn 50% bản làm mờ nhẹ) → hạt nhiễu nhẹ như ảnh chụp.
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
  // Có khung thân (AI trả): phân bố sáng trên thân về đúng kiểu đèn studio. Không có: tối dần tuyến tính, độ
  // dốc chọn theo chính SP để trên−dưới khớp ảnh thật.
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
