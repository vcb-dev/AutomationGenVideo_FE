/**
 * Chuyển động của bánh xe.
 *
 * Một mạch duy nhất, chậm dần đều cho tới khi đứng hẳn — đúng như một bánh xe thật hết đà.
 * Trước đây có màn "hụt một ô": dừng ở ô liền trước rồi nhích thêm một nấc. Về lý thuyết là
 * thủ pháp tạo cao trào, nhưng thực tế trông giả vì bánh xe đã đứng yên rồi lại tự chạy tiếp,
 * điều không xảy ra với vật thể có quán tính. Hồi hộp giờ đến từ cái đuôi chậm rất dài của
 * đường cong giảm tốc và khoảng lặng trước lúc công bố.
 */

/** Thời gian bánh xe chuyển động. Server dùng đúng con số này để đồng bộ cho người xem. */
export const SPIN_DURATION_MS = 5000;

/**
 * Đường cong giảm tốc.
 *
 * Vọt nhanh trong khoảng 1/8 đầu rồi kéo một cái đuôi rất dài — hai giây cuối bánh xe gần như
 * bò, đó là lúc khán giả căng mắt xem mũi tên sẽ đậu vào đâu.
 */
export const SPIN_EASING = 'cubic-bezier(0.12, 0.72, 0.08, 1)';

/** Khoảng lặng sau khi bánh xe dừng hẳn, trước khi công bố tên. */
export const REVEAL_DELAY_MS = 1000;

/**
 * Góc để ô người trúng dừng đúng dưới mũi tên, luôn quay tới chứ không giật lùi.
 *
 * Người trúng được bốc trước ở server, góc xoay tính ngược lại từ đó.
 */
export function nextRotation(currentRotation: number, winnerIndex: number, count: number): number {
  const segAngle = 360 / count;
  const winnerCenter = winnerIndex * segAngle + segAngle / 2;
  const curMod = ((currentRotation % 360) + 360) % 360;
  const delta = (((360 - winnerCenter) % 360) - curMod + 360) % 360;
  const extraSpins = 6 + Math.floor(Math.random() * 3);
  return currentRotation + delta + extraSpins * 360;
}
