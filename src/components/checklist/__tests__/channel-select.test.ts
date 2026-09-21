import { shouldOpenUpward, safeString } from '../ChannelSelect';

describe('ChannelSelect - Dropdown / Dropup Positioning & Helpers', () => {
  describe('shouldOpenUpward', () => {
    it('lật lên trên (dropup) khi khoảng trống bên dưới nhỏ hơn ngưỡng 340px và phía trên rộng hơn', () => {
      // Ví dụ: dropdown ở gần đáy màn hình
      const spaceBelow = 200; // < 340
      const spaceAbove = 500; // > 200
      expect(shouldOpenUpward(spaceBelow, spaceAbove, 340)).toBe(true);
    });

    it('mở xuống dưới bình thường khi khoảng trống bên dưới đủ rộng (>= 340px)', () => {
      const spaceBelow = 450;
      const spaceAbove = 200;
      expect(shouldOpenUpward(spaceBelow, spaceAbove, 340)).toBe(false);
    });

    it('không lật lên trên nếu phía trên còn hẹp hơn cả phía dưới (ví dụ ở đầu trang)', () => {
      const spaceBelow = 250; // < 340
      const spaceAbove = 100; // < 250
      expect(shouldOpenUpward(spaceBelow, spaceAbove, 340)).toBe(false);
    });

    it('hỗ trợ tuỳ biến ngưỡng threshold linh hoạt', () => {
      expect(shouldOpenUpward(250, 400, 200)).toBe(false); // 250 >= 200
      expect(shouldOpenUpward(180, 400, 200)).toBe(true);  // 180 < 200
    });
  });

  describe('safeString', () => {
    it('trả về chuỗi rỗng khi giá trị là null hoặc undefined', () => {
      expect(safeString(null)).toBe('');
      expect(safeString(undefined)).toBe('');
    });

    it('giữ nguyên giá trị chuỗi hợp lệ', () => {
      expect(safeString('TikTok Channel')).toBe('TikTok Channel');
    });

    it('chuyển đổi số thành chuỗi', () => {
      expect(safeString(12345)).toBe('12345');
    });

    it('trích xuất thuộc tính name từ đối tượng', () => {
      expect(safeString({ name: 'Kênh TikTok Viễn Chí Bảo' })).toBe('Kênh TikTok Viễn Chí Bảo');
    });

    it('trích xuất thuộc tính title hoặc label từ đối tượng', () => {
      expect(safeString({ title: 'Tiêu đề kênh' })).toBe('Tiêu đề kênh');
      expect(safeString({ label: 'Nhãn kênh' })).toBe('Nhãn kênh');
    });

    it('trả về chuỗi rỗng với đối tượng không có các trường hỗ trợ', () => {
      expect(safeString({ otherField: 'test' })).toBe('');
    });
  });
});
