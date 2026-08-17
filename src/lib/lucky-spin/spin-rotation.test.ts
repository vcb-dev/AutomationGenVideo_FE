import { nextRotation, REVEAL_DELAY_MS, SPIN_DURATION_MS } from './spin-rotation';

/**
 * Người trúng được bốc TRƯỚC, góc xoay tính ngược lại. Nếu công thức sai thì mũi tên dừng ở ô
 * này nhưng hộp kết quả hiện tên ở ô khác — trước cả hội trường.
 *
 * SpinWheel vẽ ô thứ i từ góc (i*segAngle - 90) độ, tức ô 0 bắt đầu ngay tại mũi tên ở 12 giờ.
 * Sau khi xoay, tâm ô trúng phải nằm đúng vị trí mũi tên.
 */

/** Ô nào đang nằm dưới mũi tên sau khi xoay `rotation` độ. */
function segmentUnderPointer(rotation: number, count: number): number {
  const segAngle = 360 / count;
  for (let i = 0; i < count; i++) {
    const tam = i * segAngle + segAngle / 2;
    const sauKhiXoay = ((tam + rotation) % 360 + 360) % 360;
    // Mũi tên ở 0 độ theo hệ quy chiếu này; chấp nhận lệch trong nửa ô.
    const lech = Math.min(sauKhiXoay, 360 - sauKhiXoay);
    if (lech < segAngle / 2 - 1e-9) return i;
  }
  return -1;
}

describe('nextRotation — ô trúng phải dừng đúng dưới mũi tên', () => {
  it.each([2, 3, 5, 8, 12, 24, 37, 100])('đúng với mọi ô khi vòng quay có %i ô', (count) => {
    for (let winner = 0; winner < count; winner++) {
      const rotation = nextRotation(0, winner, count);
      expect(segmentUnderPointer(rotation, count)).toBe(winner);
    }
  });

  it('vẫn đúng khi quay tiếp từ góc lẻ của lượt trước', () => {
    const count = 7;
    let rotation = 0;
    for (const winner of [3, 0, 6, 1, 5, 5, 2]) {
      rotation = nextRotation(rotation, winner, count);
      expect(segmentUnderPointer(rotation, count)).toBe(winner);
    }
  });

  it('luôn quay tới, không bao giờ giật lùi', () => {
    let rotation = 0;
    for (let i = 0; i < 50; i++) {
      const tiep = nextRotation(rotation, i % 9, 9);
      expect(tiep).toBeGreaterThan(rotation);
      rotation = tiep;
    }
  });

  it('quay ít nhất 9 vòng để chuyển động nhìn ra là đang quay', () => {
    for (let i = 0; i < 100; i++) {
      const rotation = nextRotation(0, 2, 10);
      expect(rotation).toBeGreaterThanOrEqual(9 * 360);
      expect(rotation).toBeLessThan(14 * 360);
    }
  });

  it('trúng lại chính ô đang dừng thì vẫn quay trọn vòng chứ không đứng im', () => {
    const dung = nextRotation(0, 4, 10);
    expect(nextRotation(dung, 4, 10) - dung).toBeGreaterThanOrEqual(9 * 360);
  });

  it('vòng quay một ô luôn trả về ô đó', () => {
    expect(segmentUnderPointer(nextRotation(0, 0, 1), 1)).toBe(0);
  });

  it('quay đúng 10 giây, và còn một nhịp lặng trước khi công bố', () => {
    expect(SPIN_DURATION_MS).toBe(10000);
    expect(REVEAL_DELAY_MS).toBeGreaterThan(0);
  });
});
