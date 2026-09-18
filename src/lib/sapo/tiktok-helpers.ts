/**
 * Tiện ích hỗ trợ xử lý dữ liệu kênh TikTok khám phá từ Sapo
 */

export interface SapoTiktokChannelItem {
  id: string;
  name: string;
  username: string | null;
  link_channel: string | null;
  order_count?: number;
  is_connected?: boolean;
}

/**
 * Trích xuất username chuẩn từ đường link TikTok hoặc chuỗi username thô
 * Ví dụ: "https://www.tiktok.com/@huyk.xuongvangbac2" -> "huyk.xuongvangbac2"
 *        "@huyk.xuongvangbac2" -> "huyk.xuongvangbac2"
 */
export function extractTiktokUsername(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].replace(/\/$/, '');
  }
  return trimmed.replace(/^@/, '').replace(/\/$/, '');
}

/**
 * Xây dựng đường link hồ sơ TikTok đầy đủ, đảm bảo người dùng có thể nhấp vào để mở trang
 */
export function buildTiktokProfileUrl(usernameOrLink?: string | null): string {
  if (!usernameOrLink) return '';
  const trimmed = usernameOrLink.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cleanUsername = extractTiktokUsername(trimmed);
  return cleanUsername ? `https://www.tiktok.com/@${cleanUsername}` : '';
}

/**
 * Lọc danh sách kênh TikTok theo từ khóa tìm kiếm (tên, username hoặc link)
 */
export function filterTiktokChannels<T extends { name: string; username?: string | null; link_channel?: string | null }>(
  channels: T[],
  query: string,
): T[] {
  if (!query || !query.trim()) return channels;
  const q = query.toLowerCase().trim();
  return channels.filter((c) => {
    const nameMatch = c.name?.toLowerCase().includes(q);
    const usernameMatch = c.username?.toLowerCase().includes(q);
    const linkMatch = c.link_channel?.toLowerCase().includes(q);
    return nameMatch || usernameMatch || linkMatch;
  });
}
