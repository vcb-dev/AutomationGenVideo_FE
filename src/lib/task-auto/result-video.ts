import { driveImageUrl } from '@/lib/utils'
import { isHostedVideoUrl, isStorageUrl } from '@/lib/social/media-url'

export type ResultVideoKind = 'drive' | 'file' | 'none'

// Nhận theo nơi lưu (kho R2 / Drive), không theo đuôi file: link ngoài có đuôi .mp4 vẫn là 'none'.
export function resultVideoKind(url: string | null | undefined): ResultVideoKind {
  if (!url) return 'none'
  if (url.includes('drive.google.com')) return 'drive'
  return isStorageUrl(url) && isHostedVideoUrl(url) ? 'file' : 'none'
}

export function drivePreviewEmbedUrl(url: string): string {
  return url.replace(/\/view(\?.*)?$/, '/preview')
}

// Ảnh bìa BE cắt lúc nộp: `<thư mục video>/thumb/<tên bỏ đuôi>.jpg` (khớp thumbKeyForVideoKey ở BE).
export function storageThumbUrl(videoUrl: string): string {
  const [path] = videoUrl.split(/[?#]/)
  const slash = path.lastIndexOf('/')
  return `${path.slice(0, slash)}/thumb/${path.slice(slash + 1).replace(/\.[^.]+$/, '')}.jpg`
}

export function resultThumbUrl(url: string | null | undefined, size = 400): string | null {
  const kind = resultVideoKind(url)
  if (kind === 'drive') return driveImageUrl(url, size)
  if (kind === 'file') return storageThumbUrl(url!)
  return null
}

// Tải file gốc (video .mov/HEVC Chrome không phát được thì người xem tải về).
export function storageDownloadUrl(url: string, fileName?: string): string {
  const [path] = url.split(/[?#]/)
  return `${path}?download=1${fileName ? `&filename=${encodeURIComponent(fileName)}` : ''}`
}
