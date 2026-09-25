export function normalizeThreadsUsername(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  // Remove URL prefixes
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?threads\.net\//i, '');
  // Remove query params or trailing slash
  cleaned = cleaned.split('?')[0].split('/')[0];
  // Remove leading @
  return cleaned.replace(/^@/, '').trim();
}

export function proxyThreadsImage(url?: string): string {
  if (!url) return '';
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function formatThreadsStat(n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n, 10) || 0 : n;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

export function normalizeTargetPostCount(input: string | number, defaultVal = 50, maxVal = 500): number {
  const parsed = parseInt(String(input), 10);
  if (isNaN(parsed) || parsed <= 0) return defaultVal;
  return Math.min(parsed, maxVal);
}

export function normalizeTargetDays(input: string | number, defaultVal = 7, maxVal = 180): number {
  const parsed = parseInt(String(input), 10);
  if (isNaN(parsed) || parsed <= 0) return defaultVal;
  return Math.min(parsed, maxVal);
}

export function countWords(text?: string): number {
  if (!text) return 0;
  return (text.trim().match(/\S+/g) || []).length;
}

export function isStoryPost(post: { text?: string }, minWords = 50, minChars = 150): boolean {
  const text = (post.text || '').trim();
  if (!text) return false;
  const words = countWords(text);
  return words >= minWords || text.length >= minChars;
}

export type LikeRangeFilter = 'ALL' | 'HIDDEN_GEM' | 'MEDIUM' | 'VIRAL';

export function matchLikeRange(likes: number | string, range: LikeRangeFilter): boolean {
  if (range === 'ALL') return true;
  const num = typeof likes === 'number' ? likes : parseInt(String(likes) || '0', 10);
  if (range === 'HIDDEN_GEM') return num < 50;
  if (range === 'MEDIUM') return num >= 50 && num <= 500;
  if (range === 'VIRAL') return num > 500;
  return true;
}

export function parseMultipleUsernames(input: string): string[] {
  if (!input) return [];
  const rawList = input.split(/[\n,;]+/);
  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of rawList) {
    const cleaned = normalizeThreadsUsername(item);
    if (cleaned && !seen.has(cleaned.toLowerCase())) {
      seen.add(cleaned.toLowerCase());
      result.push(cleaned);
    }
  }
  return result;
}

const VI_REGEX = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;
const VI_COMMON_WORDS = new Set([
  'thì', 'là', 'mà', 'của', 'người', 'không', 'được', 'trong', 'với', 'cho', 'những',
  'dạo', 'thấy', 'bảo', 'có', 'mình', 'bạn', 'anh', 'em', 'chị', 'xem', 'hay', 'lại',
  'làm', 'còn', 'nên', 'cũng', 'quá', 'rất', 'luôn', 'nhiều', 'thế', 'nào', 'gì', 'ơi',
  'nhé', 'nha', 'chứ', 'đâu', 'đây', 'đó', 'này', 'kia', 'ở', 'đang', 'ra', 'vào', 'đi'
]);

export function isVietnamese(post: { text?: string; is_vietnamese?: boolean }): boolean {
  if (post.is_vietnamese !== undefined) return Boolean(post.is_vietnamese);
  const text = (post.text || '').toLowerCase();
  if (VI_REGEX.test(text)) return true;
  const words = text.match(/\b\w+\b/g) || [];
  let count = 0;
  for (const w of words) {
    if (VI_COMMON_WORDS.has(w)) {
      count++;
      if (count >= 2) return true;
    }
  }
  return false;
}
