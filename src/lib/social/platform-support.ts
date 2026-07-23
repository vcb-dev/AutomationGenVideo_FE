export type PostMode = 'text' | 'image' | 'video_vertical' | 'video_horizontal';

/** Dạng bài mà mỗi platform hỗ trợ đăng. Instagram không đăng được 'text' thuần,
 *  YouTube không đăng được 'text'/'image'. */
export const PLATFORM_SUPPORT: Record<string, Record<PostMode, boolean>> = {
  FACEBOOK: { text: true, image: true, video_vertical: true, video_horizontal: true },
  THREADS: { text: true, image: true, video_vertical: true, video_horizontal: true },
  INSTAGRAM: { text: false, image: true, video_vertical: true, video_horizontal: false },
  YOUTUBE: { text: false, image: false, video_vertical: true, video_horizontal: true },
};

/** Platform không có trong bảng (chưa khai báo) mặc định coi là hỗ trợ mọi dạng bài. */
export function isPlatformModeSupported(platform: string, postMode: PostMode): boolean {
  return PLATFORM_SUPPORT[(platform || '').toUpperCase()]?.[postMode] ?? true;
}
