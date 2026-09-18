import {
  extractTiktokUsername,
  buildTiktokProfileUrl,
  filterTiktokChannels,
  SapoTiktokChannelItem,
} from '../tiktok-helpers';

describe('Sapo TikTok Helpers', () => {
  describe('extractTiktokUsername', () => {
    it('trích xuất chính xác username từ đường link đầy đủ có @', () => {
      const url = 'https://www.tiktok.com/@huyk.xuongvangbac2';
      expect(extractTiktokUsername(url)).toBe('huyk.xuongvangbac2');
    });

    it('trích xuất chính xác username từ đường link có trailing slash', () => {
      const url = 'https://www.tiktok.com/@huyk_official/';
      expect(extractTiktokUsername(url)).toBe('huyk_official');
    });

    it('loại bỏ ký tự @ ở đầu nếu người dùng truyền chuỗi thô @username', () => {
      expect(extractTiktokUsername('@vienchibao_jewelry')).toBe('vienchibao_jewelry');
    });

    it('giữ nguyên chuỗi nếu đã là username chuẩn', () => {
      expect(extractTiktokUsername('huyk.jewelry')).toBe('huyk.jewelry');
    });

    it('trả về rỗng khi input null hoặc undefined', () => {
      expect(extractTiktokUsername(null)).toBe('');
      expect(extractTiktokUsername(undefined)).toBe('');
      expect(extractTiktokUsername('')).toBe('');
    });
  });

  describe('buildTiktokProfileUrl', () => {
    it('giữ nguyên nếu đã là URL http/https hợp lệ', () => {
      const url = 'https://www.tiktok.com/@huyk.xuongvangbac2';
      expect(buildTiktokProfileUrl(url)).toBe('https://www.tiktok.com/@huyk.xuongvangbac2');
    });

    it('tạo link TikTok chuẩn từ username hoặc @username', () => {
      expect(buildTiktokProfileUrl('@huyk.xuongvangbac2')).toBe('https://www.tiktok.com/@huyk.xuongvangbac2');
      expect(buildTiktokProfileUrl('huyk.xuongvangbac2')).toBe('https://www.tiktok.com/@huyk.xuongvangbac2');
    });

    it('trả về rỗng khi chuỗi rỗng hoặc falsy', () => {
      expect(buildTiktokProfileUrl('')).toBe('');
      expect(buildTiktokProfileUrl(null)).toBe('');
    });
  });

  describe('filterTiktokChannels', () => {
    const mockChannels: SapoTiktokChannelItem[] = [
      {
        id: '1',
        name: 'Huy K Xưởng Vàng Bạc',
        username: 'huyk.xuongvangbac2',
        link_channel: 'https://www.tiktok.com/@huyk.xuongvangbac2',
      },
      {
        id: '2',
        name: 'Viễn Chí Bảo Jewelry',
        username: 'vienchibao.vn',
        link_channel: 'https://www.tiktok.com/@vienchibao.vn',
      },
      {
        id: '3',
        name: 'Trang Sức Bạc Cao Cấp',
        username: 'trangsucbac',
        link_channel: 'https://www.tiktok.com/@trangsucbac',
      },
    ];

    it('trả về toàn bộ danh sách khi query rỗng', () => {
      expect(filterTiktokChannels(mockChannels, '')).toHaveLength(3);
      expect(filterTiktokChannels(mockChannels, '   ')).toHaveLength(3);
    });

    it('lọc chính xác theo tên kênh', () => {
      const results = filterTiktokChannels(mockChannels, 'Viễn Chí');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    it('lọc chính xác theo username', () => {
      const results = filterTiktokChannels(mockChannels, 'xuongvangbac2');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('lọc chính xác theo đường link profile', () => {
      const results = filterTiktokChannels(mockChannels, 'trangsucbac');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('3');
    });
  });
});
