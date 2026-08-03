/** Thời gian animation của vòng quay, phải khớp với duration trong SpinWheel. */
export const SPIN_DURATION_MS = 4600;

/**
 * Người thắng được bốc trước, góc xoay tính ngược lại sao cho ô đó dừng đúng dưới mũi tên,
 * cộng thêm 6–8 vòng để chuyển động trông tự nhiên.
 */
export function nextRotation(currentRotation: number, winnerIndex: number, count: number): number {
  const segAngle = 360 / count;
  const winnerCenter = winnerIndex * segAngle + segAngle / 2;
  const curMod = ((currentRotation % 360) + 360) % 360;
  const delta = (((360 - winnerCenter) % 360) - curMod + 360) % 360;
  const extraSpins = 6 + Math.floor(Math.random() * 3);
  return currentRotation + delta + extraSpins * 360;
}
