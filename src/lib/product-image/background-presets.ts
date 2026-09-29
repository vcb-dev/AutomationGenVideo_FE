/**
 * Nền có sẵn cho chế độ "Ghép background": ảnh phòng media chụp hộp gỗ trước kệ túi (người dùng
 * gửi 2026-09-29, ảnh ở public/product-image/backgrounds). Mỗi nền ghi sẵn chỗ SP đứng trên mặt
 * hộp, nên tách nền xong là SP đứng đúng chỗ, người dùng chỉ cần chỉnh nhẹ.
 */
import {
  PLACEMENT_SCALE_MAX,
  PLACEMENT_SCALE_MIN,
  clampPlacement,
  computeDrawRect,
  type Placement,
  type Size,
} from './background-placement';

export interface BackgroundPreset {
  id: string;
  label: string;
  /** Ảnh gốc — ảnh xuất ra giữ nguyên độ phân giải này. */
  src: string;
  /** Ảnh nhỏ cho ô chọn nền, khỏi tải cả ảnh gốc chỉ để hiện ô. */
  thumbnailSrc: string;
  /** Chân SP (giữa mép đáy) khi đứng trên mặt hộp, theo tỉ lệ ảnh nền: x trái → phải, y trên → dưới. */
  foot: { x: number; y: number };
  /** Chiều cao SP mặc định, theo tỉ lệ chiều cao ảnh nền. */
  productHeight: number;
  /** SP bề ngang quá khổ thì thu nhỏ cho vừa mặt hộp — theo tỉ lệ bề ngang ảnh nền. */
  maxProductWidth: number;
}

// Số đo trên ảnh gốc. Nền ngang lấy đúng chỗ người dùng tự đặt túi (ảnh ghép của họ trừ đi ảnh nền):
// chân túi ở 86% chiều cao = 73% độ sâu mặt hộp, túi cao 62,5% ảnh. Nền dọc đặt chân ở cùng 73% độ
// sâu; hộp ở độ sâu đó rộng 1565px so với 1516px bên ảnh ngang nên SP cao hơn tương ứng (≈1100px).
// Bề ngang tối đa = 80% bề ngang mặt hộp ở độ sâu đặt chân.
export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = [
  {
    id: 'shelf-box-portrait',
    label: 'Hộp gỗ · dọc',
    src: '/product-image/backgrounds/shelf-box-portrait.jpg',
    thumbnailSrc: '/product-image/backgrounds/shelf-box-portrait-thumb.jpg',
    // Mặt hộp từ 67,3% (mép sau) tới 82,4% (mép trước) chiều cao ảnh.
    foot: { x: 0.505, y: 0.783 },
    productHeight: 0.43,
    maxProductWidth: 0.73,
  },
  {
    id: 'shelf-box-landscape',
    label: 'Hộp gỗ · ngang',
    src: '/product-image/backgrounds/shelf-box-landscape.jpg',
    thumbnailSrc: '/product-image/backgrounds/shelf-box-landscape-thumb.jpg',
    // Mặt hộp từ 76% (mép sau) tới 89,7% (mép trước) chiều cao ảnh.
    foot: { x: 0.5, y: 0.86 },
    productHeight: 0.625,
    maxProductWidth: 0.47,
  },
];

/** Mở trang là có sẵn nền dọc — ảnh đăng mạng xã hội chủ yếu khổ dọc. */
export const DEFAULT_BACKGROUND_PRESET_ID = 'shelf-box-portrait';

export function findBackgroundPreset(id: string | null | undefined): BackgroundPreset | undefined {
  return BACKGROUND_PRESETS.find((preset) => preset.id === id);
}

/**
 * Vị trí để SP đứng lên mặt hộp: chân SP trùng `foot`, SP cao `productHeight` ảnh nền, trừ khi SP
 * bề ngang quá `maxProductWidth` thì thu nhỏ lại. Đi ngược công thức của `computeDrawRect`.
 */
export function placementForPreset(preset: BackgroundPreset, background: Size, product: Size): Placement {
  const targetHeight = Math.min(
    preset.productHeight * background.height,
    (preset.maxProductWidth * background.width * product.height) / product.width,
  );
  // computeDrawRect phóng SP theo hệ số min(W·scale/pw, H·scale/ph); cần hệ số = targetHeight/ph.
  const fitPerScale = Math.min(background.width / product.width, background.height / product.height);
  const scale = Math.min(PLACEMENT_SCALE_MAX, Math.max(PLACEMENT_SCALE_MIN, targetHeight / product.height / fitPerScale));
  // Lấy chiều cao thật sau khi kẹp scale để chân SP vẫn nằm đúng mặt hộp.
  const { height } = computeDrawRect(background, product, { scale, centerX: 0.5, centerY: 0.5 });
  return clampPlacement({ scale, centerX: preset.foot.x, centerY: preset.foot.y - height / 2 / background.height });
}
