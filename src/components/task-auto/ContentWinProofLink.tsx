import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLATFORM_LABEL: Record<string, string> = {
  FACEBOOK: 'Facebook', YOUTUBE: 'YouTube', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', THREADS: 'Threads',
}
export const platformLabel = (p?: string | null) =>
  p ? (PLATFORM_LABEL[p.trim().toUpperCase()] ?? p) : 'Link'

type Props = {
  url?: string | null
  views?: string | number | null
  platform?: string | null
  /** true khi link nằm trong 1 phần tử có onClick/kéo-thả (vd card) — chặn nổi bọt sự kiện. */
  stopPropagation?: boolean
  className?: string
}

/**
 * Link bài đăng minh chứng của 1 content-win (link có view cao nhất & vượt ngưỡng, do luồng tự
 * đẩy content-win lên kho tổng ghi lại). Render null khi content không có link minh chứng.
 */
export function ContentWinProofLink({ url, views, platform, stopPropagation, className }: Props) {
  if (!url) return null
  const n = views != null && views !== '' ? Number(views) : null
  const stop = stopPropagation
    ? { onClick: (e: React.MouseEvent) => e.stopPropagation(), onPointerDown: (e: React.PointerEvent) => e.stopPropagation() }
    : {}
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Mở link minh chứng: ${url}`}
      {...stop}
      className={cn('inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 hover:underline', className)}
    >
      <span className="font-medium">{platformLabel(platform)}</span>
      {n != null && Number.isFinite(n) && (
        <span className="text-slate-400">· {n.toLocaleString('vi-VN')} view</span>
      )}
      <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
    </a>
  )
}
