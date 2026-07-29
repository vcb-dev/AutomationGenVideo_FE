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
