import { isPlatformModeSupported } from './platform-support';

describe('isPlatformModeSupported', () => {
  it('Instagram không hỗ trợ dạng bài text thuần', () => {
    expect(isPlatformModeSupported('INSTAGRAM', 'text')).toBe(false);
  });

  it('Instagram hỗ trợ image và video_vertical', () => {
    expect(isPlatformModeSupported('INSTAGRAM', 'image')).toBe(true);
    expect(isPlatformModeSupported('INSTAGRAM', 'video_vertical')).toBe(true);
  });

  it('YouTube chỉ hỗ trợ video (không hỗ trợ text/image)', () => {
    expect(isPlatformModeSupported('YOUTUBE', 'text')).toBe(false);
    expect(isPlatformModeSupported('YOUTUBE', 'image')).toBe(false);
    expect(isPlatformModeSupported('YOUTUBE', 'video_horizontal')).toBe(true);
  });

  it('Facebook và Threads hỗ trợ mọi dạng bài', () => {
    for (const mode of ['text', 'image', 'video_vertical', 'video_horizontal'] as const) {
      expect(isPlatformModeSupported('FACEBOOK', mode)).toBe(true);
      expect(isPlatformModeSupported('THREADS', mode)).toBe(true);
    }
  });

  it('không phân biệt hoa/thường platform, và platform lạ mặc định coi là hỗ trợ', () => {
    expect(isPlatformModeSupported('instagram', 'text')).toBe(false);
    expect(isPlatformModeSupported('TIKTOK', 'text')).toBe(true);
  });
});
