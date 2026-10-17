export type DetectedPlatform =
  | 'tiktok'
  | 'douyin'
  | 'instagram'
  | 'youtube'
  | 'xiaohongshu'
  | 'kuaishou'
  | 'bilibili'
  | 'facebook'
  | 'threads'
  | null;

// Nhận diện cả domain đầy đủ lẫn domain rút gọn (link copy từ app điện thoại).
// Link rút gọn được BE tự follow redirect để lấy URL thật (resolve-short-link.util.ts).
export function detectPlatform(url: string): DetectedPlatform {
  const u = url.toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok'; // gồm cả vt./vm.tiktok.com
  if (u.includes('douyin.com')) return 'douyin'; // gồm cả v.douyin.com
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) return 'xiaohongshu';
  if (u.includes('kuaishou.com')) return 'kuaishou'; // gồm cả v.kuaishou.com
  if (u.includes('bilibili.com') || u.includes('b23.tv')) return 'bilibili';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('threads.net') || u.includes('threads.com')) return 'threads'; // threads.net đã chuyển sang threads.com
  return null;
}
