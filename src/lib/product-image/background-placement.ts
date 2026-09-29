/**
 * Chế độ "Ghép background": đặt SP đã tách nền lên ảnh phòng.
 *
 * Xem trước (CSS, theo %) và ảnh xuất ra (canvas, theo pixel thật của ảnh phòng) cùng đọc một
 * hàm `computeDrawRect` — nên ảnh tải về trùng khít với cái người dùng thấy trên màn hình.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Placement {
  /** SP lọt trong khung rộng `scale` × ảnh phòng (giữ tỉ lệ SP) — 0.4 = chiếm 40% chiều hạn chế. */
  scale: number;
  /** Tâm SP theo tỉ lệ bề ngang ảnh phòng, 0 = mép trái, 1 = mép phải. */
  centerX: number;
  /** Tâm SP theo tỉ lệ chiều cao ảnh phòng, 0 = mép trên, 1 = mép dưới. */
  centerY: number;
}

export interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PLACEMENT_SCALE_MIN = 0.05;
export const PLACEMENT_SCALE_MAX = 1;

/** Vừa đủ thấy rõ SP mà vẫn còn chỗ cho bối cảnh phòng; người dùng chỉnh tiếp bằng thanh trượt. */
export const DEFAULT_PLACEMENT: Placement = { scale: 0.4, centerX: 0.5, centerY: 0.5 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function clampPlacement(placement: Placement): Placement {
  return {
    scale: clamp(placement.scale, PLACEMENT_SCALE_MIN, PLACEMENT_SCALE_MAX),
    // Cho tâm chạy hết mép (0..1): SP được phép tràn một nửa ra ngoài khung, như cắt cúp ảnh thật.
    centerX: clamp(placement.centerX, 0, 1),
    centerY: clamp(placement.centerY, 0, 1),
  };
}

/** Vị trí + kích thước SP tính bằng pixel của ảnh phòng. */
export function computeDrawRect(background: Size, product: Size, placement: Placement): DrawRect {
  const { scale, centerX, centerY } = clampPlacement(placement);
  const fit = Math.min((background.width * scale) / product.width, (background.height * scale) / product.height);
  const width = product.width * fit;
  const height = product.height * fit;
  return {
    x: background.width * centerX - width / 2,
    y: background.height * centerY - height / 2,
    width,
    height,
  };
}

/** Cùng hình chữ nhật nhưng theo % ảnh phòng — cho lớp xem trước CSS co giãn theo khung hiển thị. */
export function toPercentRect(rect: DrawRect, background: Size): DrawRect {
  return {
    x: (rect.x / background.width) * 100,
    y: (rect.y / background.height) * 100,
    width: (rect.width / background.width) * 100,
    height: (rect.height / background.height) * 100,
  };
}

/**
 * Kéo SP trên khung xem trước: độ dời chuột (px màn hình) đổi thành độ dời tâm theo tỉ lệ khung
 * đang hiển thị, nên kéo đúng tay dù ảnh phòng thật lớn hay nhỏ hơn khung.
 */
export function moveByDrag(start: Placement, deltaX: number, deltaY: number, display: Size): Placement {
  if (display.width <= 0 || display.height <= 0) return start;
  return clampPlacement({
    ...start,
    centerX: start.centerX + deltaX / display.width,
    centerY: start.centerY + deltaY / display.height,
  });
}

/** Tên file tải về, vd `anh-sp-ghep-phong-20260929-143015.jpg` (giờ máy người dùng). */
export function exportFileName(prefix: string, extension: string, now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}-${stamp}.${extension}`;
}
