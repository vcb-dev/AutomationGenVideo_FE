/**
 * Chỉ còn hai dạng bài: ảnh và Reels (video dọc).
 *
 * Trước đây có thêm 'text' (bài chữ thuần) và 'video_horizontal' (video ngang).
 * Bỏ đi vì quy trình đăng hiện tại chỉ dùng ảnh và Reels — giữ lại làm giao diện
 * rối và mở đường cho những dạng bài không ai dùng.
 */
export type PostMode = 'image' | 'video_vertical';

/** Dạng bài mà mỗi platform hỗ trợ đăng. YouTube không đăng được ảnh. */
export const PLATFORM_SUPPORT: Record<string, Record<PostMode, boolean>> = {
  FACEBOOK: { image: true, video_vertical: true },
  THREADS: { image: true, video_vertical: true },
  INSTAGRAM: { image: true, video_vertical: true },
  YOUTUBE: { image: false, video_vertical: true },
};

/** Platform không có trong bảng (chưa khai báo) mặc định coi là hỗ trợ mọi dạng bài. */
export function isPlatformModeSupported(platform: string, postMode: PostMode): boolean {
  return PLATFORM_SUPPORT[(platform || '').toUpperCase()]?.[postMode] ?? true;
}
