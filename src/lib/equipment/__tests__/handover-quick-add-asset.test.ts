import { handoverReadiness } from '../handover-readiness';

describe('Kiểm thử xử lý thiết bị chưa có máy và nhập nhanh máy khi bàn giao (Handover)', () => {
  it('chặn bàn giao khi có thiết bị chưa có máy / số serial (assetId rỗng)', () => {
    const units = [
      {
        assetId: '',
        code: 'Chưa có máy',
        photoCount: 1,
        accessories: [true],
      },
    ];

    const confirmedByReceiver =
      true && 'Nguyễn Văn A'.trim() !== '' && units.every((u) => Boolean(u.assetId));

    const readiness = handoverReadiness(
      units.map((u) => ({
        code: u.code,
        photoCount: u.photoCount,
        accessories: u.accessories,
      })),
      confirmedByReceiver,
    );

    // confirmedByReceiver phải là false vì assetId rỗng
    expect(confirmedByReceiver).toBe(false);
    expect(readiness.canHandover).toBe(false);
  });

  it('mở khoá bàn giao ngay khi máy đã được chọn hoặc nhập nhanh số serial thành công', () => {
    const units = [
      {
        assetId: 'asset-uuid-123',
        code: 'LENS-009',
        serialNumber: 'MC90-001',
        photoCount: 1,
        accessories: [true],
      },
    ];

    const confirmedByReceiver =
      true && 'Nguyễn Văn A'.trim() !== '' && units.every((u) => Boolean(u.assetId));

    const readiness = handoverReadiness(
      units.map((u) => ({
        code: u.code,
        photoCount: u.photoCount,
        accessories: u.accessories,
      })),
      confirmedByReceiver,
    );

    expect(confirmedByReceiver).toBe(true);
    expect(readiness.canHandover).toBe(true);
    expect(readiness.unitsMissingPhoto).toHaveLength(0);
  });

  it('phát hiện chính xác số lượng thiết bị chưa có số serial để cảnh báo người dùng', () => {
    const units = [
      { assetId: 'asset-1', code: 'LENS-007' },
      { assetId: '', code: 'Chưa có máy' },
      { assetId: '', code: 'Chưa có máy' },
    ];

    const missingCount = units.filter((u) => !u.assetId).length;
    expect(missingCount).toBe(2);
  });
});
