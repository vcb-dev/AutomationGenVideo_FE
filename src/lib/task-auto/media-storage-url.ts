export const MEDIA_BASE_ENV = 'NEXT_PUBLIC_MEDIA_BASE_URL'

// Link file trên kho R2 (qua BE): phải trùng đúng host + đường dẫn gốc đã cấu hình.
export function isMediaStorageUrl(target: URL, raw: string | undefined = process.env.NEXT_PUBLIC_MEDIA_BASE_URL): boolean {
  if (!raw?.trim()) throw new Error(`Thiếu ${MEDIA_BASE_ENV} trong env của FE`)
  const base = new URL(raw.trim().replace(/\/+$/, '') + '/')
  return target.host === base.host && target.pathname.startsWith(base.pathname)
}
