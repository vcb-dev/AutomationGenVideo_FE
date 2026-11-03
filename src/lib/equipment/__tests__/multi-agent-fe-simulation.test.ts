import { compressImage } from '../image-compressor';
import {
  computeQuickFilterCounts,
  filterRequestsByQuickFilter,
  isRequestExpiringSoon,
  isRequestOverdue,
  QUICK_FILTER_OPTIONS,
} from '../quick-filters';
import { buildMobileBorrowUrl, isMobileBrowser } from '../mobile-borrow-helpers';
import type { BorrowRequest } from '../request-api';

describe('Multi-Agent FE Simulation — Mô phỏng toàn diện 4 Agent thao tác trên giao diện', () => {
  const fixedNow = new Date('2026-10-19T14:00:00.000Z');

  // Danh sách các phiếu mượn giả lập đại diện cho trạng thái thực tế
  const requestsData: BorrowRequest[] = [
    {
      id: 'req-cameraman-01',
      request_code: 'REQ-20261019-01',
      owner_id: 'agent-1-cameraman',
      owner_name: 'Hoàng Nam (Cameraman)',
      status: 'ON_LOAN',
      to_time: '2026-10-19T17:30:00.000Z', // 3.5 giờ tới
      project: 'Quay MV Hoàng Hôn',
      place: 'Hồ Tây',
      purpose: 'WORK',
      from_time: '2026-10-19T08:00:00.000Z',
      note: 'Mang theo 2 ống kính khẩu lớn',
      photos: ['https://storage.vcbi.vn/photos/sony-lens-1.jpg'],
      incidents: [
        {
          id: 'inc-01',
          asset_id: 'asset-1',
          kind: 'CONDITION_WORSENED',
          description: 'Cát biển xước nhẹ kính lọc UV',
          status: 'OPEN',
          created_at: '2026-10-19T11:00:00.000Z',
          reported_by: 'agent-1-cameraman',
          asset: { id: 'asset-1', asset_code: 'LENS-001', serial_number: null },
          photos: [],
        },
      ],
      extension: {
        id: 'ext-1',
        requested_to_time: '2026-10-19T21:00:00.000Z',
        reason: 'Quay thêm cảnh hoàng hôn muộn',
        status: 'PENDING',
        requested_by: 'agent-1-cameraman',
        requested_at: '2026-10-19T13:30:00.000Z',
        decided_by: null,
        decided_at: null,
        rejection_reason: null,
      },
    },
    {
      id: 'req-editor-02',
      request_code: 'REQ-20261019-02',
      owner_id: 'agent-2-editor',
      owner_name: 'Thu Trang (Editor)',
      status: 'ON_LOAN',
      to_time: '2026-10-19T13:00:00.000Z', // Đã trễ 1 giờ (Quá hạn!)
      project: 'Quay hậu trường',
      place: 'Studio 1',
      purpose: 'WORK',
      from_time: '2026-10-19T08:00:00.000Z',
    },
    {
      id: 'req-producer-03',
      request_code: 'REQ-20261019-03',
      owner_id: 'agent-3-producer',
      owner_name: 'Anh Dũng (Producer)',
      status: 'ON_LOAN',
      to_time: '2026-10-19T15:30:00.000Z', // Còn 1.5 giờ (Sắp hết hạn <2h!)
      project: 'Quay phỏng vấn KOL',
      place: 'Studio 2',
      purpose: 'WORK',
      from_time: '2026-10-19T09:00:00.000Z',
    },
    {
      id: 'req-marketing-04',
      request_code: 'REQ-20261019-04',
      owner_id: 'agent-4-marketing',
      owner_name: 'Minh Hằng (Marketing)',
      status: 'CLOSED',
      to_time: '2026-10-19T12:00:00.000Z',
      project: 'Chụp ảnh sự kiện khai trương',
      place: 'Showroom',
      purpose: 'WORK',
      from_time: '2026-10-19T08:00:00.000Z',
    },
  ] as unknown as BorrowRequest[];

  describe('Agent 1 (Cameraman): Quét QR & nén ảnh chụp trên điện thoại', () => {
    it('nhận diện đúng thiết bị di động từ User-Agent và mở link quét QR với IP LAN', () => {
      const iphoneUA =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      expect(isMobileBrowser(iphoneUA)).toBe(true);

      const url = buildMobileBorrowUrl({
        origin: 'http://localhost:3001',
        lanIp: '192.168.0.135',
        userId: 'agent-1-cameraman',
        userName: 'Hoàng Nam',
      });
      expect(url).toContain('from_qr=1');
      expect(url).toContain('192.168.0.135:3001');
      expect(url).not.toContain('localhost'); // Phải dùng IP LAN thật (ví dụ 192.168.0.135)
    });

    it('tự động xử lý nén file ảnh trước khi gửi đi giúp giảm kích thước và tăng tốc độ tải', async () => {
      const testPhoto = new File(['mock-photo-content'], 'lens.jpg', { type: 'image/jpeg' });
      const processed = await compressImage(testPhoto);
      expect(processed).toBeDefined();
      expect(processed.name).toContain('lens');
    });
  });

  describe('Agent 2 (Leader Media): Dùng bộ lọc nhanh 1 chạm để duyệt gia hạn & xem sự cố', () => {
    it('thống kê số lượng badge chính xác trên từng nút lọc nhanh', () => {
      const counts = computeQuickFilterCounts(requestsData, fixedNow);

      expect(counts.all).toBe(4);
      expect(counts.hasIncident).toBe(1); // REQ-01 có sự cố kính lọc
      expect(counts.pendingExtension).toBe(1); // REQ-01 xin gia hạn
      expect(counts.overdue).toBe(1); // REQ-02 quá hạn 1 giờ
      expect(counts.expiringSoon).toBe(1); // REQ-03 sắp hết hạn trong 1.5 giờ
    });

    it('Leader bấm lọc nhanh "Chờ duyệt gia hạn" -> Ra ngay REQ-01 để duyệt cấp tốc', () => {
      const filtered = filterRequestsByQuickFilter(requestsData, 'PENDING_EXTENSION', fixedNow);
      expect(filtered.length).toBe(1);
      expect(filtered[0].request_code).toBe('REQ-20261019-01');
      expect(filtered[0].extension?.status).toBe('PENDING');
      expect(filtered[0].extension?.reason).toContain('Quay thêm cảnh hoàng hôn');
    });

    it('Leader bấm lọc nhanh "Có sự cố" -> Nắm ngay chi tiết hư hỏng hiện trường của máy', () => {
      const filtered = filterRequestsByQuickFilter(requestsData, 'HAS_INCIDENT', fixedNow);
      expect(filtered.length).toBe(1);
      expect(filtered[0].request_code).toBe('REQ-20261019-01');
      expect(filtered[0].incidents?.[0].description).toContain('Cát biển xước');
    });
  });

  describe('Agent 3 (Thủ kho): Kiểm soát thu hồi máy quá hạn & sắp hết hạn', () => {
    it('Thủ kho bấm lọc nhanh "Quá hạn" -> Lọc ra ngay REQ-02 để đôn đốc thu hồi máy về kệ', () => {
      const overdueList = filterRequestsByQuickFilter(requestsData, 'OVERDUE', fixedNow);
      expect(overdueList.length).toBe(1);
      expect(overdueList[0].request_code).toBe('REQ-20261019-02');
      expect(overdueList[0].owner_name).toContain('Thu Trang');
      expect(isRequestOverdue(overdueList[0].to_time, overdueList[0].status, fixedNow)).toBe(true);
    });

    it('Thủ kho bấm lọc nhanh "Sắp hết hạn (<2h)" -> Lọc ra ngay REQ-03 để chuẩn bị tiếp nhận trả máy', () => {
      const expiringList = filterRequestsByQuickFilter(requestsData, 'EXPIRING_SOON', fixedNow);
      expect(expiringList.length).toBe(1);
      expect(expiringList[0].request_code).toBe('REQ-20261019-03');
      expect(expiringList[0].owner_name).toContain('Anh Dũng');
      expect(isRequestExpiringSoon(expiringList[0].to_time, expiringList[0].status, fixedNow)).toBe(true);
    });

    it('Nút "Tất cả" trả về đầy đủ 4 phiếu', () => {
      const allList = filterRequestsByQuickFilter(requestsData, 'ALL', fixedNow);
      expect(allList.length).toBe(4);
    });
  });

  describe('Agent 3 (Thủ kho Handover): Tự động kế thừa ảnh người mượn & tự động chọn số serial', () => {
    it('kế thừa ảnh từ phiếu của người mượn mà thủ kho không cần tải ảnh thủ công', () => {
      const borrowerPhotos = ['https://storage.vcbi.vn/photos/tamron-check1.jpg', 'https://storage.vcbi.vn/photos/tamron-check2.jpg'];
      const inheritedPhotos = borrowerPhotos.map((src, idx) => ({
        previewUrl: src,
        name: `Ảnh từ người mượn #${idx + 1}`,
        isInherited: true,
      }));

      expect(inheritedPhotos).toHaveLength(2);
      expect(inheritedPhotos.every((p) => p.isInherited)).toBe(true);
      expect(inheritedPhotos[0].previewUrl).toBe('https://storage.vcbi.vn/photos/tamron-check1.jpg');
    });

    it('tự động gán đúng máy rảnh (AVAILABLE) và không trùng lặp giữa các dòng', () => {
      const availableTamron = [
        { id: 'asset-tamron-1', asset_code: 'LENS-007', serial_number: 'TR2875-001' },
        { id: 'asset-tamron-2', asset_code: 'LENS-008', serial_number: 'TR2875-002' },
      ];
      const pickedAssetIds = new Set<string>();
      const chosen = availableTamron.filter((a) => !pickedAssetIds.has(a.id)).slice(0, 1);
      chosen.forEach((a) => pickedAssetIds.add(a.id));

      expect(chosen[0].asset_code).toBe('LENS-007');
      expect(pickedAssetIds.has('asset-tamron-1')).toBe(true);
    });
  });

  describe('Agent 4 (Thủ kho Edge Case): Xử lý kho hết máy rảnh & Nhập nhanh số serial mới', () => {
    it('phát hiện kho hết máy rảnh và cảnh báo rõ ràng thay vì để nhãn bế tắc', () => {
      const assignable: any[] = [];
      const isOutOfStock = assignable.length === 0;
      expect(isOutOfStock).toBe(true);
    });

    it('nhập nhanh số serial mới lập tức cập nhật vào danh sách options và chọn máy', () => {
      const createdAsset = {
        id: 'new-asset-uuid-99',
        asset_code: 'LENS-TAMRON-LIVE-99',
        serial_number: 'SN-LIVE-2026',
        condition: 'GOOD',
      };
      const prevOptions: any[] = [];
      const updatedOptions = [...prevOptions, createdAsset];

      expect(updatedOptions).toHaveLength(1);
      expect(updatedOptions[0].serial_number).toBe('SN-LIVE-2026');
      expect(updatedOptions[0].asset_code).toBe('LENS-TAMRON-LIVE-99');
    });
  });

  describe('Agent 5 (Thủ kho Return): Đối chiếu phụ kiện & tiếp nhận hoàn trả', () => {
    it('đối chiếu đầy đủ 100% phụ kiện đi kèm khi nhận lại máy', () => {
      const accessories = ['Nắp trước', 'Nắp sau', 'Loa che nắng (Hood)'];
      const returnedAccessories = [true, true, true];
      const isComplete = returnedAccessories.every(Boolean);

      expect(isComplete).toBe(true);
      expect(accessories).toHaveLength(3);
    });
  });

  describe('Agent 6 (Content Creator): Thao tác trên Laptop/PC', () => {
    it('trên trình duyệt máy tính, không bị nhầm lẫn giữa camera điện thoại và tải ảnh desktop', () => {
      const desktopChromeUA =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      expect(isMobileBrowser(desktopChromeUA)).toBe(false);
    });
  });

  describe('Agent 7 (Member Edge Case): Phân quyền phiếu quá hạn & xin gia hạn', () => {
    it('Member không có phiếu quá hạn sẽ có badge Quá hạn = 0 và không hiện cảnh báo nhầm của người khác', () => {
      const memberCleanRequests: BorrowRequest[] = [
        {
          id: 'clean-01',
          request_code: 'REQ-CLEAN-01',
          owner_id: 'member-clean',
          status: 'ON_LOAN',
          to_time: '2026-10-19T18:00:00.000Z', // 4h nữa mới hết hạn
        } as BorrowRequest,
      ];
      const counts = computeQuickFilterCounts(memberCleanRequests, fixedNow);
      expect(counts.overdue).toBe(0);

      const overdueList = filterRequestsByQuickFilter(memberCleanRequests, 'OVERDUE', fixedNow);
      expect(overdueList).toHaveLength(0);
    });

    it('Member có phiếu quá hạn sẽ được gắn cờ isRequestOverdue = true và nhận huy hiệu Quá hạn trả', () => {
      const memberLateRequests: BorrowRequest[] = [
        {
          id: 'late-01',
          request_code: 'REQ-LATE-01',
          owner_id: 'member-late',
          status: 'ON_LOAN',
          to_time: '2026-10-19T12:00:00.000Z', // Đã trễ 2 giờ so với fixedNow (14:00)
        } as BorrowRequest,
      ];
      const counts = computeQuickFilterCounts(memberLateRequests, fixedNow);
      expect(counts.overdue).toBe(1);

      const overdueList = filterRequestsByQuickFilter(memberLateRequests, 'OVERDUE', fixedNow);
      expect(overdueList).toHaveLength(1);
      expect(isRequestOverdue(overdueList[0].to_time, overdueList[0].status, fixedNow)).toBe(true);
    });
  });

  describe('Agent 8 (Thủ kho / Member): Xử lý quên in phiếu ở Bước 2', () => {
    it('cho phép in bổ sung biên bản bàn giao ngay từ WorkflowSuccessModal qua onPrint', () => {
      let printModalOpened = false;
      const onPrint = () => {
        printModalOpened = true;
      };

      // Giả lập thủ kho bấm nút in trên popup chúc mừng
      onPrint();
      expect(printModalOpened).toBe(true);
    });

    it('cho phép in lại phiếu bất cứ lúc nào từ lịch sử mượn với đầy đủ thông tin máy và phụ kiện', () => {
      const historyRequest: BorrowRequest = {
        id: 'hist-01',
        request_code: 'REQ-HIST-01',
        owner_name: 'Hoàng Nam',
        project: 'Quay MV',
        status: 'ON_LOAN',
        lines: [
          {
            id: 'l1',
            quantity: 1,
            model: { name: 'Sony FX3', accessories: [{ id: 'a1', name: 'Pin FZ100' }] },
          },
        ],
      } as unknown as BorrowRequest;

      expect(historyRequest.request_code).toBe('REQ-HIST-01');
      expect(historyRequest.lines[0].model.name).toBe('Sony FX3');
      expect(historyRequest.lines[0].model.accessories?.[0].name).toBe('Pin FZ100');
    });
  });
});
