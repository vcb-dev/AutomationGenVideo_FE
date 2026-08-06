import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'MANAGER':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'EDITOR':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'CONTENT':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const INVISIBLE_CHARS_RE = /[\u00A0\u200B\u200C\u200D\uFEFF]/g;

/**
 * Chuẩn hoá nội dung copy-paste từ Word/Zalo/Facebook... về format sạch để hiển thị đẹp:
 * - Chuẩn hoá xuống dòng (CRLF/CR → LF), bỏ non-breaking space, zero-width space, BOM
 * - Gộp tab/nhiều space liên tiếp thành 1 space, xoá khoảng trắng đầu/cuối mỗi dòng
 * - Gộp từ 3 dòng trống liên tiếp trở lên thành đúng 1 dòng trống (giữ ngắt đoạn)
 */
export function cleanContentText(raw: string): string {
  if (!raw) return raw;
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE_CHARS_RE, ' ')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Convert bất kỳ Google Drive URL nào sang thumbnail URL để dùng trong <img src>. */
export function driveImageUrl(url: string | null | undefined, sz = 400): string | null {
  if (!url) return null;
  if (!url.includes('drive.google.com')) return url;
  const id = (url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ?? url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/))?.[1];
  if (!id) return url;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${sz}`;
}

/** Convert bất kỳ Google Drive URL nào sang preview URL để nhúng vào <iframe>. */
export function drivePreviewUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.includes('drive.google.com')) return url;
  const id = (url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ?? url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/))?.[1];
  if (!id) return url;
  return `https://drive.google.com/file/d/${id}/preview`;
}

/** Convert bất kỳ Google Drive URL nào sang direct stream URL để dùng trong <audio src>. */
export function driveDirectUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.includes('drive.google.com')) return url;
  const id = (url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ?? url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/))?.[1];
  if (!id) return url;
  return `https://drive.google.com/uc?export=view&id=${id}`;
}
