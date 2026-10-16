/** Nền có sẵn cho "Ghép background": 2 ảnh hộp gỗ trước kệ túi, ghi sẵn chỗ SP đứng trên mặt hộp. */
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
  /** Độ lớn thân SP (√(rộng × cao) thân túi) theo tỉ lệ chiều cao nền — mọi túi cùng cỡ thân khi chưa biết cm. */
  bodySize: number;
  /** Bề ngang hộp ở hàng đặt chân (foot.y), theo tỉ lệ bề ngang nền — để quy cm ra điểm ảnh. */
  boxWidth: number;
}

/** Bề ngang thật của hộp gỗ trong 2 nền (cm) — người dùng đo: 37 × 34 × 19,5cm, cạnh 37 quay ra máy. */
export const BOX_WIDTH_CM = 37;

// Số đo trên ảnh gốc: chân túi ở 73% độ sâu mặt hộp; bề ngang tối đa = 80% mặt hộp ở độ sâu đặt chân.
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
    bodySize: 0.33,
    // Hộp ở hàng chân (y 0,783) rộng 1660px / 1707px — đo theo mép hộp sáng trên nền kệ tối, 15/10.
    boxWidth: 0.972,
  },
  {
    id: 'shelf-box-landscape',
    label: 'Hộp gỗ · ngang',
    src: '/product-image/backgrounds/shelf-box-landscape.jpg',
    thumbnailSrc: '/product-image/backgrounds/shelf-box-landscape-thumb.jpg',
    // Mặt hộp từ 76% (mép sau) tới 89,8% (mép trước) chiều cao ảnh.
    foot: { x: 0.5025, y: 0.861 },
    productHeight: 0.631,
    maxProductWidth: 0.475,
    bodySize: 0.485,
    // Hộp ở hàng chân (y 0,861) rộng 1389px / 2540px (mép trước 1558px) — đo 15/10.
    boxWidth: 0.547,
  },
];

/** Chỗ đặt SP trên một ảnh nền — nền có sẵn đo tay, nền tự tải lên dùng UPLOADED_BACKGROUND_LAYOUT. */
export type BackgroundLayout = Pick<BackgroundPreset, 'foot' | 'productHeight' | 'maxProductWidth' | 'bodySize'> &
  Partial<Pick<BackgroundPreset, 'boxWidth'>>;

/** Ảnh nền tự tải lên: chưa biết mặt bàn nên đặt giữa ảnh, chân ở 85% chiều cao, SP cao nửa ảnh. */
export const UPLOADED_BACKGROUND_LAYOUT: BackgroundLayout = {
  foot: { x: 0.5, y: 0.85 },
  productHeight: 0.5,
  maxProductWidth: 0.6,
  bodySize: 0.38,
};

/** Mở trang là có sẵn nền dọc — ảnh đăng mạng xã hội chủ yếu khổ dọc. */
export const DEFAULT_BACKGROUND_PRESET_ID = 'shelf-box-portrait';

export function findBackgroundPreset(id: string | null | undefined): BackgroundPreset | undefined {
  return BACKGROUND_PRESETS.find((preset) => preset.id === id);
}

/** Vị trí để chân SP trùng `foot`, SP cao `productHeight` (thu nhỏ nếu quá `maxProductWidth`). */
export function placementForPreset(preset: BackgroundLayout, background: Size, product: Size): Placement {
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

/** Khung thân SP [x0, y0, x1, y1] theo pixel của ảnh tách nền (AI trả về). */
export type BodyBox = readonly [number, number, number, number];

/** Vị trí SP theo thân túi: thân cỡ theo cm (hoặc `bodySize`), giữa đáy thân trùng `foot`, quai theo đó. */
export function placementForBody(
  layout: BackgroundLayout, background: Size, product: Size, body: BodyBox, widthCm?: number | null,
): Placement {
  const [bx0, by0, bx1, by1] = body;
  const bodyWidth = Math.max(1, bx1 - bx0);
  const bodyHeight = Math.max(1, by1 - by0);
  // Biết cm → thân rộng đúng tỉ lệ với hộp BOX_WIDTH_CM; không biết → cùng độ lớn thân (bodySize).
  const bySize = widthCm && layout.boxWidth
    ? ((widthCm / BOX_WIDTH_CM) * layout.boxWidth * background.width) / bodyWidth
    : Math.min(
      (layout.bodySize * background.height) / Math.sqrt(bodyWidth * bodyHeight),
      (layout.maxProductWidth * background.width) / bodyWidth,
    );
  // Quai không trồi khỏi mép trên; dây trải ngang rộng hơn ảnh thì để tràn, thân vẫn đúng cỡ.
  let factor = Math.min(bySize, (layout.foot.y * background.height) / by1);
  const fitPerScale = Math.min(background.width / product.width, background.height / product.height);
  const scale = Math.min(PLACEMENT_SCALE_MAX, Math.max(PLACEMENT_SCALE_MIN, factor / fitPerScale));
  factor = scale * fitPerScale;
  const x = layout.foot.x * background.width - ((bx0 + bx1) / 2) * factor;
  const y = layout.foot.y * background.height - by1 * factor;
  return clampPlacement({
    scale,
    centerX: (x + (product.width * factor) / 2) / background.width,
    centerY: (y + (product.height * factor) / 2) / background.height,
  });
}
