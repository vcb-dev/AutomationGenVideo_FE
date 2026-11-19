import {
  detectPlatform,
  cleanPastedUrl,
  parseBulkChannelUrls,
} from '../bulk-channel-helpers';

describe('detectPlatform — nhận diện 9 nền tảng', () => {
  it('nhận diện TikTok', () => {
    expect(detectPlatform('https://www.tiktok.com/@vcb.channel')).toBe('tiktok');
    expect(detectPlatform('https://vt.tiktok.com/ZS2345/')).toBe('tiktok');
  });

  it('nhận diện Douyin', () => {
    expect(detectPlatform('https://www.douyin.com/user/MS4wLj...')).toBe('douyin');
    expect(detectPlatform('https://www.iesdouyin.com/share/user/123')).toBe('douyin');
  });

  it('nhận diện Instagram', () => {
    expect(detectPlatform('https://www.instagram.com/zuck/')).toBe('instagram');
  });

  it('nhận diện YouTube', () => {
    expect(detectPlatform('https://www.youtube.com/@TED')).toBe('youtube');
    expect(detectPlatform('https://youtu.be/channel_123')).toBe('youtube');
  });

  it('nhận diện Xiaohongshu & RedNote', () => {
    expect(detectPlatform('https://www.xiaohongshu.com/user/profile/5b863d08e8cd0300018f8888')).toBe('xiaohongshu');
    expect(detectPlatform('https://www.rednote.com/user/profile/5b863d08e8cd0300018f8888')).toBe('xiaohongshu');
    expect(detectPlatform('http://xhslink.com/a/abcXYZ')).toBe('xiaohongshu');
  });

  it('nhận diện Kuaishou', () => {
    expect(detectPlatform('https://www.kuaishou.com/profile/3xabcdef')).toBe('kuaishou');
  });

  it('nhận diện Bilibili', () => {
    expect(detectPlatform('https://space.bilibili.com/123456')).toBe('bilibili');
    expect(detectPlatform('https://b23.tv/xyz')).toBe('bilibili');
  });

  it('nhận diện Facebook', () => {
    expect(detectPlatform('https://www.facebook.com/tiemvangkimanh')).toBe('facebook');
    expect(detectPlatform('https://fb.com/tiemvangkimanh')).toBe('facebook');
    expect(detectPlatform('https://fb.watch/xyz/')).toBe('facebook');
  });

  it('nhận diện Threads', () => {
    expect(detectPlatform('https://www.threads.net/@zuck')).toBe('threads');
  });

  it('trả về null khi domain không thuộc danh sách', () => {
    expect(detectPlatform('https://google.com')).toBeNull();
    expect(detectPlatform('https://example.com/profile/123')).toBeNull();
    expect(detectPlatform('')).toBeNull();
  });
});

describe('cleanPastedUrl', () => {
  it('bỏ ngoặc bao ngoài và dấu câu cuối', () => {
    expect(cleanPastedUrl('(https://www.facebook.com/page1).')).toBe('https://www.facebook.com/page1');
    expect(cleanPastedUrl('[https://www.tiktok.com/@user1],')).toBe('https://www.tiktok.com/@user1');
    expect(cleanPastedUrl('<https://instagram.com/user2>;')).toBe('https://instagram.com/user2');
  });

  it('tự động thêm https:// nếu thiếu scheme nhưng có domain mạng xã hội', () => {
    expect(cleanPastedUrl('tiktok.com/@abc')).toBe('https://tiktok.com/@abc');
    expect(cleanPastedUrl('facebook.com/fanpage1')).toBe('https://facebook.com/fanpage1');
  });
});

describe('parseBulkChannelUrls — dán nhiều link hỗn hợp', () => {
  it('phân tích danh sách nhiều dòng và gom nhóm nền tảng', () => {
    const raw = `
      https://www.tiktok.com/@user1
      https://www.douyin.com/user/MS4wLjABAAAA...
      https://www.rednote.com/user/profile/5b863d08e8cd0300018f8888
      https://www.facebook.com/tiemvang, https://threads.net/@zuck
      https://unknown-website.com/test
    `;

    const { valid, invalid, duplicatesCount, platformCounts } = parseBulkChannelUrls(raw);

    expect(valid).toHaveLength(5);
    expect(invalid).toEqual(['https://unknown-website.com/test']);
    expect(duplicatesCount).toBe(0);

    expect(platformCounts).toEqual({
      tiktok: 1,
      douyin: 1,
      xiaohongshu: 1,
      facebook: 1,
      threads: 1,
    });
  });

  it('tự động lọc các link trùng lặp', () => {
    const raw = `
      https://www.facebook.com/tiemvang
      https://www.facebook.com/tiemvang/
      https://www.tiktok.com/@user1
      https://www.tiktok.com/@user1
    `;

    const { valid, duplicatesCount, platformCounts } = parseBulkChannelUrls(raw);
    expect(valid).toHaveLength(2);
    expect(duplicatesCount).toBe(2);
    expect(platformCounts.facebook).toBe(1);
    expect(platformCounts.tiktok).toBe(1);
  });

  it('xử lý chuỗi rỗng an toàn', () => {
    const { valid, invalid, duplicatesCount } = parseBulkChannelUrls('');
    expect(valid).toEqual([]);
    expect(invalid).toEqual([]);
    expect(duplicatesCount).toBe(0);
  });
});
