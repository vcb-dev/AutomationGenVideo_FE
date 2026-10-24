import {
  buildMobileBorrowUrl,
  isMobileBrowser,
  formatRequesterBadge,
} from '../mobile-borrow-helpers';

describe('mobile-borrow-helpers', () => {
  describe('buildMobileBorrowUrl', () => {
    it('tạo đúng URL production với đầy đủ query params', () => {
      const url = buildMobileBorrowUrl({
        origin: 'https://vcb-dev.example.com',
        userId: 'usr-123',
        userName: 'Nguyễn Văn A',
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get('from_qr')).toBe('1');
      expect(parsed.searchParams.get('requester_id')).toBe('usr-123');
      expect(parsed.searchParams.get('requester_name')).toBe('Nguyễn Văn A');
    });

    it('tự động thay localhost bằng IP LAN khi có cấu hình lanIp', () => {
      const url = buildMobileBorrowUrl({
        origin: 'http://localhost:3001',
        lanIp: '192.168.0.135',
        userId: 'usr-456',
      });

      expect(url).toContain('http://192.168.0.135:3001/dashboard/equipment/new-request');
      expect(url).not.toContain('localhost');
      expect(url).toContain('from_qr=1');
    });

    it('hoạt động chuẩn khi không truyền user info', () => {
      const url = buildMobileBorrowUrl({
        origin: 'https://vcb.vn',
      });
      expect(url).toBe('https://vcb.vn/dashboard/equipment/new-request?from_qr=1');
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
