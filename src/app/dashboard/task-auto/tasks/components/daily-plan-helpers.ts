import type { DailyPlanContentSource } from '@/types/task-auto'

export const SOURCE_LABEL: Record<DailyPlanContentSource, string> = {
  editor: 'Kho cá nhân',
  team: 'Kho team',
  global: 'Kho tổng',
}

export function formatViews(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

/** Caption hiển thị giống content sẽ được tạo — BE bỏ hashtag khi tạo content từ video win. */
export function stripHashtags(caption: string | null): string {
  return (caption ?? '').replace(/(^|\s)#[^\s#]+/gu, '$1').replace(/\s+/g, ' ').trim()
}
