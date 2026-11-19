'use client';

import { computeDrawRect, type DrawRect, type Placement, type Size } from '@/lib/product-image/background-placement';
import type { CutoutPixels, FootRatio, RealismLayers } from '@/lib/product-image/realism-layers';
import {
  analyzeSceneLight,
  clearMatteResidue,
  medianLightness,
  type SceneLight,
  surfacePoolRadii,
  surfacePoolStrength,
} from '@/lib/product-image/realism';
import { loadImage } from './download';

/**
 * Dựng ảnh ghép SP đã tách nền lên ảnh nền ở trình duyệt (tab Ghép background, chạy tự động): lớp SP
 * đã dọn mép + khớp ánh sáng, lớp bóng dưới chân, rồi vẽ cả hai lên ảnh nền.
 */

export type { CutoutPixels };

function canvasFrom(width: number, height: number, data: Uint8ClampedArray): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas');
  const image = ctx.createImageData(width, height);
  image.data.set(data);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * Điểm ảnh gốc của ảnh đã tách nền, đã dọn lớp nền mờ rembg để sót (lỗ quai túi) để mọi lớp dựng
 * sau, kể cả khi tắt hết tuỳ chọn, đều sạch.
 */
export async function readCutoutPixels(src: string): Promise<CutoutPixels> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas');
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  clearMatteResidue(data, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data };
}

/** Cỡ lớp SP trên ảnh nền, làm tròn để vẽ khớp điểm ảnh, không bị nội suy lần nữa. */
export function productTarget(rect: DrawRect) {
  return { width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height)) };
}

/**
 * Ánh sáng cảnh của ảnh nền (độ sáng) — thu nhỏ cạnh dài còn 1024px cho nhanh, chạy một lần mỗi lượt.
 */
export async function analyzeBackgroundLight(src: string): Promise<SceneLight> {
  const image = await loadImage(src);
  const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return analyzeSceneLight(data, canvas.width, canvas.height);
}

/** Màu trung bình của ảnh nền (thu nhỏ 64×64) — để tự đặt mức ánh vàng ấm (`estimateWarmth`). */
export async function averageColor(src: string): Promise<[number, number, number]> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [0, 0, 0];
  ctx.drawImage(image, 0, 0, 64, 64);
  const { data } = ctx.getImageData(0, 0, 64, 64);
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    sum[0] += data[i];
    sum[1] += data[i + 1];
    sum[2] += data[i + 2];
  }
  const n = data.length / 4;
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}

/**
 * Màu trung bình VIỀN ảnh SP gốc (dải 8% quanh mép, thu nhỏ 96×96) — ánh sáng của nơi chụp SP. Ảnh chụp sẵn trong phòng
 * media (kệ gỗ, đèn vàng) viền ấm; ảnh catalog phông trắng viền trung tính.
 */
export async function borderColor(src: string): Promise<[number, number, number]> {
  const image = await loadImage(src);
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [0, 0, 0];
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const band = Math.round(size * 0.08);
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (x >= band && x < size - band && y >= band && y < size - band) continue;
      const i = (y * size + x) * 4;
      sum[0] += data[i];
      sum[1] += data[i + 1];
      sum[2] += data[i + 2];
      n += 1;
    }
  }
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}

/** Chất lượng tối đa để giữ chi tiết màu của túi — mức thấp hơn trình duyệt lấy mẫu màu 4:2:0. */
const COMPOSITE_JPEG_QUALITY = 1;

/** Ảnh ghép JPEG theo đúng độ phân giải ảnh nền — vẽ bóng rồi tới SP. */
export async function renderComposite(
  background: { src: string } & Size,
  product: Size,
  placement: Placement,
  layers: RealismLayers,
): Promise<Blob> {
  const bgImage = await loadImage(background.src);
  const canvas = document.createElement('canvas');
  canvas.width = background.width;
  canvas.height = background.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas');
  // Xuất JPEG: ảnh phòng PNG có vùng trong suốt sẽ thành đen nếu không lót nền trắng trước.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImage, 0, 0, background.width, background.height);
  const rect = computeDrawRect(background, product, placement);
  ctx.imageSmoothingQuality = 'high';
  if (layers.foot) drawSurfacePool(ctx, canvas.width, canvas.height, rect, layers.foot);
  if (layers.shadow) {
    const pad = rect.width * layers.shadowPadRatio;
    ctx.drawImage(canvasFrom(layers.shadow.width, layers.shadow.height, layers.shadow.data), rect.x - pad, rect.y, rect.width + 2 * pad, rect.height * layers.shadowHeightRatio);
  }
  ctx.drawImage(canvasFrom(layers.product.width, layers.product.height, layers.product.data), Math.round(rect.x), Math.round(rect.y));
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', COMPOSITE_JPEG_QUALITY));
  if (!blob) throw new Error('Không dựng được file ảnh');
  return blob;
}

/**
 * Vùng tối loang trên mặt đặt quanh chân SP (túi che bớt đèn trần). Đo ngay trên ảnh nền: mặt đặt dưới
 * chân sáng hơn vùng quanh SP bao nhiêu so với ảnh thật thì tối lại bấy nhiêu (surfacePoolStrength) — nền
 * mẫu mặt hộp sáng trưng thì tối rõ, nền tự tải lên mặt bàn vốn tối thì gần như không đổi.
 */
function drawSurfacePool(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rect: { x: number; y: number; width: number; height: number },
  foot: FootRatio,
) {
  const footLeft = rect.x + foot.left * rect.width;
  const footRight = rect.x + foot.right * rect.width;
  const footY = rect.y + foot.bottom * rect.height;
  const footWidth = Math.max(1, footRight - footLeft);
  const centerX = (footLeft + footRight) / 2;
  const sx0 = Math.max(0, Math.floor(rect.x - rect.width * 0.3));
  const sy0 = Math.max(0, Math.floor(rect.y - rect.height * 0.1));
  const sx1 = Math.min(width, Math.ceil(rect.x + rect.width * 1.3));
  const sy1 = Math.min(height, Math.ceil(footY + rect.height * 0.2));
  if (sx1 <= sx0 || sy1 <= sy0) return;
  const { data } = ctx.getImageData(sx0, sy0, sx1 - sx0, sy1 - sy0);
  const w = sx1 - sx0;
  const h = sy1 - sy0;
  // Mặt đặt: dải ngay dưới chân, rộng bằng chân. Quanh SP: hai dải hai bên SP, cao bằng nửa dưới SP.
  const surface = medianLightness(data, w, h, footLeft - sx0, footY - sy0, footRight - sx0, footY - sy0 + rect.height * 0.08);
  const sideTop = rect.y + rect.height * 0.5 - sy0;
  const leftSide = medianLightness(data, w, h, 0, sideTop, rect.x - sx0, footY - sy0);
  const rightSide = medianLightness(data, w, h, rect.x + rect.width - sx0, sideTop, w, footY - sy0);
  const sides = [leftSide, rightSide].filter((v): v is number => v !== null);
  const surround = sides.length ? sides.reduce((a, b) => a + b, 0) / sides.length : null;
  const strength = surfacePoolStrength(surface, surround);
  if (strength <= 0) return;
  // Elip dẹt (mặt hộp nhìn nghiêng), đậm nhất sát chân rồi nhạt dần.
  const { radiusX, radiusY } = surfacePoolRadii(footWidth, rect.height * foot.size);
  ctx.save();
  ctx.translate(centerX, footY);
  ctx.scale(1, radiusY / radiusX);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusX);
  gradient.addColorStop(0, `rgba(0,0,0,${strength})`);
  gradient.addColorStop(0.55, `rgba(0,0,0,${strength * 0.55})`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radiusX, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
