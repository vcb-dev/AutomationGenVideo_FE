import {
  nextRotation,
  nextSpinTarget,
  REVEAL_DELAY_MS,
  SPIN_DURATION_MS,
  SPIN_EASING,
  SPIN_EASING_BOUNCE,
  SPIN_EASING_CRUISE,
  SPIN_EASING_FALSE_STOP,
  SPIN_EASING_RAZOR,
  SPIN_EASING_SLAM,
} from './spin-rotation';

/**
 * Người trúng được bốc TRƯỚC, góc xoay tính ngược lại. Nếu công thức sai thì mũi tên dừng ở ô
 * này nhưng hộp kết quả hiện tên ở ô khác — trước cả hội trường.
 *
 * SpinWheel vẽ ô thứ i từ góc (i*segAngle - 90) độ, tức ô 0 bắt đầu ngay tại mũi tên ở 12 giờ.
 * Sau khi xoay, ô trúng phải nằm đúng vị trí mũi tên.
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

describe('nextSpinTarget & nextRotation — diễn hoạt 30s siêu kịch tính', () => {
  it.each([2, 3, 5, 8, 12, 24, 37, 100])('đúng với mọi ô khi vòng quay có %i ô', (count) => {
    for (let winner = 0; winner < count; winner++) {
      for (let sc = 0; sc < 5; sc++) {
        const target = nextSpinTarget(0, winner, count, sc);
        // Kết quả cuối cùng phải nằm đúng dưới mũi tên
        expect(segmentUnderPointer(target.rotation, count)).toBe(winner);
        expect([
          SPIN_EASING_BOUNCE,
          SPIN_EASING_FALSE_STOP,
          SPIN_EASING_RAZOR,
          SPIN_EASING_CRUISE,
          SPIN_EASING_SLAM,
        ]).toContain(target.easing);
      }
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

  it('quay ít nhất 7 vòng để chuyển động nhìn ra là đang quay', () => {
    for (let i = 0; i < 100; i++) {
      const rotation = nextRotation(0, 2, 10);
      expect(rotation).toBeGreaterThanOrEqual(7 * 360);
      expect(rotation).toBeLessThan(12 * 360);
    }
  });

  it('trúng lại chính ô đang dừng thì vẫn quay trọn vòng chứ không đứng im', () => {
    const dung = nextRotation(0, 4, 10);
    expect(nextRotation(dung, 4, 10) - dung).toBeGreaterThanOrEqual(7 * 360);
  });

  it('vòng quay một ô luôn trả về ô đó', () => {
    const rotation = nextRotation(0, 0, 1);
    expect(segmentUnderPointer(rotation, 1)).toBe(0);
  });

  it('thời gian quay 30 giây và có đầy đủ đường cong easing', () => {
    expect(SPIN_DURATION_MS).toBe(30000);
    expect(SPIN_EASING).toBe(SPIN_EASING_RAZOR);
    expect(REVEAL_DELAY_MS).toBeGreaterThan(0);
  });
});










