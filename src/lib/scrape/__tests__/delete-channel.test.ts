import {
  buildDeleteChannelConfirm,
  buildDeleteChannelPath,
  DELETABLE_CHANNEL_PLATFORMS,
  buildSyncAllChannelsPath,
  buildSyncAllConfirm,
  type DeletableChannelPlatform,
} from '../delete-channel';

/**
 * Nội dung hộp xác nhận trước khi xoá cứng một kênh khám phá bên ngoài.
 *
 * Xoá kênh là thao tác không hoàn tác được: bản ghi kênh và toàn bộ video/lịch sử chỉ số
 * của nó biến mất khỏi DB. Hộp xác nhận là thứ DUY NHẤT đứng giữa một cú bấm nhầm và mất
 * dữ liệu vĩnh viễn, nên nó phải nói đúng cái sắp mất — đặc biệt là số video, vì một kênh
 * đã cào 300 video trông y hệt một kênh rác 0 video trên thẻ hiển thị.
 *
 * Tách khỏi component để test được: repo chưa cài testing-library nên không render React.
 */

describe('buildDeleteChannelConfirm', () => {
  it('nêu rõ tên kênh để người dùng biết mình đang xoá cái nào', () => {
    const message = buildDeleteChannelConfirm({ name: 'HAPAS Official', videoCount: 12 });

    expect(message).toContain('HAPAS Official');
  });

  it('nói rõ số video sẽ mất kèm', () => {
    const message = buildDeleteChannelConfirm({ name: 'Kênh A', videoCount: 300 });

    expect(message).toContain('300');
  });

  it('có dấu phân cách nghìn cho số lớn, tránh đọc nhầm 1234 thành 123', () => {
    const message = buildDeleteChannelConfirm({ name: 'Kênh A', videoCount: 1234 });

    expect(message).toContain('1.234');
  });

  it('kênh chưa có video thì KHÔNG bịa ra câu "mất 0 video"', () => {
    const message = buildDeleteChannelConfirm({ name: 'Kênh rác', videoCount: 0 });

    expect(message).not.toContain('0 video');
    expect(message).toContain('Kênh rác');
  });

  it('luôn cảnh báo không hoàn tác được, kể cả khi kênh rỗng', () => {
    for (const videoCount of [0, 1, 500]) {
      const message = buildDeleteChannelConfirm({ name: 'Kênh A', videoCount });
      expect(message.toLowerCase()).toContain('không hoàn tác');
    }
  });

  it('kênh chưa có tên thì dùng nhãn thay thế, không hiện chuỗi rỗng', () => {
    const message = buildDeleteChannelConfirm({ name: '', videoCount: 5 });

    expect(message).toContain('kênh này');
  });
});

/**
 * Đường dẫn API xoá của 8 nền tảng gần giống nhau nhưng Facebook lệch hẳn: nó không có
 * đoạn "profiles" và dùng prefix "fanpages". Gõ tay ở 8 chỗ trong UI là cách chắc chắn để
 * một nền tảng nào đó im lặng gọi nhầm route rồi ăn 404.
 */
describe('buildDeleteChannelPath', () => {
  it('Facebook dùng prefix fanpages, không có đoạn profiles', () => {
    expect(buildDeleteChannelPath('facebook', 7)).toBe('/scraper/fanpages/7');
  });

  it.each([
    ['tiktok', '/scraper/tiktok/profiles/9'],
    ['instagram', '/scraper/instagram/profiles/9'],
    ['youtube', '/scraper/youtube/profiles/9'],
    ['douyin', '/scraper/douyin/profiles/9'],
    ['xiaohongshu', '/scraper/xiaohongshu/profiles/9'],
    ['kuaishou', '/scraper/kuaishou/profiles/9'],
    ['bilibili', '/scraper/bilibili/profiles/9'],
  ])('%s trỏ đúng đường dẫn', (platform, expected) => {
    expect(buildDeleteChannelPath(platform as DeletableChannelPlatform, 9)).toBe(expected);
  });

  it('phủ hết 8 nền tảng — thiếu một cái là quên nối nút xoá cho nó', () => {
    expect(DELETABLE_CHANNEL_PLATFORMS).toHaveLength(8);
  });
});

/**
 * Đường dẫn API "Đồng bộ tất cả" — Facebook lại lệch chuẩn như phần xoá: không có đoạn
 * `profiles`, và dùng prefix `fanpages`. Gõ tay ở 8 trang là cách chắc chắn để một nền
 * tảng nào đó im lặng gọi nhầm route rồi ăn 404.
 */
describe('buildSyncAllChannelsPath', () => {
  it('Facebook dùng prefix fanpages, không có đoạn profiles', () => {
    expect(buildSyncAllChannelsPath('facebook')).toBe('/scraper/fanpages/sync-all');
  });

  it.each([
    ['tiktok', '/scraper/tiktok/profiles/sync-all'],
    ['instagram', '/scraper/instagram/profiles/sync-all'],
    ['youtube', '/scraper/youtube/profiles/sync-all'],
    ['douyin', '/scraper/douyin/profiles/sync-all'],
    ['xiaohongshu', '/scraper/xiaohongshu/profiles/sync-all'],
    ['kuaishou', '/scraper/kuaishou/profiles/sync-all'],
    ['bilibili', '/scraper/bilibili/profiles/sync-all'],
  ])('%s trỏ đúng đường dẫn', (platform, expected) => {
    expect(buildSyncAllChannelsPath(platform as DeletableChannelPlatform)).toBe(expected);
  });
});

describe('buildSyncAllConfirm', () => {
  it('nói rõ số kênh sắp cào — đây là thao tác tốn tiền theo lượt gọi API', () => {
    expect(buildSyncAllConfirm(59)).toContain('59');
  });

  it('cảnh báo mất thời gian, tránh người dùng bấm lại vì tưởng treo', () => {
    // Mỗi kênh nghỉ 5 giây giữa các lượt nên 59 kênh mất vài phút. Không báo trước thì
    // người dùng bấm đi bấm lại, và lần nào cũng bị từ chối vì đang chạy dở.
    expect(buildSyncAllConfirm(59).toLowerCase()).toContain('vài phút');
  });

  it('danh sách rỗng thì không mời gọi bấm', () => {
    expect(buildSyncAllConfirm(0)).toBe('');
  });
});
