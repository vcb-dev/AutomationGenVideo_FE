import { isPlatformModeSupported, PLATFORM_SUPPORT, PostMode } from './platform-support';

describe('isPlatformModeSupported', () => {
  it('chỉ còn hai dạng bài: image và video_vertical', () => {
    for (const support of Object.values(PLATFORM_SUPPORT)) {
      expect(Object.keys(support).sort()).toEqual(['image', 'video_vertical']);
    }
  });

  it('Instagram hỗ trợ cả ảnh lẫn Reels', () => {
    expect(isPlatformModeSupported('INSTAGRAM', 'image')).toBe(true);
    expect(isPlatformModeSupported('INSTAGRAM', 'video_vertical')).toBe(true);
  });

  it('YouTube chỉ nhận video dọc, không đăng được ảnh', () => {
    expect(isPlatformModeSupported('YOUTUBE', 'image')).toBe(false);
    expect(isPlatformModeSupported('YOUTUBE', 'video_vertical')).toBe(true);
  });

  it('Facebook và Threads hỗ trợ cả hai dạng còn lại', () => {
    for (const mode of ['image', 'video_vertical'] as const satisfies readonly PostMode[]) {
      expect(isPlatformModeSupported('FACEBOOK', mode)).toBe(true);
      expect(isPlatformModeSupported('THREADS', mode)).toBe(true);
    }
  });

  it('không phân biệt hoa/thường platform, và platform lạ mặc định coi là hỗ trợ', () => {
    expect(isPlatformModeSupported('instagram', 'image')).toBe(true);
    expect(isPlatformModeSupported('TIKTOK', 'video_vertical')).toBe(true);
  });
});
