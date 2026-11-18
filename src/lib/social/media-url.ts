const VIDEO_EXT = /\.(mp4|mov|m4v|avi|mkv|webm)(\?|#|$)/i
const STORAGE_FILES_PATH = '/api/storage/files/'

// Link file trên kho R2 (qua route phát file của BE).
export function isStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.trim().replace(/\/+$/, '')
  return url.includes(STORAGE_FILES_PATH) || (!!base && url.startsWith(`${base}/`))
}

// Video máy chủ cắt khung được: Drive cũ hoặc video trên R2.
export function isHostedVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes('drive.google.com') || (isStorageUrl(url) && VIDEO_EXT.test(url))
}
