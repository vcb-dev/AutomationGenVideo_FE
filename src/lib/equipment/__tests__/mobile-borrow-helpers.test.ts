import {
  buildMobileBorrowUrl,
  isMobileBrowser,
  formatRequesterBadge,
  qrRefreshDelayMs,
} from '../mobile-borrow-helpers';

describe('mobile-borrow-helpers', () => {
  describe('buildMobileBorrowUrl', () => {
    it('có mã thì trỏ tới trang vé, không kèm thông tin người dùng', () => {
      const url = buildMobileBorrowUrl({ origin: 'https://vcb.vn', code: 'abc.def' });
      expect(url).toBe('https://vcb.vn/equipment-qr?code=abc.def');
    });

    it('không có mã là link quầy kho, quét xong phải đăng nhập', () => {
      expect(buildMobileBorrowUrl({ origin: 'https://vcb.vn' })).toBe(
        'https://vcb.vn/dashboard/equipment/new-request?from_qr=1',
      );
    });

    it('tự động thay localhost bằng IP LAN khi có cấu hình lanIp', () => {
      const url = buildMobileBorrowUrl({ origin: 'http://localhost:3001', lanIp: '192.168.0.135', code: 'c1' });
      expect(url).toBe('http://192.168.0.135:3001/equipment-qr?code=c1');
    });
  });

  describe('qrRefreshDelayMs', () => {
    const NOW = Date.UTC(2026, 10, 3, 9, 0, 0);

    it('xin mã mới trước khi hết hạn 15 giây', () => {
      expect(qrRefreshDelayMs(new Date(NOW + 120_000).toISOString(), NOW)).toBe(105_000);
    });

    it('mã sắp hết hạn thì vẫn chờ tối thiểu 5 giây', () => {
      expect(qrRefreshDelayMs(new Date(NOW + 10_000).toISOString(), NOW)).toBe(5_000);
    });

    it('hạn không đọc được thì thử lại sau 5 giây', () => {
      expect(qrRefreshDelayMs('không-phải-ngày', NOW)).toBe(5_000);
    });
  });

  describe('isMobileBrowser', () => {
    it('nhận diện đúng iPhone user agent', () => {
      const iphoneUa =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      expect(isMobileBrowser(iphoneUa)).toBe(true);
    });

    it('nhận diện đúng Android user agent', () => {
      const androidUa =
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
      expect(isMobileBrowser(androidUa)).toBe(true);
    });

    it('nhận diện đúng desktop browser user agent', () => {
      const desktopUa =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      expect(isMobileBrowser(desktopUa)).toBe(false);
    });
  });

  describe('formatRequesterBadge', () => {
    it('trả về Chưa đăng nhập nếu không có user', () => {
      expect(formatRequesterBadge(null)).toBe('Chưa đăng nhập');
      expect(formatRequesterBadge({})).toBe('Chưa đăng nhập');
    });

    it('hiển thị đúng họ tên và phòng ban', () => {
      expect(
        formatRequesterBadge({
          name: 'Trần Thị B',
          department: { name: 'Team Media' },
        }),
      ).toBe('Trần Thị B · Team Media');
    });

    it('hiển thị họ tên nếu không có phòng ban', () => {
      expect(
        formatRequesterBadge({
          name: 'Lê Văn C',
        }),
      ).toBe('Lê Văn C');
    });
  });
});
