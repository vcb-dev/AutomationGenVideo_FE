/**
 * Nền có sẵn cho chế độ "Ghép background": ảnh phòng media chụp hộp gỗ trước kệ túi (người dùng
 * gửi 2026-09-29, thay bản chỉnh màu 2026-10-13; ảnh ở public/product-image/backgrounds). Mỗi nền ghi sẵn chỗ SP đứng trên mặt
 * hộp, nên tách nền xong là SP tự đứng đúng chỗ, không phải chỉnh tay.
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
  /**
   * Độ lớn THÂN SP (√(rộng × cao) của thân túi, không tính quai/dây) theo tỉ lệ chiều cao ảnh nền —
   * mọi túi trên cùng nền có cùng độ lớn thân, dù dây dài hay quai cao. ≈ 0,77 × productHeight: túi
   * thường có thân cao ~70% cả túi và rộng ~1,2 lần thân cao, nên cỡ thân ngang với cách đặt cũ.
   */
  bodySize: number;
  /**
   * Bề ngang hộp ĐÚNG Ở HÀNG ĐẶT CHÂN (foot.y), theo tỉ lệ bề ngang ảnh nền — để quy cm ra điểm ảnh (BOX_WIDTH_CM). Đo ở
   * hàng chân chứ không ở mép trước: nền chụp gần nên hộp ở độ sâu đặt túi hẹp hơn mép trước ~11%.
   */
  boxWidth: number;
}

/**
 * Bề ngang thật của hộp gỗ "Vạn Phong Các" trong 2 nền có sẵn (cm) — người dùng đo thước 15/10: dài 37 × rộng 34 × cao
 * 19,5cm; mặt có khoá đồng quay ra máy là cạnh 37 (ước tính gián tiếp bằng khoá đồng trước đó ra ~38cm: khoá 99px /
 * mặt trước 1558px trên nền ngang, khoá ~2,4cm). Hộp này LỚN hơn hộp ở ảnh chụp SP của shop (~29–31cm) — bản đầu lấy 31cm
 * của hộp nhỏ nên túi to quá ~19–37%.
 */
export const BOX_WIDTH_CM = 37;

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
    bodySize: 0.33,
    // Hộp ở hàng chân (y 0,783) rộng 1660px / 1707px — đo theo mép hộp sáng trên nền kệ tối, 15/10.
    boxWidth: 0.972,
  },
  {
    id: 'shelf-box-landscape',
    label: 'Hộp gỗ · ngang',
    src: '/product-image/backgrounds/shelf-box-landscape.jpg',
    thumbnailSrc: '/product-image/backgrounds/shelf-box-landscape-thumb.jpg',
    // Mặt hộp từ 76% (mép sau) tới 89,8% (mép trước) chiều cao ảnh. Ảnh thay 13/10 (2540×1694) chụp
    // cùng chỗ nhưng hộp to hơn ảnh cũ ~1% và lệch phải/xuống chút (đo bằng khớp cạnh hai ảnh) → số
    // đo cũ nhân theo đúng tỉ lệ đó.
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

/**
 * Ảnh nền tự tải lên: máy chưa biết mặt bàn nằm đâu nên đặt SP theo bố cục ảnh sản phẩm thường gặp —
 * giữa ảnh, chân ở 85% chiều cao, SP cao một nửa ảnh. Cần đặt đúng mặt phẳng thì dùng Gemini, hoặc
 * đo ảnh nền đó rồi thêm vào BACKGROUND_PRESETS.
 */
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

/**
 * Vị trí để SP đứng lên mặt hộp: chân SP trùng `foot`, SP cao `productHeight` ảnh nền, trừ khi SP
 * bề ngang quá `maxProductWidth` thì thu nhỏ lại. Đi ngược công thức của `computeDrawRect`.
 */
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

/**
 * Vị trí SP theo THÂN túi (AI trả khung thân): thân có độ lớn `bodySize` × chiều cao nền, giữa đáy
 * thân trùng `foot` — quai/dây nằm đâu theo đó. Đặt theo cả khung SP (placementForPreset) thì túi dây
 * dài/ngang bị thu nhỏ còn nửa vì chạm trần bề ngang (đo trên ảnh thật: khung 1984×832 so với 768×1193
 * trên cùng nền cao chênh gấp đôi). Thân không rộng quá `maxProductWidth`, quai không trồi khỏi mép trên.
 */
export function placementForBody(
  layout: BackgroundLayout, background: Size, product: Size, body: BodyBox, widthCm?: number | null,
): Placement {
  const [bx0, by0, bx1, by1] = body;
  const bodyWidth = Math.max(1, bx1 - bx0);
  const bodyHeight = Math.max(1, by1 - by0);
  // Biết bề ngang thật (cm) và nền có số đo hộp → thân túi rộng đúng tỉ lệ với hộp BOX_WIDTH_CM: ví 11cm chưa tới 1/3 mặt
  // hộp, túi lớn 37cm vừa khít bề ngang hộp. Không biết → mọi túi cùng độ lớn thân (bodySize), không quá maxProductWidth.
  const bySize = widthCm && layout.boxWidth
    ? ((widthCm / BOX_WIDTH_CM) * layout.boxWidth * background.width) / bodyWidth
    : Math.min(
      (layout.bodySize * background.height) / Math.sqrt(bodyWidth * bodyHeight),
      (layout.maxProductWidth * background.width) / bodyWidth,
    );
  // Hệ số phóng: pixel ảnh tách nền → pixel ảnh nền. Phần trên đáy thân (quai) không trồi khỏi mép trên. Không kẹp theo
  // bề ngang cả SP: dây đeo trải ngang rộng hơn ảnh thì để tràn mép, thân túi vẫn đúng cỡ.
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
