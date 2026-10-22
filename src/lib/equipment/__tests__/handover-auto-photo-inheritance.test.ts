import { handoverReadiness } from '../handover-readiness';
import type { PhotoItem } from '../photo-item';

/**
 * Kiểm thử logic tự động kế thừa ảnh từ người mượn khi lập biên bản bàn giao:
 * 1. Khi phiếu đã có ảnh từ người mượn, hệ thống tự động kế thừa làm PhotoItem với cờ isInherited: true
 * 2. Số lượng ảnh bàn giao tự động tính >= 1 nên handoverReadiness không bị chặn (canHandover = true)
 * 3. Nếu người mượn không có ảnh và kho chưa chụp ảnh thì tiếp tục cảnh báo thiếu ảnh
 */

describe('Tự động kế thừa ảnh người mượn khi bàn giao (Handover)', () => {
  it('tự động chuyển đổi ảnh từ phiếu mượn sang danh sách ảnh bàn giao kế thừa', () => {
    const borrowerPhotos = [
      'https://storage.vcb.vn/mems/sample-macro-lens.jpg',
      'https://storage.vcb.vn/mems/sample-macro-lens-back.jpg',
    ];

    const inherited: PhotoItem[] = borrowerPhotos.map((src, idx) => ({
      previewUrl: src,
      name: `Ảnh từ người mượn #${idx + 1}`,
      isInherited: true,
    }));

    expect(inherited).toHaveLength(2);
    expect(inherited[0].isInherited).toBe(true);
    expect(inherited[0].name).toBe('Ảnh từ người mượn #1');
    expect(inherited[1].previewUrl).toBe('https://storage.vcb.vn/mems/sample-macro-lens-back.jpg');
  });

  it('handoverReadiness cho phép bàn giao khi đã có ảnh kế thừa từ người mượn', () => {
    const inheritedCount = 2; // Kế thừa từ borrowerPhotos
    const devices = [
      {
        code: 'LENS-004',
        photoCount: inheritedCount,
        accessories: [true, true],
      },
    ];

    const readiness = handoverReadiness(devices, true);
    expect(readiness.canHandover).toBe(true);
    expect(readiness.totalPhotoCount).toBe(2);
    expect(readiness.unitsMissingPhoto).toHaveLength(0);
  });

  it('chặn bàn giao khi phiếu không có ảnh và kho chưa chọn ảnh nào', () => {
    const devices = [
      {
        code: 'LENS-004',
        photoCount: 0,
        accessories: [true, true],
      },
    ];

    const readiness = handoverReadiness(devices, true);
    expect(readiness.canHandover).toBe(false);
    expect(readiness.unitsMissingPhoto).toEqual(['LENS-004']);
  });
});
