import { detectPlatform } from '../detect-channel-platform';
import { normalizeThreadsUsername, parseMultipleUsernames } from '../threads-helpers';

/**
 * Ô "Thêm kênh & gán thẻ phân loại — dán URL bất kỳ nền tảng" ở Khám phá kênh.
 *
 * Threads đã chuyển domain sang threads.com (threads.net redirect sang — kiểm chứng
 * 2026-10-01), nên link copy bây giờ là threads.com: bản cũ báo "Không nhận diện được nền
 * tảng", còn tab Threads/Thêm hàng loạt gửi username "https:" lên BE.
 */
describe('detectPlatform — link người dùng hay dán', () => {
  it.each([
    ['https://www.tiktok.com/@hieu.kimcuong', 'tiktok'],
    ['https://vt.tiktok.com/ZSabc123/', 'tiktok'],
    ['https://www.douyin.com/user/MS4wLjABAAAAxyz', 'douyin'],
    ['https://v.douyin.com/iAbCdEf/', 'douyin'],
    ['https://www.instagram.com/lymor.vn?igsh=MWQ1ZGUxMzBkMA==', 'instagram'],
    ['https://www.youtube.com/@kimcuong', 'youtube'],
    ['https://youtu.be/dQw4w9WaGNo', 'youtube'],
    ['https://www.xiaohongshu.com/user/profile/5b863d08e8cd0300018f8888', 'xiaohongshu'],
    ['http://xhslink.com/m/AbCdEf', 'xiaohongshu'],
    ['https://www.kuaishou.com/profile/3xabcdef12345678', 'kuaishou'],
    ['看看这个作品 https://www.kuaishou.com/f/X-f2k5KJpiXN1SY 复制此链接', 'kuaishou'],
    ['https://m.bilibili.com/space/946974', 'bilibili'],
    ['https://b23.tv/AbCdEf', 'bilibili'],
    ['https://www.facebook.com/p/iFacet-61579965066322/', 'facebook'],
    ['https://fb.watch/abc123/', 'facebook'],
    ['https://www.threads.com/@zuck', 'threads'],
    ['https://www.threads.net/@zuck', 'threads'],
  ])('%s → %s', (url, platform) => {
    expect(detectPlatform(url)).toBe(platform);
  });

  it('link không thuộc nền tảng nào → null', () => {
    expect(detectPlatform('https://example.com/abc')).toBeNull();
  });
});

describe('normalizeThreadsUsername — threads.com và link thiếu https://', () => {
  it.each([
    ['https://www.threads.com/@zuck', 'zuck'],
    ['https://threads.com/@zuck?hl=vi', 'zuck'],
    ['https://www.threads.com/@zuck/post/DAbcdEf', 'zuck'],
    ['threads.com/@lilbieber', 'lilbieber'],
    ['threads.net/@lilbieber', 'lilbieber'],
    ['www.threads.net/@pnj_jewelry', 'pnj_jewelry'],
    ['https://www.threads.net/@tech_insider', 'tech_insider'],
  ])('%s → %s', (input, username) => {
    expect(normalizeThreadsUsername(input)).toBe(username);
  });

  it('thêm hàng loạt trộn threads.com và threads.net, khử trùng', () => {
    expect(
      parseMultipleUsernames('https://www.threads.com/@zuck\nthreads.net/@zuck\n@lilbieber, https://threads.com/@mixigaming'),
    ).toEqual(['zuck', 'lilbieber', 'mixigaming']);
  });
});
