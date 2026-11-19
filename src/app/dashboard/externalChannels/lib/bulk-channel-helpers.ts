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

export interface ParsedBulkChannelUrl {
  id: string;
  url: string;
  platform: NonNullable<DetectedPlatform>;
}

export const PLATFORM_LABEL: Record<string, { label: string; badgeClass: string }> = {
  tiktok: { label: 'TikTok', badgeClass: 'bg-black text-cyan-400 border border-cyan-500/30' },
  douyin: { label: 'Douyin', badgeClass: 'bg-black text-rose-400 border border-rose-500/30' },
  instagram: { label: 'Instagram', badgeClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' },
  youtube: { label: 'YouTube', badgeClass: 'bg-red-600 text-white' },
  xiaohongshu: { label: 'Xiaohongshu', badgeClass: 'bg-red-500 text-white' },
  kuaishou: { label: 'Kuaishou', badgeClass: 'bg-orange-500 text-white' },
  bilibili: { label: 'Bilibili', badgeClass: 'bg-sky-500 text-white' },
  facebook: { label: 'Facebook', badgeClass: 'bg-blue-600 text-white' },
  threads: { label: 'Threads', badgeClass: 'bg-black text-white border border-slate-700' },
};

/**
 * Nhận diện nền tảng từ URL hoặc tên miền.
 * Hỗ trợ cả domain quốc tế (rednote.com) và các domain rút gọn (xhslink, fb.watch, youtu.be, b23.tv...).
 */
export function detectPlatform(rawUrl: string): DetectedPlatform {
  const u = (rawUrl || '').toLowerCase().trim();
  if (!u) return null;

  if (u.includes('tiktok.com')) return 'tiktok'; // vt.tiktok.com, vm.tiktok.com
  if (u.includes('douyin.com') || u.includes('iesdouyin.com')) return 'douyin'; // v.douyin.com
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com') || u.includes('rednote.com')) return 'xiaohongshu';
  if (u.includes('kuaishou.com')) return 'kuaishou'; // v.kuaishou.com
  if (u.includes('bilibili.com') || u.includes('b23.tv')) return 'bilibili';
  if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com')) return 'facebook';
  if (u.includes('threads.net') || u.includes('threads.com')) return 'threads';

  return null;
}

/**
 * Làm sạch token URL: cắt bỏ dấu ngoặc, dấu câu thừa ở đầu/đuôi.
 */
export function cleanPastedUrl(token: string): string {
  let s = (token || '').trim();
  let prev = '';
  // Lặp bóc sạch cả ngoặc lẫn dấu câu dính ở đầu hoặc đuôi (vd: "(http://abc).")
  while (s && s !== prev) {
    prev = s;
    s = s.replace(/^[(\[<"']+|[)\]>"']+$/g, '');
    s = s.replace(/[.,;:!]+$/, '');
    s = s.trim();
  }

  // Nếu người dùng gõ không có protocol nhưng có domain mạng xã hội hợp lệ
  if (s && !/^https?:\/\//i.test(s) && detectPlatform(s)) {
    s = `https://${s}`;
  }

  return s;
}

/**
 * Phân tích văn bản dán hàng loạt để trích xuất danh sách link hợp lệ và không hợp lệ.
 * Tự động lọc trùng lặp và đếm số lượng theo từng nền tảng.
 */
export function parseBulkChannelUrls(rawText: string): {
  valid: ParsedBulkChannelUrl[];
  invalid: string[];
  duplicatesCount: number;
  platformCounts: Record<string, number>;
} {
  if (!rawText || !rawText.trim()) {
    return { valid: [], invalid: [], duplicatesCount: 0, platformCounts: {} };
  }

  // 1. Tách theo dòng, dấu phẩy hoặc khoảng trắng lớn
  const rawTokens = rawText
    .split(/[\r\n,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const seenUrls = new Set<string>();
  const valid: ParsedBulkChannelUrl[] = [];
  const invalid: string[] = [];
  const platformCounts: Record<string, number> = {};
  let duplicatesCount = 0;

  for (const rawToken of rawTokens) {
    // Nếu trong dòng có chứa URL http(s)://...
    const urlMatches = rawToken.match(/https?:\/\/[^\s"'<>,;()]+/gi);

    const candidates = urlMatches && urlMatches.length > 0 ? urlMatches : [rawToken];

    for (const c of candidates) {
      const cleaned = cleanPastedUrl(c);
      if (!cleaned) continue;

      const platform = detectPlatform(cleaned);

      if (!platform) {
        // Chỉ lưu vào invalid nếu trông như một URL hoặc chuỗi không trống
        if (!invalid.includes(cleaned)) {
          invalid.push(cleaned);
        }
        continue;
      }

      // Chuẩn hoá URL để kiểm tra trùng lặp (bỏ trailing slash)
      const normalizedKey = cleaned.replace(/\/+$/, '').toLowerCase();
      if (seenUrls.has(normalizedKey)) {
        duplicatesCount++;
        continue;
      }

      seenUrls.add(normalizedKey);
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;

      valid.push({
        id: `${platform}-${valid.length}-${Date.now()}`,
        url: cleaned,
        platform,
      });
    }
  }

  return { valid, invalid, duplicatesCount, platformCounts };
}
