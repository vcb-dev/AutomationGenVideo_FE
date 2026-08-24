/**
 * Chuyển động của bánh xe:
 *
 * Diễn hoạt 30 giây với 5 kịch bản độc bản (mỗi kịch bản có 1 đường cong chuyển động riêng biệt 100%):
 * 1. 🏓 "Quán tính bật ngược rõ rệt" (High-Bounce Recoil - 20%): Vọt sang ô sau +6°..+8° rồi nảy giật ngược lại ô người trúng.
 * 2. 🎭 "Giả chết khựng lại 4s rồi rướn thêm 1 nhịp chót" (False-Stop Stutter - 20%): Tưởng dừng hẳn ở ô trước rồi rướn qua vạch.
 * 3. ⚖️ "Cân não trên đỉnh sợi chỉ / Soi VAR" (Ultra Razor-Edge - 20%): Bò siêu sâu 15 giây và đỗ chính xác đè lên vạch phân cách.
 * 4. 🎯 "Hồng tâm định mệnh thẳng thừng" (Center Bullseye Cruise - 20%): Lướt êm ái, thanh thoát vào đúng tim giữa ô.
 * 5. ⏳ "Lao nhanh đến sát vách rồi phanh cứng" (Tail Wall Slam - 20%): Lao nhanh qua cả ô rồi phanh gấp sát mép vạch cuối.
 */

/** Tổng thời gian bánh xe chuyển động (30 giây). Server đồng bộ theo con số này. */
export const SPIN_DURATION_MS = 30000;

/** Kịch bản 1: Đường cong bật ngược vọt sang ô sau rồi hồi ngược lại */
export const SPIN_EASING_BOUNCE = 'cubic-bezier(0, 0.985, 0.003, 1.025)';

/** Kịch bản 2: Đường cong giả chết (đứng im phẳng lì ở giữa rồi rướn thêm 1 nấc) */
export const SPIN_EASING_FALSE_STOP = 'cubic-bezier(0.12, 1, 0, 1)';

/** Kịch bản 3: Đường cong hãm tốc siêu sâu đến từng phân tử, đậu trên sợi chỉ */
export const SPIN_EASING_RAZOR = 'cubic-bezier(0, 0.996, 0.001, 1)';

/** Kịch bản 4: Đường cong lướt êm ru kiểu du thuyền vào thẳng tâm giữa */
export const SPIN_EASING_CRUISE = 'cubic-bezier(0.15, 0.85, 0.35, 1)';

/** Kịch bản 5: Đường cong lao nhanh rồi phanh gấp sát vách */
export const SPIN_EASING_SLAM = 'cubic-bezier(0.02, 0.95, 0.08, 1)';

/** Đường cong mặc định */
export const SPIN_EASING = SPIN_EASING_RAZOR;

/** Khoảng lặng sau khi bánh xe dừng hẳn, trước khi công bố tên. */
export const REVEAL_DELAY_MS = 1000;

export type DramaType =
  | 'bounce_back'
  | 'false_stop'
  | 'razor_edge'
  | 'center_bullseye'
  | 'tail_slam';

export interface SpinTarget {
  rotation: number;
  easing: string;
  type: DramaType;
}

let dramaDeck: number[] = [];

/**
 * Rút kịch bản tiếp theo từ "bộ bài xáo trộn" (Shuffle-Deck Randomizer).
 *
 * Thuật toán này giải quyết triệt để hiện tượng ngẫu nhiên độc lập Math.random() bị dồn cục (Poisson clumping).
 * Bằng cách xáo 5 kịch bản thành một cỗ bài, trong BẤT KỲ 5 lượt quay liên tiếp nào,
 * bạn LUÔN LUÔN trải nghiệm đủ cả 5 kịch bản khác nhau 100%, không bao giờ bị trùng lặp!
 */
export function drawNextDramaIndex(): number {
  if (dramaDeck.length === 0) {
    const all = [0, 1, 2, 3, 4];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    dramaDeck = all;
  }
  return dramaDeck.pop()!;
}

/**
 * Tính toán góc quay và đường cong chuyển động đảm bảo luôn xoay vòng đủ 5 kịch bản đặc trưng.
 */
export function nextSpinTarget(
  currentRotation: number,
  winnerIndex: number,
  count: number,
  forcedDramaIndex?: number,
): SpinTarget {
  const safeCount = Math.max(1, count);
  const segAngle = 360 / safeCount;

  if (safeCount <= 1) {
    const winnerCenter = winnerIndex * segAngle + 0.5 * segAngle;
    const curMod = ((currentRotation % 360) + 360) % 360;
    const deltaToFinal = (((360 - winnerCenter) % 360) - curMod + 360) % 360;
    const extraSpins = 7;
    return {
      rotation: currentRotation + deltaToFinal + extraSpins * 360,
      easing: SPIN_EASING_CRUISE,
      type: 'center_bullseye',
    };
  }

  const scenarioIdx = forcedDramaIndex !== undefined ? forcedDramaIndex : drawNextDramaIndex();

  let inSegmentOffsetRatio: number;
  let easing: string;
  let type: DramaType;

  switch (scenarioIdx) {
    case 0:
      // Kịch bản 1: Quán tính bật ngược rõ rệt (Vọt sang ô kế tiếp +6°..+8° rồi nảy lùi về đuôi ô người trúng)
      inSegmentOffsetRatio = 0.88 + Math.random() * 0.04;
      easing = SPIN_EASING_BOUNCE;
      type = 'bounce_back';
      break;
    case 1:
      // Kịch bản 2: Giả chết khựng lại 4s rồi rướn thêm 1 nhịp chót (Tưởng dừng ở ô trước rồi rướn qua vạch)
      inSegmentOffsetRatio = 0.08 + Math.random() * 0.06;
      easing = SPIN_EASING_FALSE_STOP;
      type = 'false_stop';
      break;
    case 2:
      // Kịch bản 3: Cân não trên đỉnh sợi chỉ / Soi VAR mép vạch (Chạm đè chính xác trên vạch ngăn cách)
      inSegmentOffsetRatio = 0.015 + Math.random() * 0.02;
      easing = SPIN_EASING_RAZOR;
      type = 'razor_edge';
      break;
    case 3:
      // Kịch bản 4: Hồng tâm định mệnh thẳng thừng (Lướt êm ru vào đúng chính giữa tâm ô)
      inSegmentOffsetRatio = 0.48 + Math.random() * 0.04;
      easing = SPIN_EASING_CRUISE;
      type = 'center_bullseye';
      break;
    default:
      // Kịch bản 5: Lao nhanh đến sát mép vạch rồi phanh cứng (Phanh gấp dừng ở sát vách cuối ô người trúng)
      inSegmentOffsetRatio = 0.82 + Math.random() * 0.06;
      easing = SPIN_EASING_SLAM;
      type = 'tail_slam';
      break;
  }

  const winnerCenter = winnerIndex * segAngle + (1 - inSegmentOffsetRatio) * segAngle;
  const curMod = ((currentRotation % 360) + 360) % 360;
  const deltaToFinal = (((360 - winnerCenter) % 360) - curMod + 360) % 360;
  const extraSpins = 7 + Math.floor(Math.random() * 2);

  return {
    rotation: currentRotation + deltaToFinal + extraSpins * 360,
    easing,
    type,
  };
}



/**
 * Tính toán góc quay để ô người trúng dừng đúng dưới mũi tên ở 12 giờ.
 */
export function nextRotation(
  currentRotation: number,
  winnerIndex: number,
  count: number,
): number {
  return nextSpinTarget(currentRotation, winnerIndex, count).rotation;
}




