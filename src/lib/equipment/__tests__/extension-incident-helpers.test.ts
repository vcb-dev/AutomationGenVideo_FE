import {
  validateExtensionTime,
  formatExtensionDuration,
  categorizeAlerts,
  getSeverityBadge,
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
            overdue_hours: 5,
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
            remaining_hours: 1,
          } as never,
        ],
      };
      const res = categorizeAlerts(alerts);
      expect(res.hasCriticalAlerts).toBe(false);
      expect(res.totalAlerts).toBe(1);
      expect(res.summaryText).toContain('1 phiếu mượn sắp đến hạn');
    });
  });

  describe('getSeverityBadge', () => {
    it('ánh xạ đúng nhãn và tông màu', () => {
      expect(getSeverityBadge('LOW')).toEqual({
        label: 'Thấp (Trầy xước/bụi)',
        tone: 'ok',
      });
      expect(getSeverityBadge('MEDIUM')).toEqual({
        label: 'Vừa (Chập chờn/lỗi nhẹ)',
        tone: 'maint',
      });
      expect(getSeverityBadge('HIGH')).toEqual({
        label: 'Nặng (Rơi vỡ/hư hỏng)',
        tone: 'bad',
      });
      expect(getSeverityBadge('CRITICAL')).toEqual({
        label: 'Khẩn cấp (Cháy nổ/mất máy)',
        tone: 'bad',
      });
    });
  });

  describe('isExtensionPending', () => {
    it('trả về true khi có extension PENDING', () => {
      const req: Partial<BorrowRequest> = {
        extension: {
          status: 'PENDING',
          requested_to_time: '2026-10-20T10:00:00Z',
          reason: 'Lý do',
          requested_at: '2026-10-19T10:00:00Z',
          requested_by_id: 'u1',
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
