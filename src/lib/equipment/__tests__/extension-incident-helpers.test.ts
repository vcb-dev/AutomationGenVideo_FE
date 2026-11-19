import {
  validateExtensionTime,
  formatExtensionDuration,
  categorizeAlerts,
  formatMinutes,
  handedOverAssets,
  incidentKindLabel,
  isExtensionPending,
} from '../extension-incident-helpers';
import { BorrowRequest, UpcomingReturnsAlerts } from '../request-api';

describe('extension-incident-helpers', () => {
  describe('validateExtensionTime', () => {
    it('báo lỗi khi không nhập thời gian mới', () => {
      const res = validateExtensionTime('2026-10-19T10:00:00.000Z', '');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/chọn thời gian/);
    });

    it('báo lỗi khi thời gian mới không đúng định dạng', () => {
      const res = validateExtensionTime('2026-10-19T10:00:00.000Z', 'invalid-date');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/không hợp lệ/);
    });

    it('báo lỗi khi thời gian mới trước hoặc bằng thời gian trả hiện tại', () => {
      const res1 = validateExtensionTime(
        '2026-10-19T10:00:00.000Z',
        '2026-10-19T10:00:00.000Z',
      );
      expect(res1.valid).toBe(false);
      expect(res1.error).toMatch(/sau thời gian trả/);

      const res2 = validateExtensionTime(
        '2026-10-19T10:00:00.000Z',
        '2026-10-19T09:00:00.000Z',
      );
      expect(res2.valid).toBe(false);
      expect(res2.error).toMatch(/sau thời gian trả/);
    });

    it('hợp lệ khi thời gian mới sau thời gian hiện tại', () => {
      const res = validateExtensionTime(
        '2026-10-19T10:00:00.000Z',
        '2026-10-19T14:00:00.000Z',
      );
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  describe('formatExtensionDuration', () => {
    it('tính đúng số giờ gia hạn', () => {
      const text = formatExtensionDuration(
        '2026-10-19T10:00:00.000Z',
        '2026-10-19T14:00:00.000Z',
      );
      expect(text).toBe('4 giờ');
    });

    it('tính đúng số ngày gia hạn', () => {
      const text1 = formatExtensionDuration(
        '2026-10-19T10:00:00.000Z',
        '2026-10-21T10:00:00.000Z',
      );
      expect(text1).toBe('2 ngày');

      const text2 = formatExtensionDuration(
        '2026-10-19T10:00:00.000Z',
        '2026-10-20T13:00:00.000Z',
      );
      expect(text2).toBe('1 ngày 3 giờ');
    });

    it('trả về 0 giờ nếu mốc thời gian ngược hoặc bằng nhau', () => {
      const text = formatExtensionDuration(
        '2026-10-19T10:00:00.000Z',
        '2026-10-19T09:00:00.000Z',
      );
      expect(text).toBe('0 giờ');
    });
  });

  describe('categorizeAlerts', () => {
    it('trả về không có cảnh báo nếu danh sách rỗng', () => {
      const res1 = categorizeAlerts(null);
      expect(res1.hasCriticalAlerts).toBe(false);
      expect(res1.totalAlerts).toBe(0);

      const res2 = categorizeAlerts({ expiringSoon: [], overdue: [] });
      expect(res2.hasCriticalAlerts).toBe(false);
      expect(res2.totalAlerts).toBe(0);
    });

    it('phát hiện cảnh báo khẩn cấp khi có phiếu quá hạn', () => {
      const alerts: UpcomingReturnsAlerts = {
        overdue: [
          {
            id: 'req-1',
            request_code: 'REQ-001',
            overdue_minutes: 300,
          } as never,
        ],
        expiringSoon: [],
      };
      const res = categorizeAlerts(alerts);
      expect(res.hasCriticalAlerts).toBe(true);
      expect(res.totalAlerts).toBe(1);
      expect(res.summaryText).toContain('1 phiếu mượn đã quá hạn');
    });

    it('thông báo nhắc nhở khi chỉ có phiếu sắp đến hạn', () => {
      const alerts: UpcomingReturnsAlerts = {
        overdue: [],
        expiringSoon: [
          {
            id: 'req-2',
            request_code: 'REQ-002',
            remaining_minutes: 60,
          } as never,
        ],
      };
      const res = categorizeAlerts(alerts);
      expect(res.hasCriticalAlerts).toBe(false);
      expect(res.totalAlerts).toBe(1);
      expect(res.summaryText).toContain('1 phiếu mượn sắp đến hạn');
    });
  });

  describe('incidentKindLabel', () => {
    it('ánh xạ đúng nhãn tiếng Việt', () => {
      expect(incidentKindLabel('CONDITION_WORSENED')).toBe('Hỏng / tình trạng tệ đi');
      expect(incidentKindLabel('MISSING_ACCESSORY')).toBe('Mất / thiếu phụ kiện');
      expect(incidentKindLabel('OVERDUE')).toBe('Trả trễ hạn');
    });
    it('loại lạ thì trả nguyên mã', () => expect(incidentKindLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW'));
  });

  describe('formatMinutes', () => {
    it('dưới 1 giờ thì ghi phút', () => expect(formatMinutes(45)).toBe('45 phút'));
    it('dưới 1 ngày thì ghi giờ', () => expect(formatMinutes(185)).toBe('3 giờ'));
    it('tròn ngày thì không ghi giờ lẻ', () => expect(formatMinutes(2 * 24 * 60)).toBe('2 ngày'));
    it('ngày và giờ lẻ', () => expect(formatMinutes(52 * 60)).toBe('2 ngày 4 giờ'));
    it('số âm coi là 0', () => expect(formatMinutes(-5)).toBe('0 phút'));
  });

  describe('handedOverAssets', () => {
    it('chỉ lấy dòng giữ chỗ đã ghim máy', () => {
      const request = {
        lines: [
          {
            model: { name: 'Sony A7 IV' },
            reservations: [
              { id: 'r1', asset_id: 'a1', asset: { id: 'a1', asset_code: 'CAM-001' } },
              { id: 'r2', asset_id: null, asset: null },
            ],
          },
        ],
      } as unknown as BorrowRequest;
      expect(handedOverAssets(request)).toEqual([{ id: 'a1', label: 'Sony A7 IV · CAM-001' }]);
    });
    it('chưa có phiếu thì rỗng', () => expect(handedOverAssets(null)).toEqual([]));
  });

  describe('isExtensionPending', () => {
    it('trả về true khi có extension PENDING', () => {
      const req: Partial<BorrowRequest> = {
        extension: {
          id: 'ext-1',
          requested_to_time: '2026-10-20T10:00:00Z',
          reason: 'Lý do',
          status: 'PENDING',
          requested_by: 'u1',
          requested_at: '2026-10-19T10:00:00Z',
          decided_by: null,
          decided_at: null,
          rejection_reason: null,
        },
      };
      expect(isExtensionPending(req as BorrowRequest)).toBe(true);
    });

    it('trả về false khi không có extension hoặc đã APPROVED/REJECTED', () => {
      expect(isExtensionPending(null)).toBe(false);
      expect(isExtensionPending({} as BorrowRequest)).toBe(false);
      expect(
        isExtensionPending({
          extension: { status: 'APPROVED' },
        } as unknown as BorrowRequest),
      ).toBe(false);
    });
  });
});
