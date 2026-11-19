import {
  computeQuickFilterCounts,
  filterRequestsByQuickFilter,
  isRequestExpiringSoon,
  isRequestOverdue,
  QUICK_FILTER_OPTIONS,
} from '../quick-filters';
import type { BorrowRequest } from '../request-api';

describe('quick-filters — Bộ lọc nhanh 1 chạm trên màn lịch sử mượn', () => {
  const fixedNow = new Date('2026-10-19T14:00:00.000Z');

  const sampleRequests = [
    // 1. Bình thường, còn hạn lâu
    {
      id: 'req-1',
      request_code: 'REQ-001',
      owner_id: 'u-1',
      status: 'ON_LOAN',
      to_time: '2026-10-19T20:00:00.000Z', // 6 tiếng nữa
      project: 'Quay Talkshow',
      place: 'Studio 1',
      purpose: 'WORK',
      from_time: '2026-10-19T08:00:00.000Z',
    },
    // 2. Có sự cố
    {
      id: 'req-2',
      request_code: 'REQ-002',
      owner_id: 'u-2',
      status: 'ON_LOAN',
      to_time: '2026-10-19T22:00:00.000Z',
      project: 'Quay MV',
      place: 'Bãi đá',
      purpose: 'WORK',
      from_time: '2026-10-19T08:00:00.000Z',
      incidents: [
        {
          id: 'inc-1',
          asset_id: 'asset-1',
          kind: 'CONDITION_WORSENED',
          description: 'Rơi từ chân máy, vỡ kính lọc',
          status: 'OPEN',
          created_at: '2026-10-19T10:00:00.000Z',
          reported_by: 'u-2',
          asset: { id: 'asset-1', asset_code: 'LENS-001', serial_number: null },
          photos: [],
        },
      ],
    },
    // 3. Đang chờ duyệt gia hạn
    {
      id: 'req-3',
      request_code: 'REQ-003',
      owner_id: 'u-3',
      status: 'ON_LOAN',
      to_time: '2026-10-19T18:00:00.000Z',
      project: 'Quay sự kiện',
      place: 'Hồ Tây',
      purpose: 'WORK',
      from_time: '2026-10-19T08:00:00.000Z',
      extension: {
        id: 'ext-1',
        requested_to_time: '2026-10-19T22:00:00.000Z',
        reason: 'Thêm cảnh đêm',
        status: 'PENDING',
        requested_by: 'u-3',
        requested_at: '2026-10-19T12:00:00.000Z',
        decided_by: null,
        decided_at: null,
        rejection_reason: null,
      },
    },
    // 4. Quá hạn (to_time < fixedNow)
    {
      id: 'req-4',
      request_code: 'REQ-004',
      owner_id: 'u-4',
      status: 'ON_LOAN',
      to_time: '2026-10-19T12:00:00.000Z', // Trễ 2 tiếng
      project: 'Quay tin tức',
      place: 'Phố đi bộ',
      purpose: 'WORK',
      from_time: '2026-10-19T08:00:00.000Z',
    },
    // 5. Sắp hết hạn trong 1.5 giờ (15:30 so với 14:00)
    {
      id: 'req-5',
      request_code: 'REQ-005',
      owner_id: 'u-5',
      status: 'PARTIALLY_RETURNED',
      to_time: '2026-10-19T15:30:00.000Z', // 1.5 tiếng nữa
      project: 'Quay quảng cáo',
      place: 'Studio 2',
      purpose: 'WORK',
      from_time: '2026-10-19T08:00:00.000Z',
    },
    // 6. Đã hoàn trả (CLOSED) -> Dù to_time quá hạn cũng không tính là OVERDUE
    {
      id: 'req-6',
      request_code: 'REQ-006',
      owner_id: 'u-6',
      status: 'CLOSED',
      to_time: '2026-10-19T10:00:00.000Z',
      project: 'Quay phỏng vấn',
      place: 'Văn phòng',
      purpose: 'WORK',
      from_time: '2026-10-19T08:00:00.000Z',
    },
  ] as unknown as BorrowRequest[];

  describe('isRequestOverdue', () => {
    it('nhận diện đúng phiếu quá hạn khi đang ở trạng thái mượn (ON_LOAN, PARTIALLY_RETURNED)', () => {
      expect(isRequestOverdue('2026-10-19T13:59:00.000Z', 'ON_LOAN', fixedNow)).toBe(true);
      expect(isRequestOverdue('2026-10-19T13:59:00.000Z', 'PARTIALLY_RETURNED', fixedNow)).toBe(true);
      expect(isRequestOverdue('2026-10-19T14:01:00.000Z', 'ON_LOAN', fixedNow)).toBe(false);
    });

    it('không tính quá hạn cho phiếu đã đóng hoặc chưa bàn giao (CLOSED, PENDING_APPROVAL)', () => {
      expect(isRequestOverdue('2026-10-19T10:00:00.000Z', 'CLOSED', fixedNow)).toBe(false);
      expect(isRequestOverdue('2026-10-19T10:00:00.000Z', 'PENDING_APPROVAL', fixedNow)).toBe(false);
    });
  });

  describe('isRequestExpiringSoon', () => {
    it('nhận diện đúng phiếu sắp hết hạn trong khoảng 2 giờ tới', () => {
      // 1.5 tiếng tới
      expect(isRequestExpiringSoon('2026-10-19T15:30:00.000Z', 'ON_LOAN', fixedNow)).toBe(true);
      // Đúng 2 tiếng tới
      expect(isRequestExpiringSoon('2026-10-19T16:00:00.000Z', 'ON_LOAN', fixedNow)).toBe(true);
      // 2 tiếng 1 phút tới -> Không tính là sắp hết hạn
      expect(isRequestExpiringSoon('2026-10-19T16:01:00.000Z', 'ON_LOAN', fixedNow)).toBe(false);
      // Đã quá hạn -> Không tính vào sắp hết hạn
      expect(isRequestExpiringSoon('2026-10-19T13:59:00.000Z', 'ON_LOAN', fixedNow)).toBe(false);
    });
  });

  describe('computeQuickFilterCounts', () => {
    it('tính toán chính xác số lượng badge cho từng nhóm', () => {
      const counts = computeQuickFilterCounts(sampleRequests, fixedNow);

      expect(counts.all).toBe(6);
      expect(counts.hasIncident).toBe(1); // REQ-002
      expect(counts.pendingExtension).toBe(1); // REQ-003
      expect(counts.overdue).toBe(1); // REQ-004
      expect(counts.expiringSoon).toBe(1); // REQ-005
    });
  });

  describe('filterRequestsByQuickFilter', () => {
    it('lọc ALL trả về toàn bộ danh sách', () => {
      const res = filterRequestsByQuickFilter(sampleRequests, 'ALL', fixedNow);
      expect(res.length).toBe(6);
    });

    it('lọc HAS_INCIDENT chỉ trả về phiếu có sự cố', () => {
      const res = filterRequestsByQuickFilter(sampleRequests, 'HAS_INCIDENT', fixedNow);
      expect(res.length).toBe(1);
      expect(res[0].request_code).toBe('REQ-002');
    });

    it('lọc PENDING_EXTENSION chỉ trả về phiếu có xin gia hạn chờ duyệt', () => {
      const res = filterRequestsByQuickFilter(sampleRequests, 'PENDING_EXTENSION', fixedNow);
      expect(res.length).toBe(1);
      expect(res[0].request_code).toBe('REQ-003');
    });

    it('lọc OVERDUE chỉ trả về phiếu quá hạn', () => {
      const res = filterRequestsByQuickFilter(sampleRequests, 'OVERDUE', fixedNow);
      expect(res.length).toBe(1);
      expect(res[0].request_code).toBe('REQ-004');
    });

    it('lọc EXPIRING_SOON chỉ trả về phiếu sắp hết hạn', () => {
      const res = filterRequestsByQuickFilter(sampleRequests, 'EXPIRING_SOON', fixedNow);
      expect(res.length).toBe(1);
      expect(res[0].request_code).toBe('REQ-005');
    });
  });

  describe('QUICK_FILTER_OPTIONS', () => {
    it('chứa đủ 5 tùy chọn lọc nhanh với icon và label tiếng Việt', () => {
      expect(QUICK_FILTER_OPTIONS.length).toBe(5);
      const keys = QUICK_FILTER_OPTIONS.map((o) => o.key);
      expect(keys).toEqual(['ALL', 'HAS_INCIDENT', 'PENDING_EXTENSION', 'OVERDUE', 'EXPIRING_SOON']);
    });
  });
});
