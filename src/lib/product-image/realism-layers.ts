/** Dựng các lớp ảnh ghép trên mảng điểm ảnh, không dùng canvas — chạy được trong Web Worker. */
import { type BrightnessModel, measureBrightnessFeatures, predictBrightness } from './brightness-model';
import { resizeLanczos } from './lanczos';
import {
  adjustProductBrightness,
  applyLook,
  applySelfOcclusion,
  brightenProduct,
  buildShadowLayer,
  defringeEdges,
  footprint,
  productExposureFor,
  type SceneLight,
  shadowSizeReference,
  solidBottomRow,
  unpremultiplyEdges,
} from './realism';

export interface RealismSettings {
  shadow: boolean;
  /** 1 = tối đúng như ảnh chụp thật */
  shadowStrength: number;
  /** 1,8 = mặc định người dùng chốt */
  shadowHeight: number;
  look: boolean;
  /** 0..1 */
  warmth: number;
  /** Khung thân SP [x0, y0, x1, y1] (AI trả) — để phân bố sáng trên thân theo kiểu đèn studio. */
  body?: readonly number[] | null;
  /** Ánh sáng cảnh của ảnh nền — để SP sáng lên theo độ sáng cảnh. */
  scene?: SceneLight | null;
  /** Độ sáng người dùng chỉnh (PRODUCT_BRIGHTNESS_MIN..MAX); null = theo `model`. */
  brightness?: number | null;
  /** Model độ sáng; null = không có đề xuất. */
  model?: BrightnessModel | null;
}

export interface CutoutPixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface FootRatio {
  left: number;
  right: number;
  bottom: number;
  /** Kích thước thân / chiều cao ảnh SP. */
  size: number;
}

export interface RealismLayers {
  /** Lớp SP đã đúng cỡ đích. */
  product: CutoutPixels;
  shadow: CutoutPixels | null;
  /** Chiều cao lớp bóng / chiều cao sản phẩm — lớp bóng kéo dài xuống dưới chân. */
  shadowHeightRatio: number;
  /** Lề mỗi bên của lớp bóng / chiều rộng sản phẩm — bóng lan ra ngoài hai mép đáy. */
  shadowPadRatio: number;
  /** Số đo ảnh trước khi áp độ sáng — mẫu học khi tải ảnh. */
  features: number[];
  /** Mức độ sáng đã áp. */
  brightness: number;
  /** Mức AI đề xuất cho ảnh này; null = chưa có. */
  suggested: number | null;
  /** Phần đáy chạm mặt phẳng và kích thước thân, theo tỉ lệ ảnh SP (0..1) — để vẽ vùng tối loang trên mặt đặt; null = không có. */
  foot: FootRatio | null;
}

/**
 * 2 lớp trong hệ toạ độ của ảnh đã tách nền: sản phẩm (ánh sáng khớp nền + đáy tối lại) phóng tới cỡ đích, và bóng
 * dưới chân.
 */
export function buildRealismLayers(base: CutoutPixels, settings: RealismSettings, target: { width: number; height: number }): RealismLayers {
  const { width, height } = base;
  const { shadow, shadowStrength, shadowHeight, look, warmth } = settings;
  const productData = new Uint8ClampedArray(base.data);
  // Đáy THÂN túi (khung thân AI trả) là chỗ chạm mặt hộp — dây/khoá thòng thấp hơn không được thành "đáy".
  const body = settings.body && settings.body.length === 4 ? settings.body : null;
  const baseline = body ? Math.min(height - 1, Math.round(body[3]) - 1) : solidBottomRow(base.data, width, height);
  // Bóng tính theo thân túi — quai/dây dài không được làm bóng dài theo.
  const reference = body ? shadowSizeReference(body[2] - body[0], body[3] - body[1]) : null;
  // Mép sạch khi bật một trong hai: khôi phục màu thật của điểm mép (rembg trả màu đã nhân độ
  // đặc → viền đen mảnh), rồi thay phần còn ám màu nền cũ (nền trắng → viền sáng) bằng màu thân.
  if (shadow || look) {
    unpremultiplyEdges(productData);
    defringeEdges(productData, width, height);
  }
  if (look) {
    applyLook(productData, width, height, warmth, settings.body);
    // SP sáng lên theo độ sáng cảnh (cảnh sáng thì SP sáng theo) — chỗ sáng nhất không cháy.
    brightenProduct(productData, settings.scene ? productExposureFor(settings.scene.lightness) : undefined);
  }
  const features = measureBrightnessFeatures(productData, width, height, body, look);
  const suggested = settings.model ? predictBrightness(settings.model, features) : null;
  const brightness = settings.brightness ?? suggested ?? 0;
  if (brightness) adjustProductBrightness(productData, brightness);
  if (shadow) applySelfOcclusion(productData, width, height, shadowStrength, shadowHeight, baseline, reference);
  const product = target.width === width && target.height === height
    ? { width, height, data: productData }
    : { ...target, data: resizeLanczos(productData, width, height, target.width, target.height) };
  const summary = { product, features, brightness, suggested };
  if (!shadow) return { ...summary, shadow: null, shadowHeightRatio: 1, shadowPadRatio: 0, foot: null };

  const contact = footprint(base.data, width, height, baseline);
  const foot = contact && contact.left >= 0
    ? {
      left: contact.left / width,
      right: (contact.right + 1) / width,
      bottom: (contact.bottom + 1) / height,
      size: (reference ?? shadowSizeReference(width, height)) / height,
    }
    : null;
  const layer = buildShadowLayer(base.data, width, height, shadowStrength, shadowHeight, baseline, reference);
  const rgba = new Uint8ClampedArray(layer.width * layer.height * 4);
  for (let i = 0; i < layer.alpha.length; i += 1) rgba[i * 4 + 3] = layer.alpha[i];
  return {
    ...summary,
    shadow: { width: layer.width, height: layer.height, data: rgba },
    shadowHeightRatio: layer.height / height,
    shadowPadRatio: layer.padX / width,
    foot,
  };
}
